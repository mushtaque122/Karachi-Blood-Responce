from abc import ABC, abstractmethod


class ProviderNotConfigured(Exception):
    """Raised when a channel is invoked but its required credentials
    are not set. Per project rules: never pretend an unconfigured
    external integration works — fail loudly and clearly instead."""


class ExternalSender(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        ...

    @abstractmethod
    async def send(self, to: str, subject: str, body: str) -> None:
        """Raises ProviderNotConfigured if credentials are missing.
        Raises whatever the underlying provider raises on send failure —
        callers are responsible for catching and recording delivery
        status, not this class."""
        ...
