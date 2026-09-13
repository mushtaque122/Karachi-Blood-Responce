from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.db.mongodb import db
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _to_out(doc: dict) -> NotificationOut:
    return NotificationOut(
        id=str(doc["_id"]),
        channel=doc["channel"],
        priority=doc["priority"],
        title=doc["title"],
        body=doc["body"],
        status=doc["status"],
        read=doc["read"],
        created_at=doc["created_at"],
    )


@router.get("/me", response_model=list[NotificationOut])
async def list_my_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, le=200),
    current_user: dict = Depends(get_current_user),
):
    query: dict = {"user_id": current_user["_id"]}
    if unread_only:
        query["read"] = False
    cursor = db.notifications.find(query).sort("created_at", -1).limit(limit)
    return [_to_out(doc) async for doc in cursor]


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(notification_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid notification id")

    result = await db.notifications.find_one_and_update(
        {"_id": oid, "user_id": current_user["_id"]},
        {"$set": {"read": True}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _to_out(result)
