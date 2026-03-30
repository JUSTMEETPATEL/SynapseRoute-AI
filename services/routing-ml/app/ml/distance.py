"""
Haversine distance matrix builder.
Replaces the file-based distance matrix loading from the original AWS repo.
Computes real-world distances from lat/lng coordinates.
"""

import math
import numpy as np
from typing import List, Tuple

EARTH_RADIUS_M = 6_371_000  # meters


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the haversine distance between two points in meters.
    """
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return EARTH_RADIUS_M * c


def build_distance_matrix(coords: List[Tuple[float, float]]) -> np.ndarray:
    """
    Build an NxN distance matrix from a list of (lat, lng) tuples.
    Returns distances in meters as integers (OR-Tools requires int).

    Args:
        coords: List of (lat, lng) tuples. Index 0 should be the depot.

    Returns:
        numpy ndarray of shape (N, N) with integer distances in meters.
    """
    n = len(coords)
    matrix = np.zeros((n, n), dtype=np.int64)

    for i in range(n):
        for j in range(i + 1, n):
            dist = int(haversine(coords[i][0], coords[i][1], coords[j][0], coords[j][1]))
            matrix[i][j] = dist
            matrix[j][i] = dist

    return matrix


def estimate_travel_time_min(distance_m: float, avg_speed_kmh: float = 25.0) -> float:
    """
    Estimate travel time in minutes given distance in meters.
    Default avg speed 25 km/h for urban last-mile delivery.
    """
    if distance_m <= 0:
        return 0.0
    return (distance_m / 1000.0) / avg_speed_kmh * 60.0


def total_route_distance_km(coords: List[Tuple[float, float]], order: List[int]) -> float:
    """
    Calculate total route distance in km given coordinates and visit order.
    """
    total = 0.0
    for i in range(len(order) - 1):
        a, b = order[i], order[i + 1]
        total += haversine(coords[a][0], coords[a][1], coords[b][0], coords[b][1])
    return total / 1000.0
