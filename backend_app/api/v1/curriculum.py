from fastapi import APIRouter

router = APIRouter(prefix="/curriculum", tags=["Curriculum"])


@router.get("/")
def curriculum_home():
    return {
        "status": "online",
        "message": "Curriculum API is working"
    }