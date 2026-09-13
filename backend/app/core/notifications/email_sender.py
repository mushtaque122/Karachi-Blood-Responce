import os
import smtplib
from email.mime.text import MIMEText

from app.core.notifications.base import ExternalSender, ProviderNotConfigured


class SMTPEmailSender(ExternalSender):
    """Email via a standard SMTP relay. Requires SMTP_HOST, SMTP_PORT,
    SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM_ADDRESS in the
    environment. Raises ProviderNotConfigured rather than pretending
    to send when credentials are missing."""

    def __init__(self) -> None:
        self.host = os.getenv("SMTP_HOST")
        self.port = os.getenv("SMTP_PORT")
        self.username = os.getenv("SMTP_USERNAME")
        self.password = os.getenv("SMTP_PASSWORD")
        self.from_address = os.getenv("SMTP_FROM_ADDRESS")

    def is_configured(self) -> bool:
        return bool(self.host and self.port and self.username and self.password and self.from_address)

    async def send(self, to: str, subject: str, body: str) -> None:
        if not self.is_configured():
            raise ProviderNotConfigured(
                "Email not sent: SMTP_HOST / SMTP_PORT / SMTP_USERNAME / "
                "SMTP_PASSWORD / SMTP_FROM_ADDRESS are not set in the environment."
            )
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = self.from_address
        msg["To"] = to

        with smtplib.SMTP(self.host, int(self.port)) as server:
            server.starttls()
            server.login(self.username, self.password)
            server.send_message(msg)
