import math

EARTH_RADIUS_KM = 6371.0088

# Naive straight-line ETA assumption for a dense urban area like Karachi.
# This is NOT real routing (no roads, traffic, or turn-by-turn data) —
# a genuine Maps/routing provider integration would replace this.
# Documented as an approximation, not hidden as if it were precise.
ASSUMED_AVG_SPEED_KMPH = 25.0


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points, in kilometers."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def estimate_eta_minutes(distance_km: float) -> int:
    """Naive straight-line ETA — see module docstring. Real ETA needs
    a routing provider (Google/Mapbox Directions API etc.), which is
    not integrated here; this is a placeholder approximation only."""
    hours = distance_km / ASSUMED_AVG_SPEED_KMPH
    return max(1, round(hours * 60))
