from fastapi import APIRouter

router = APIRouter(prefix="/exams", tags=["Exams"])


@router.get("/")
def exams_home():
    return {
        "status": "online",
        "message": "Exams API is working"
    }