from fastapi import APIRouter

router = APIRouter(prefix="/tutor", tags=["Tutor"])


@router.get("/")
def tutor_home():
    return {
        "status": "online",
        "message": "AI Tutor API is working"
    }