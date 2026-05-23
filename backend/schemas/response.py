from typing import Any


def error_response(message: str, code: str) -> dict[str, Any]:
    return {"success": False, "error": message, "code": code}
