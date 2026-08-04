from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, JSON, Column

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: str = Field(default="student")  # student, teacher, admin
    grade: Optional[str] = Field(default=None)  # e.g., "9", "3" (if student)
    language: str = Field(default="English")  # English, Afaan Oromo
    created_at: datetime = Field(default_factory=datetime.utcnow)

    sessions: List["TutorSession"] = Relationship(back_populates="user")
    exam_attempts: List["ExamAttempt"] = Relationship(back_populates="student")

class CurriculumChunk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subject: str = Field(index=True)
    topic: str = Field(index=True)
    grade: str = Field(index=True)  # "1-6", "7-8", "9-12"
    language: str = Field(index=True)  # "English", "Afaan Oromo"
    source_document: str
    content: str
    embedding_json: str = Field(default="[]")  # Serialized float list
    version: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TutorSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    subject: str
    started_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="sessions")
    messages: List["TutorMessage"] = Relationship(back_populates="session", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class TutorMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="tutorsession.id")
    sender: str  # "student", "tutor"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    session: TutorSession = Relationship(back_populates="messages")

class Exam(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subject: str
    topic: str
    difficulty: str  # easy, medium, hard
    grade: str  # "1-6", "7-8", "9-12"
    created_by: int = Field(foreign_key="user.id")
    # Questions and Answer Key stored as JSON in SQLite/Postgres
    questions: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    answer_key: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    attempts: List["ExamAttempt"] = Relationship(back_populates="exam")

class ExamAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    exam_id: int = Field(foreign_key="exam.id")
    student_id: int = Field(foreign_key="user.id")
    answers: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    score: float
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

    exam: Exam = Relationship(back_populates="attempts")
    student: User = Relationship(back_populates="exam_attempts")
