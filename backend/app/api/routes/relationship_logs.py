import csv
import io
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.relationship_log import RelationshipLog
from app.models.user import User

router = APIRouter(prefix="/relationship-logs", tags=["relationship-logs"])


@router.get("/export")
def export_relationship_logs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(RelationshipLog, User)
        .join(User, User.id == RelationshipLog.target_user_id)
        .filter(RelationshipLog.actor_user_id == user.id)
        .order_by(RelationshipLog.created_at.desc())
        .all()
    )

    fieldnames = [
        "timestamp",
        "action",
        "entity_type",
        "entity_id",
        "target_user_id",
        "target_user_email",
        "target_name",
        "target_role",
        "details",
    ]

    def row_iter():
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for log, target_user in rows:
            details = log.details or {}
            writer.writerow(
                {
                    "timestamp": log.created_at.isoformat() if log.created_at else "",
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "target_user_id": log.target_user_id,
                    "target_user_email": target_user.email,
                    "target_name": details.get("target_name", ""),
                    "target_role": details.get("target_role", ""),
                    "details": json.dumps(details, ensure_ascii=False),
                }
            )
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    headers = {
        "Content-Disposition": "attachment; filename=relationship-history.csv"
    }
    return StreamingResponse(row_iter(), media_type="text/csv", headers=headers)
