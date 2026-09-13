from app.models.blood_group import BloodGroup

# Standard transfusion compatibility: which recipient groups each donor
# group can safely give to. This is a fixed, well-established medical
# rule table — configured here by design, never inferred or altered
# by the AI agent (per Phase 7/10 guardrails: AI must not override
# blood compatibility rules).
DONOR_CAN_GIVE_TO: dict[BloodGroup, set[BloodGroup]] = {
    BloodGroup.O_NEG: {
        BloodGroup.O_NEG, BloodGroup.O_POS, BloodGroup.A_NEG, BloodGroup.A_POS,
        BloodGroup.B_NEG, BloodGroup.B_POS, BloodGroup.AB_NEG, BloodGroup.AB_POS,
    },
    BloodGroup.O_POS: {
        BloodGroup.O_POS, BloodGroup.A_POS, BloodGroup.B_POS, BloodGroup.AB_POS,
    },
    BloodGroup.A_NEG: {
        BloodGroup.A_NEG, BloodGroup.A_POS, BloodGroup.AB_NEG, BloodGroup.AB_POS,
    },
    BloodGroup.A_POS: {BloodGroup.A_POS, BloodGroup.AB_POS},
    BloodGroup.B_NEG: {
        BloodGroup.B_NEG, BloodGroup.B_POS, BloodGroup.AB_NEG, BloodGroup.AB_POS,
    },
    BloodGroup.B_POS: {BloodGroup.B_POS, BloodGroup.AB_POS},
    BloodGroup.AB_NEG: {BloodGroup.AB_NEG, BloodGroup.AB_POS},
    BloodGroup.AB_POS: {BloodGroup.AB_POS},
}


def compatible_donor_groups(recipient_group: BloodGroup) -> list[BloodGroup]:
    """Given a recipient's blood group, return every donor group that
    can safely give to them."""
    return [
        donor_group
        for donor_group, can_give_to in DONOR_CAN_GIVE_TO.items()
        if recipient_group in can_give_to
    ]
