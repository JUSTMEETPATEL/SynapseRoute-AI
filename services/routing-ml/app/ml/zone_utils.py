"""
Zone-based TSP with PPM rollout.
Adapted from: https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol
Original: aro/model/zone_utils.py
Apache-2.0 License.

Hierarchically integrates PPM model with OR-Tools TSP solver:
  Step 1: PPM rollout generates an optimal zone visit sequence
  Step 2: Within each zone, OR-Tools solves a small TSP
  Step 3: Zone-level stop sequences are concatenated
"""

from collections import defaultdict
from typing import List, Optional

import numpy as np

from app.ml.ortools_helper import run_ortools


def sort_zones(
    orig_zone_list: List[str],
    prob_model,
    cluster_weights: List[float] = [0.25, 0.25, 0.25, 0.25],
) -> List[str]:
    """
    Sort zones using PPM rollout to find the most probable zone sequence.

    Args:
        orig_zone_list: Zones in original (unsorted) order.
        prob_model: Trained PPM model.
        cluster_weights: Weights for hierarchical zone matching.

    Returns:
        Sorted zone sequence.
    """
    zone_list = list(dict.fromkeys(orig_zone_list))  # deduplicate, preserve first occurrence
    pred_zone_seq, _ = ppm_rollout(zone_list, prob_model, 1.0, cluster_weights=cluster_weights)
    return pred_zone_seq


