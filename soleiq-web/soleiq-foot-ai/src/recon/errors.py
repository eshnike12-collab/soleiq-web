"""Failure modes that must reach the user verbatim."""


class ReconstructionError(RuntimeError):
    """
    A reconstruction that cannot honestly be completed.

    The message is shown to the person who took the photos, so it says what
    went wrong and what to do, not which function raised. Never caught and
    turned into a placeholder model.
    """

    def __init__(self, message: str, *, stage: str = "unknown"):
        super().__init__(message)
        self.stage = stage
