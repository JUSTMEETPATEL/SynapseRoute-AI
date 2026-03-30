"""
OR-Tools TSP solver interface.
Adapted from: https://github.com/aws-samples/amazon-sagemaker-amazon-routing-challenge-sol
Original: aro/model/ortools_helper.py
Apache-2.0 License — uses OR-tools (Apache-2.0).
"""

from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import numpy as np


def create_data_model(dmatrix):
    """Stores the data for the TSP problem."""
    data = {}
    data["distance_matrix"] = dmatrix
    data["num_vehicles"] = 1
    data["depot"] = 0
    return data


def extract_solution(manager, routing, solution):
    """Extract ordered node indices from a solved routing model."""
    ret = [0]
    index = routing.Start(0)
    while not routing.IsEnd(index):
        index = solution.Value(routing.NextVar(index))
        ret.append(int(index))
    return ret[:-1]  # exclude the virtual end node


def run_ortools(matrix):
    """
    Solve a TSP instance using OR-Tools.

    Args:
        matrix: NxN distance matrix (numpy array or list of lists).

    Returns:
        List of node indices in optimized visit order.

    Raises:
        RuntimeError: If OR-Tools cannot find a solution.
    """
    data = create_data_model(matrix)

    manager = pywrapcp.RoutingIndexManager(
        len(data["distance_matrix"]), data["num_vehicles"], data["depot"]
    )
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(data["distance_matrix"][from_node][to_node])

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    # Add local search metaheuristic for better solutions
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(2)

    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        return extract_solution(manager, routing, solution)
    else:
        raise RuntimeError("OR-Tools could not find a TSP solution")
