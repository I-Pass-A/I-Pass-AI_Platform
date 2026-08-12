from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend_app.config import settings
from backend_app.api.v1.tutor import router as tutor_router
from backend_app.api.v1.curriculum import router as curriculum_router
from backend_app.api.v1.exams import router as exam_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Official Ethiopian Grade 1-12 Digital Tutor & EGSECE Exam Prep API (Current Active Scope: Grade 9 English Curriculum)"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1
app.include_router(tutor_router, prefix=settings.API_V1_STR)
app.include_router(curriculum_router, prefix=settings.API_V1_STR)
app.include_router(exam_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_scope": f"Grade {settings.DEFAULT_GRADE} {settings.DEFAULT_SUBJECT} Curriculum ({settings.COUNTRY})",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }






















