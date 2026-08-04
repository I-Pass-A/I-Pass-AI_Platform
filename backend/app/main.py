import os
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.app.database import init_db, get_session
from backend.app.models import (
    User, CurriculumChunk, TutorSession, TutorMessage, Exam, ExamAttempt
)
from backend.app.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role, get_current_admin
)
from backend.app.rag import generate_tutor_response, process_file_to_chunks
from backend.app.utils import generate_exam_content, evaluate_exam_attempt

app = FastAPI(title="I-Pass-A Backend API", version="1.0.0")

# CORS middleware to communicate with Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# ================= AUTHENTICATION ENDPOINTS =================

@app.post("/api/auth/register")
def register(user_data: Dict[str, Any], session: Session = Depends(get_session)):
    email = user_data.get("email")
    if not email or not user_data.get("password") or not user_data.get("name"):
        raise HTTPException(status_code=400, detail="Missing required fields")
        
    existing = session.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash(user_data["password"])
    
    new_user = User(
        name=user_data["name"],
        email=email,
        hashed_password=hashed_password,
        role=user_data.get("role", "student"),
        grade=user_data.get("grade"),
        language=user_data.get("language", "English")
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role,
            "grade": new_user.grade,
            "language": new_user.language
        }
    }

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "grade": user.grade,
            "language": user.language
        }
    }

@app.get("/api/auth/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "grade": current_user.grade,
        "language": current_user.language
    }

# ================= AI TUTOR ENDPOINTS =================

@app.get("/api/tutor/sessions")
def get_tutor_sessions(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    sessions = session.query(TutorSession).filter(TutorSession.user_id == current_user.id).order_index = TutorSession.started_at.desc()
    # Sort locally or using query order
    results = session.query(TutorSession).filter(TutorSession.user_id == current_user.id).all()
    results.sort(key=lambda x: x.started_at, reverse=True)
    return [
        {
            "id": s.id,
            "subject": s.subject,
            "started_at": s.started_at,
            "last_message": s.messages[-1].content[:60] + "..." if s.messages else "No messages"
        }
        for s in results
    ]

@app.post("/api/tutor/sessions")
def create_tutor_session(
    data: Dict[str, str],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    subject = data.get("subject")
    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required")
        
    tutor_session = TutorSession(
        user_id=current_user.id,
        subject=subject
    )
    session.add(tutor_session)
    session.commit()
    session.refresh(tutor_session)
    return {"id": tutor_session.id, "subject": tutor_session.subject, "started_at": tutor_session.started_at}

@app.get("/api/tutor/sessions/{session_id}")
def get_tutor_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    tutor_session = session.get(TutorSession, session_id)
    if not tutor_session or tutor_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = session.query(TutorMessage).filter(TutorMessage.session_id == session_id).order_by(TutorMessage.timestamp.asc()).all()
    return {
        "id": tutor_session.id,
        "subject": tutor_session.subject,
        "started_at": tutor_session.started_at,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "timestamp": m.timestamp
            }
            for m in messages
        ]
    }

@app.post("/api/tutor/chat")
def tutor_chat(
    chat_request: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    session_id = chat_request.get("session_id")
    query = chat_request.get("query")
    grade_override = chat_request.get("grade")  # In case student wants to switch grades
    
    if not session_id or not query:
        raise HTTPException(status_code=400, detail="session_id and query are required")
        
    tutor_session = session.get(TutorSession, session_id)
    if not tutor_session or tutor_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get grade range logic
    # Users can study Grades 1-6 (Afaan Oromo), 7-8 (Afaan Oromo), or 9-12 (English)
    grade = grade_override or current_user.grade or "9"
    try:
        grade_num = int(grade.replace("Grade", "").strip())
    except:
        grade_num = 9
        
    if 1 <= grade_num <= 6:
        grade_band = "1-6"
        language = "Afaan Oromo"
    elif 7 <= grade_num <= 8:
        grade_band = "7-8"
        language = "Afaan Oromo"
    else:
        grade_band = "9-12"
        language = "English"

    # Fetch recent message history
    history_messages = session.query(TutorMessage).filter(
        TutorMessage.session_id == session_id
    ).order_by(TutorMessage.timestamp.asc()).all()
    
    history_list = [{"sender": m.sender, "content": m.content} for m in history_messages]

    # Call RAG response generator
    tutor_res = generate_tutor_response(
        query=query,
        subject=tutor_session.subject,
        grade=grade_band,
        language=language,
        history=history_list,
        session=session
    )
    
    # Save student message
    student_msg = TutorMessage(
        session_id=session_id,
        sender="student",
        content=query
    )
    session.add(student_msg)
    
    # Save tutor response
    tutor_msg = TutorMessage(
        session_id=session_id,
        sender="tutor",
        content=tutor_res["content"]
    )
    session.add(tutor_msg)
    session.commit()
    
    return {
        "response": tutor_res["content"],
        "sources": tutor_res["sources"],
        "out_of_scope": tutor_res["out_of_scope"]
    }

# ================= SAMPLE EXAM PREP ENDPOINTS =================

@app.post("/api/exams/generate")
def generate_exam(
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    subject = request_data.get("subject")
    topic = request_data.get("topic")
    difficulty = request_data.get("difficulty", "medium")
    grade = request_data.get("grade", current_user.grade or "9")
    
    if not subject or not topic:
        raise HTTPException(status_code=400, detail="subject and topic are required")
        
    try:
        grade_num = int(grade.replace("Grade", "").strip())
    except:
        grade_num = 9
        
    if 1 <= grade_num <= 6:
        grade_band = "1-6"
        language = "Afaan Oromo"
    elif 7 <= grade_num <= 8:
        grade_band = "7-8"
        language = "Afaan Oromo"
    else:
        grade_band = "9-12"
        language = "English"
        
    # Generate questions + answer key
    exam_data = generate_exam_content(
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        grade=grade_band,
        language=language,
        session=session
    )
    
    # Save generated exam so it can be taken/retrieved
    new_exam = Exam(
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        grade=grade,
        created_by=current_user.id,
        questions=exam_data["questions"],
        answer_key=exam_data["answer_key"]
    )
    session.add(new_exam)
    session.commit()
    session.refresh(new_exam)
    
    return {
        "id": new_exam.id,
        "subject": new_exam.subject,
        "topic": new_exam.topic,
        "difficulty": new_exam.difficulty,
        "grade": new_exam.grade,
        "questions": new_exam.questions
    }

@app.get("/api/exams/saved")
def get_saved_exams(
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    session: Session = Depends(get_session)
):
    query = session.query(Exam)
    if subject:
        query = query.filter(Exam.subject == subject)
    if grade:
        query = query.filter(Exam.grade == grade)
        
    exams = query.order_by(Exam.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "subject": e.subject,
            "topic": e.topic,
            "difficulty": e.difficulty,
            "grade": e.grade,
            "question_count": len(e.questions),
            "created_at": e.created_at
        }
        for e in exams
    ]

@app.get("/api/exams/{exam_id}")
def get_exam_detail(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    exam = session.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    return {
        "id": exam.id,
        "subject": exam.subject,
        "topic": exam.topic,
        "difficulty": exam.difficulty,
        "grade": exam.grade,
        "questions": exam.questions
    }

@app.post("/api/exams/submit")
def submit_exam(
    submission: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    exam_id = submission.get("exam_id")
    student_answers = submission.get("answers")
    
    if not exam_id or student_answers is None:
        raise HTTPException(status_code=400, detail="exam_id and answers are required")
        
    exam = session.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # Evaluate answers
    evaluation = evaluate_exam_attempt(student_answers, exam.answer_key)
    
    # Save attempt
    attempt = ExamAttempt(
        exam_id=exam_id,
        student_id=current_user.id,
        answers=student_answers,
        score=evaluation["score"]
    )
    session.add(attempt)
    session.commit()
    
    return {
        "attempt_id": attempt.id,
        "score": evaluation["score"],
        "results": evaluation["results"]
    }

@app.get("/api/exams/attempts")
def get_exam_attempts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    attempts = session.query(ExamAttempt).filter(
        ExamAttempt.student_id == current_user.id
    ).order_by(ExamAttempt.submitted_at.desc()).all()
    
    return [
        {
            "id": a.id,
            "exam_id": a.exam_id,
            "subject": a.exam.subject,
            "topic": a.exam.topic,
            "score": a.score,
            "submitted_at": a.submitted_at
        }
        for a in attempts
    ]

# ================= CONTENT ADMINISTRATION ENDPOINTS =================

@app.post("/api/admin/upload")
async def upload_curriculum(
    file: UploadFile = File(...),
    subject: str = Form(...),
    topic: str = Form(...),
    grade: str = Form(...),
    language: str = Form(...),
    current_user: User = Depends(require_role(["admin", "teacher"])),
    session: Session = Depends(get_session)
):
    # Read file content
    contents = await file.read()
    
    try:
        # Create chunk models and generate embeddings
        chunks = process_file_to_chunks(
            file_bytes=contents,
            filename=file.filename,
            subject=subject,
            topic=topic,
            grade=grade,
            language=language
        )
        
        # Save to database
        for chunk in chunks:
            session.add(chunk)
        session.commit()
        
        return {
            "detail": f"Successfully parsed document '{file.filename}' into {len(chunks)} curriculum chunks.",
            "chunk_count": len(chunks)
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/admin/chunks")
def get_chunks(
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    language: Optional[str] = None,
    current_user: User = Depends(require_role(["admin", "teacher"])),
    session: Session = Depends(get_session)
):
    query = session.query(CurriculumChunk)
    if subject:
        query = query.filter(CurriculumChunk.subject == subject)
    if grade:
        query = query.filter(CurriculumChunk.grade == grade)
    if language:
        query = query.filter(CurriculumChunk.language == language)
        
    chunks = query.order_by(CurriculumChunk.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "subject": c.subject,
            "topic": c.topic,
            "grade": c.grade,
            "language": c.language,
            "source_document": c.source_document,
            "content_preview": c.content[:100] + "...",
            "version": c.version,
            "created_at": c.created_at
        }
        for c in chunks
    ]

@app.delete("/api/admin/chunks/{chunk_id}")
def delete_chunk(
    chunk_id: int,
    current_user: User = Depends(require_role(["admin"])),
    session: Session = Depends(get_session)
):
    chunk = session.get(CurriculumChunk, chunk_id)
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    session.delete(chunk)
    session.commit()
    return {"detail": f"Chunk {chunk_id} successfully deleted"}
