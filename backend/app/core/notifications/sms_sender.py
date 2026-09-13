import os

from app.core.notifications.base import ExternalSender, ProviderNotConfigured


class TwilioSMSSender(ExternalSender):
    """SMS via Twilio. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
    and TWILIO_FROM_NUMBER in the environment.

    This is a real integration interface, not a placeholder that
    pretends to send — if credentials are absent, send() raises
    ProviderNotConfigured instead of silently succeeding. Install the
    `twilio` package and set the three env vars above to activate it.
    """

    def __init__(self) -> None:
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER")

    def is_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number)

    async def send(self, to: str, subject: str, body: str) -> None:
        if not self.is_configured():
            raise ProviderNotConfigured(
                "SMS not sent: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / "
                "TWILIO_FROM_NUMBER are not set in the environment."
            )
        # Real send call — imported lazily so the `twilio` package is
        # only required if this channel is actually configured/used.
        from twilio.rest import Client  # type: ignore

        client = Client(self.account_sid, self.auth_token)
        client.messages.create(to=to, from_=self.from_number, body=body)
