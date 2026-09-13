from datetime import datetime, timezone

from app.core.notifications.base import ProviderNotConfigured
from app.core.notifications.email_sender import SMTPEmailSender
from app.core.notifications.sms_sender import TwilioSMSSender
from app.models.notification import DeliveryStatus, NotificationChannel, NotificationPriority

_sms_sender = TwilioSMSSender()
_email_sender = SMTPEmailSender()


async def create_in_app_notification(
    db,
    user_id,
    title: str,
    body: str,
    priority: NotificationPriority = NotificationPriority.NORMAL,
) -> dict:
    """In-app notifications are fully real — no external dependency,
    so this always succeeds and is marked SENT immediately."""
    doc = {
        "user_id": user_id,
        "channel": NotificationChannel.IN_APP.value,
        "priority": priority.value,
        "title": title,
        "body": body,
        "status": DeliveryStatus.SENT.value,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def attempt_external_notification(
    db,
    user_id,
    channel: NotificationChannel,
    to: str,
    title: str,
    body: str,
    priority: NotificationPriority = NotificationPriority.NORMAL,
) -> dict:
    """Attempts SMS or email. If the provider isn't configured (no
    credentials in the environment), this is recorded as FAILED with
    a clear reason — never silently reported as sent. This is the
    honest behavior required when a provider integration exists but
    credentials aren't available yet."""
    sender = _sms_sender if channel == NotificationChannel.SMS else _email_sender
    status = DeliveryStatus.SENT
    error_note = None
    try:
        await sender.send(to=to, subject=title, body=body)
    except ProviderNotConfigured as e:
        status = DeliveryStatus.FAILED
        error_note = str(e)
    except Exception as e:  # provider-side failure — still don't crash the caller
        status = DeliveryStatus.FAILED
        error_note = f"Delivery failed: {e}"

    doc = {
        "user_id": user_id,
        "channel": channel.value,
        "priority": priority.value,
        "title": title,
        "body": body if not error_note else f"{body}\n\n[delivery note: {error_note}]",
        "status": status.value,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc
