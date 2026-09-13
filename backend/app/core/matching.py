from app.models.urgency import Urgency

# Configurable weights — a simple, transparent scoring system per Phase 7.
WEIGHT_SAME_CITY = 3  # fallback only, used when either side lacks coordinates
WEIGHT_EMERGENCY_AVAILABLE = 2
WEIGHT_CRITICAL_URGENCY_BOOST = 1  # applied to emergency-available donors on critical requests

# Distance bands (Phase 8: real geodistance replaces the city-string
# proxy once both donor and request have coordinates on file).
DISTANCE_BANDS_KM = (
    (5.0, 5),
    (15.0, 3),
    (30.0, 1),
)


def _distance_score(distance_km: float) -> int:
    for max_km, points in DISTANCE_BANDS_KM:
        if distance_km <= max_km:
            return points
    return 0


def score_donor_candidate(
    donor: dict,
    request_city: str,
    request_urgency: Urgency,
    distance_km: float | None = None,
) -> int:
    """Pure, deterministic scoring — no AI involvement, matching the
    Phase 7 requirement that matching stays rule-based and auditable.
    Only ever called on donors that already passed compatibility,
    eligibility, availability, and verification checks.

    Uses real distance when available (Phase 8); falls back to an
    exact city-name match otherwise, so donors without coordinates on
    file yet aren't excluded from matching entirely."""
    score = 0
    if distance_km is not None:
        score += _distance_score(distance_km)
    elif donor.get("city", "").strip().lower() == request_city.strip().lower():
        score += WEIGHT_SAME_CITY

    if donor.get("emergency_availability"):
        score += WEIGHT_EMERGENCY_AVAILABLE
        if request_urgency == Urgency.CRITICAL:
            score += WEIGHT_CRITICAL_URGENCY_BOOST
    return score
