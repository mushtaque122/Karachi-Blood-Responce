from datetime import date

# Minimum days required between donations before a donor is eligible again.
# This is a business/medical rule configured by authorized administrators —
# not something any future AI agent is allowed to override or infer.
# In a later phase this moves into an admin-editable settings collection;
# for now it is a single source of truth so eligibility logic stays
# centralized in one place.
MIN_DONATION_INTERVAL_DAYS = 90


def compute_eligibility(last_donation_date: date | None, today: date | None = None) -> bool:
    """Pure function, no AI involvement — deterministic rule only."""
    if last_donation_date is None:
        return True
    today = today or date.today()
    return (today - last_donation_date).days >= MIN_DONATION_INTERVAL_DAYS
