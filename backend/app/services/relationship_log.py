import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.relationship_log import RelationshipLog


def log_relationship_action(
    db: Session,
    *,
    actor_user_id: str,
    target_user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: dict[str, Any] | None = None,
) -> None:
    log = RelationshipLog(
        id=str(uuid.uuid4()),
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
    )
    db.add(log)
