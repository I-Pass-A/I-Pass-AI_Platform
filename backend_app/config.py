import os


class Settings:
    PROJECT_NAME = os.getenv(
        "PROJECT_NAME",
        "i-pass-AI Backend"
    )

    VERSION = os.getenv(
        "VERSION",
        "1.0.0"
    )

    API_V1_STR = os.getenv(
        "API_V1_STR",
        "/api/v1"
    )

    DEFAULT_GRADE = int(
        os.getenv("DEFAULT_GRADE", "9")
    )

    DEFAULT_SUBJECT = os.getenv(
        "DEFAULT_SUBJECT",
        "English"
    )

    COUNTRY = os.getenv(
        "COUNTRY",
        "Ethiopia"
    )


settings = Settings()