def zone_based_tsp(
    matrix: np.ndarray,
    zone_list: List[str],
    prob_model,
    cluster_weights: List[float] = [0.25, 0.25, 0.25, 0.25],
) -> np.ndarray:
    """
    Two-level route optimization:
      1. Sort zones using PPM rollout
      2. Within each zone, solve TSP using OR-Tools

    Args:
        matrix: NxN distance matrix (integers, meters).
        zone_list: Zone ID for each stop (parallel to matrix indices).
        prob_model: Trained PPM model.
        cluster_weights: Weights for hierarchical matching.

    Returns:
        Numpy array of stop indices in optimized visit order.
    """
    zone_sequence = sort_zones(zone_list, prob_model, cluster_weights)

    # Build zone → node index mapping
    z2n_dict = defaultdict(list)
    for idx, zone in enumerate(zone_list):
        z2n_dict[zone].append(idx)

    # Get representative node for each zone (median distance node)
    rep_node_index = []
    for zone in zone_sequence:
        if zone == "stz":
            rep_node_index.append(0)
            continue
        zone_node_idx = z2n_dict[zone]
        node_vals = []
        node_vals_idx = []
        for single_node_idx in zone_node_idx:
            row_m = np.median(matrix[single_node_idx, :])
            col_m = np.median(matrix[:, single_node_idx])
            node_vals.append(np.mean([row_m, col_m]))
            node_vals_idx.append(single_node_idx)
        qidx = np.argsort(node_vals)[len(node_vals) // 2]
        rep_node_index.append(node_vals_idx[qidx])

    # Build tour: depot → zone1 stops → zone2 stops → ... → depot
    tour = [0]
    for idx, zone in enumerate(zone_sequence):
        if zone == "stz":
            continue
        zone_node_idx = list(z2n_dict[zone])  # copy
        if len(zone_node_idx) == 1:
            tour += zone_node_idx
            continue

        # Prepend last visited node for continuity
        zone_node_idx.insert(0, tour[-1])

        # Append representative nodes of remaining zones as anchors
        if idx < len(zone_sequence) - 1:
            extra_rep_nodes = rep_node_index[idx + 1 :]
        else:
            extra_rep_nodes = []
        extra_rep_nodes = list(extra_rep_nodes)
        extra_rep_nodes.append(0)  # add depot to form virtual circle
        zone_node_idx += extra_rep_nodes

        # Map local indices to global indices
        part_whole_dict = {k: v for k, v in enumerate(zone_node_idx)}
        my_matrix = matrix[np.ix_(zone_node_idx, zone_node_idx)]

        try:
            my_list = run_ortools(my_matrix)
        except RuntimeError:
            # Fallback: just use the original order
            tour += list(z2n_dict[zone])
            continue

        added_tour = [part_whole_dict[x] for x in my_list][1:]  # skip first (already in tour)
        extra_set = set(extra_rep_nodes)
        tour += [x for x in added_tour if x not in extra_set]

    return np.array(tour, dtype=np.int32)


def ppm_rollout(
    zone_list: List[str],
    ppm_model,
    no_context_panelty: float,
    explore_budget: int = 1,
    cluster_weights: List[float] = [0.25, 0.25, 0.25, 0.25],
):
    """
    Rollout algorithm: iteratively builds the best zone sequence
    by exploring forward from each position using the PPM model as policy.

    Returns:
        (best_zone_sequence, total_reward)
    """
    orig_sol, orig_reward = ppm_base(
        zone_list, "stz", ppm_model, no_context_panelty, cluster_weights=cluster_weights
    )
    nb_nodes = len(zone_list)
    tm_reward = orig_reward
    part_sol = ["stz"]
    part_sol_tt_reward = []
    nb_explorations = 0
    tmp_good_tours = orig_sol
    zone_set = set(zone_list)

    while len(part_sol) < nb_nodes:
        start_list = list(zone_set - set(part_sol))
        if not start_list:
            break

        ret_list = [
            ppm_base(
                start_list,
                start_zone,
                ppm_model,
                no_context_panelty,
                cluster_weights=cluster_weights,
                opt_cycle=False,
            )
            for start_zone in start_list
        ]
        seq_rewards = [seq_reward for (_, seq_reward) in ret_list]
        max_seq_reward = np.max(seq_rewards)
        best_seq = part_sol + ret_list[np.argmax(seq_rewards)][0]

        if len(part_sol_tt_reward) == 0:
            rollout_reward = (
                ppm_model.query(part_sol, best_seq[0], cluster_weights=cluster_weights)
                + max_seq_reward
            )
        else:
            rollout_reward = np.sum(part_sol_tt_reward) + max_seq_reward

        if rollout_reward > tm_reward:
            tmp_good_tours = best_seq
            part_sol.append(tmp_good_tours[len(part_sol)])
            part_sol_tt_reward.append(
                ppm_model.query(part_sol[:-1], part_sol[-1], cluster_weights=cluster_weights)
            )
            tm_reward = rollout_reward
            nb_explorations = 0
        else:
            if nb_explorations < explore_budget:
                part_sol.append(tmp_good_tours[len(part_sol)])
                nb_explorations += 1
            else:
                part_sol = tmp_good_tours
                break

    return part_sol, tm_reward


def ppm_base(
    zone_list: List[str],
    start_zone: str,
    ppm_model,
    no_context_panelty: float,
    cluster_weights: List[float] = [0.25, 0.25, 0.25, 0.25],
    opt_cycle: bool = True,
):
    """
    Base greedy heuristic — builds a zone sequence by always choosing
    the highest-probability next zone.

    Used as the inner loop of the rollout algorithm.

    Returns:
        (zone_sequence, total_log_probability)
    """
    len_z = len(zone_list)

    if len_z == 1:
        return zone_list, ppm_model.query([], zone_list[0], cluster_weights=cluster_weights)

    if len_z == 2:
        if zone_list[0] != start_zone:
            zone_list = [zone_list[1], zone_list[0]]
        return zone_list, ppm_model.query(
            [zone_list[0]], zone_list[1], cluster_weights=cluster_weights
        )

    if opt_cycle:
        init_scores = []
        init_pairs = []
        for zone_tail in zone_list:
            if zone_tail == start_zone:
                continue
            for zone_head in zone_list:
                if zone_head == start_zone or zone_tail == zone_head:
                    continue
                init_ctx = [zone_tail, start_zone]
                symbol = zone_head
                init_pair = [start_zone, zone_head]
                init_score = ppm_model.query(
                    init_ctx,
                    symbol,
                    no_context_panelty=no_context_panelty,
                    cluster_weights=cluster_weights,
                )
                init_pairs.append(init_pair)
                init_scores.append(init_score)

        if len(init_scores) == 0:
            pred_zone_seq = [start_zone]
            pred_seq_prob = []
        else:
            init_idx = np.argmax(init_scores)
            pred_zone_seq = init_pairs[init_idx]
            pred_seq_prob = [init_scores[init_idx]]
    else:
        pred_zone_seq = [start_zone]
        pred_seq_prob = []

    rem_list = list(set(zone_list) - set(pred_zone_seq))

    for _ in range(len_z - len(pred_zone_seq)):
        if not rem_list:
            break
        rem_scores = [
            ppm_model.query(pred_zone_seq, rem, cluster_weights=cluster_weights) for rem in rem_list
        ]
        cand_idx = np.argmax(rem_scores)
        pred_zone_seq.append(rem_list[cand_idx])
        pred_seq_prob.append(rem_scores[cand_idx])
        del rem_list[cand_idx]

    return pred_zone_seq, np.sum(pred_seq_prob)
