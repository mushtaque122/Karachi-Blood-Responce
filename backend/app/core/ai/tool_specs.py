TOOL_SPECS = [
    {
        "name": "get_blood_request",
        "description": "Fetch a blood request's status and details by id. Only the requester or staff can view it.",
        "input_schema": {
            "type": "object",
            "properties": {"request_id": {"type": "string"}},
            "required": ["request_id"],
        },
    },
    {
        "name": "get_compatible_donors",
        "description": "Look up which donor blood groups can safely donate to a given recipient blood group (fixed medical rule table).",
        "input_schema": {
            "type": "object",
            "properties": {"blood_group": {"type": "string", "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}},
            "required": ["blood_group"],
        },
    },
    {
        "name": "get_nearby_donors",
        "description": "Staff only. Find verified, available, eligible donors of a blood group near a coordinate.",
        "input_schema": {
            "type": "object",
            "properties": {
                "blood_group": {"type": "string", "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]},
                "latitude": {"type": "number"},
                "longitude": {"type": "number"},
                "max_distance_km": {"type": "number", "default": 15.0},
            },
            "required": ["blood_group", "latitude", "longitude"],
        },
    },
    {
        "name": "get_blood_bank_inventory",
        "description": "Get available unit counts per blood group at a specific blood bank.",
        "input_schema": {
            "type": "object",
            "properties": {"blood_bank_id": {"type": "string"}},
            "required": ["blood_bank_id"],
        },
    },
    {
        "name": "get_emergency_status",
        "description": "Get a blood request's status plus how many donors have been matched so far.",
        "input_schema": {
            "type": "object",
            "properties": {"request_id": {"type": "string"}},
            "required": ["request_id"],
        },
    },
    {
        "name": "create_draft_blood_request",
        "description": (
            "Create a DRAFT blood request from details the user provided. "
            "This never submits, verifies, or matches the request — the user "
            "must explicitly do that themselves afterward."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "blood_group": {"type": "string", "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]},
                "units_required": {"type": "integer"},
                "hospital_name": {"type": "string"},
                "city": {"type": "string"},
                "contact_phone": {"type": "string"},
                "urgency": {"type": "string", "enum": ["normal", "urgent", "critical"], "default": "normal"},
            },
            "required": ["blood_group", "units_required", "hospital_name", "city", "contact_phone"],
        },
    },
    {
        "name": "search_system_knowledge",
        "description": "Search a small FAQ knowledge base about how the Blood Response System works.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
]
