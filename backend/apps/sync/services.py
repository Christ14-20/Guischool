"""
Sync Conflict Resolution Service
Priority: Payments > Attendance > Grades > Messages
"""


def resolve_conflict(
    model_name: str,
    server_version: int,
    local_version: int,
    server_data: dict,
    client_data: dict,
    is_validated_grade: bool = False,
) -> dict:
    """
    Resolves a sync conflict based on model type and version.

    Rules:
    - Attendance (LAST_WRITE_WINS): the most recent version wins regardless of origin
    - Grade (SERVER_WINS if validated, LAST_WRITE_WINS if draft):
      If the grade is validated on server, server version wins.
      If draft, last write wins.
    - Other models: LAST_WRITE_WINS
    """
    if is_validated_grade and model_name == "Grade":
        return {"resolution": "SERVER_WINS", "data": server_data}

    if server_version >= local_version:
        return {"resolution": "SERVER_WINS", "data": server_data}
    else:
        return {"resolution": "CLIENT_WINS", "data": client_data}


PRIORITY_ORDER = {
    "Payment": 0,
    "Invoice": 0,
    "StudentFee": 0,
    "Attendance": 1,
    "Grade": 2,
    "Evaluation": 2,
    "TicketMessage": 3,
}


def get_priority_for_model(model_name: str) -> int:
    return PRIORITY_ORDER.get(model_name, 2)
