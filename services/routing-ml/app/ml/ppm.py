"""
PPM (Prediction by Partial Matching) Markov Model.
Adapted from: https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol
Original: aro/model/ppm.py
Apache-2.0 License.

Learns sequential patterns from historical delivery zone sequences.
Used during inference to generate driver-friendly routes via rollout.
"""

from collections import defaultdict
from typing import List, Optional

import numpy as np

ZERO_KEY = "000"


class PPM:
    """
    PPM - Prediction by Partial Matching.
    An n-order Markov chain for zone sequence prediction.
    """

    def __init__(self, nb_order: int, vocab_size: int = 8704):
        """
        Args:
            nb_order: Maximum context order (e.g., 5 means orders 0-5).
            vocab_size: Estimated vocabulary size for the negative-order fallback.
        """
        self.nb_order = nb_order
        self.tables = []
        for _ in range(nb_order + 1):
            self.tables.append(dict())
        tbl = self.tables[0]
        tbl[ZERO_KEY] = Ctx(ZERO_KEY)
        self.vocab_size = vocab_size
        self.neg_order_prob = np.log(1 / vocab_size)

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}"
            f"(nb_order={self.nb_order}, vocab_size={self.vocab_size})"
        )

    def add_sequence(self, zone_list: List[str]):
        """
        Train on a single zone sequence.
        Appends the first zone at the end to form a cycle.
        """
        zone_list = list(zone_list)  # don't mutate the input
        zone_list += zone_list[:1]  # form a cycle

        for order in range(self.nb_order + 1):
            tbl = self.tables[order]
            if order == 0:
                ctx = tbl[ZERO_KEY]
                for zone in zone_list:
                    ctx.add_entry(zone)
            else:
                for idx in range(len(zone_list) - order):
                    ctx_key = "|".join(zone_list[idx : idx + order])
                    entry = zone_list[idx + order]
                    if ctx_key in tbl:
                        ctx = tbl[ctx_key]
                    else:
                        ctx = Ctx(ctx_key)
                        tbl[ctx_key] = ctx
                    ctx.add_entry(entry)

    def query_zone_sequence(self, zone_list: List[str]) -> float:
        """Check the log-probability of an entire zone sequence."""
        relist = []
        for i in range(len(zone_list) - 1):
            preced_zl = zone_list[: i + 1]
            following_zone = zone_list[i + 1]
            relist.append(self.query(preced_zl, following_zone))
        return float(np.sum(relist))

    def query(
        self,
        preceding_zone_list: List[str],
        following_zone: str,
        no_context_panelty: float = 1.0,
        consider_hierarchy: bool = True,
        cluster_weights: List[float] = [0.25, 0.25, 0.25, 0.25],
    ) -> float:
        """
        Query the probability of following_zone given preceding context.
        With hierarchy, decomposes zone IDs (e.g., C-17.3D) into layers.
        """
        if consider_hierarchy and "-" in following_zone and "." in following_zone:
            # C
            pre_c_seq = [x[0] if len(x) > 0 else x for x in preceding_zone_list]
            fol_c_z = following_zone[0]

            # 17
            pre_sc_seq = [x.split(".")[0].split("-")[-1] for x in preceding_zone_list]
            fol_sc_z = following_zone.split(".")[0].split("-")[-1]

            # 3D
            pre_ssc_seq = [x.split(".")[-1] for x in preceding_zone_list]
            fol_ssc_seq = following_zone.split(".")[-1]

            sc00 = self._query(preceding_zone_list, following_zone, no_context_panelty)
            sc01 = self._query(pre_c_seq, fol_c_z, no_context_panelty)
            sc02 = self._query(pre_sc_seq, fol_sc_z, no_context_panelty)
            sc03 = self._query(pre_ssc_seq, fol_ssc_seq, no_context_panelty)

            cw = cluster_weights
            return sc00 * cw[0] + sc01 * cw[1] + sc02 * cw[2] + sc03 * cw[3]
        else:
            return self._query(preceding_zone_list, following_zone, no_context_panelty)

    def _query(
        self,
        preceding_zone_list: List[str],
        following_zone: str,
        no_context_panelty: float = 1.0,
    ) -> float:
        """Internal query — walks through PPM orders with escape probabilities."""
        lens = len(preceding_zone_list)
        no_ctx_pen = np.log(no_context_panelty) if no_context_panelty > 0 else 0.0

        if lens > self.nb_order:
            preceding_zone_list = preceding_zone_list[lens - self.nb_order :]
            lens = self.nb_order

        penalty_probs = []
        for i in range(lens + 1):
            cur_order = lens - i
            if cur_order > 0:
                ctx_key = "|".join(preceding_zone_list[i:])
            else:
                ctx_key = ZERO_KEY
            tbl = self.tables[cur_order]
            if ctx_key in tbl:
                ctx = tbl[ctx_key]
                if following_zone in ctx.entries:
                    return ctx.pc_prob(following_zone) + np.sum(penalty_probs)
                else:
                    penalty_probs.append(ctx.escape_prob)
            else:
                penalty_probs.append(no_ctx_pen)

        # order -1 fallback
        return float(self.neg_order_prob + np.sum(penalty_probs))

    def to_dict(self) -> dict:
        """Serialize PPM model to a JSON-safe dictionary."""
        serialized_tables = []
        for table in self.tables:
            serialized_table = {}
            for key, ctx in table.items():
                serialized_table[key] = ctx.to_dict()
            serialized_tables.append(serialized_table)

        return {
            "nb_order": self.nb_order,
            "vocab_size": self.vocab_size,
            "tables": serialized_tables,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "PPM":
        """Deserialize PPM model from a dictionary."""
        ppm = cls(data["nb_order"], data["vocab_size"])
        ppm.tables = []
        for serialized_table in data["tables"]:
            table = {}
            for key, ctx_data in serialized_table.items():
                table[key] = Ctx.from_dict(ctx_data)
            ppm.tables.append(table)
        return ppm


class Ctx:
    """Context node — tracks symbol counts and computes PPM probabilities."""

    def __init__(self, key: str):
        self.key = key
        self.n = 0  # total appearances
        self.entries = defaultdict(int)  # symbol -> count
        self._escape_prob = None

    def add_entry(self, entry: str):
        self.entries[entry] += 1
        self.n += 1
        self._escape_prob = None  # invalidate cache

    @property
    def escape_prob(self) -> float:
        if self._escape_prob is None:
            d = len(self.entries)
            self._escape_prob = float(np.log(d / (2 * self.n))) if self.n > 0 else 0.0
        return self._escape_prob

    def pc_prob(self, symbol: str) -> float:
        count = self.entries[symbol]
        return float(np.log((2 * count - 1) / (2 * self.n)))

    @property
    def d(self) -> int:
        return len(self.entries)

    def to_dict(self) -> dict:
        return {"key": self.key, "n": self.n, "entries": dict(self.entries)}

    @classmethod
    def from_dict(cls, data: dict) -> "Ctx":
        ctx = cls(data["key"])
        ctx.n = data["n"]
        for k, v in data["entries"].items():
            ctx.entries[k] = v
        return ctx


def build_ppm_model(
    zone_sequences: List[List[str]],
    nb_orders: int = 5,
    consider_hierarchy: bool = True,
) -> PPM:
    """
    Build a PPM model from a list of zone sequences.

    Adapted from the original build_ppm_model which required a pandas DataFrame.
    This version accepts plain lists for API-friendly use.

    Args:
        zone_sequences: List of zone sequences, e.g. [["stz", "zone-A", "zone-B"], ...]
        nb_orders: PPM order (default 5).
        consider_hierarchy: Whether to also train on zone hierarchy decompositions.

    Returns:
        Trained PPM model.
    """
    ppm = PPM(nb_orders, vocab_size=max(256, len(set(z for seq in zone_sequences for z in seq)) * 4))

    for zone_seq in zone_sequences:
        # Deduplicate consecutive zones (keep as set-like sequence)
        deduped = []
        last = None
        for z in zone_seq:
            if z != last:
                deduped.append(z)
                last = z

        ppm.add_sequence(deduped)

        if consider_hierarchy:
            # Train on first-letter sequences
            c_seq = [x[0] if len(x) > 0 else x for x in deduped]
            ppm.add_sequence(c_seq)

            # Train on sub-cluster sequences
            if any("-" in z and "." in z for z in deduped):
                sc_seq = [x.split(".")[0].split("-")[-1] for x in deduped]
                ppm.add_sequence(sc_seq)

                ssc_seq = [x.split(".")[-1] for x in deduped]
                ppm.add_sequence(ssc_seq)

    return ppm
