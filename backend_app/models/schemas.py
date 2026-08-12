from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ChunkMetadata(BaseModel):
    grade: int = 9
    subject: str = "English"
    unit: int
    unit_title: Optional[str] = None
    topic: str

class ContextChunk(BaseModel):
    id: str
    content: str
    metadata: ChunkMetadata
    score: Optional[float] = 0.0

class QueryRequest(BaseModel):
    query: str = Field(..., description="Student's query about Grade 9 English")
    grade: Optional[int] = 9
    subject: Optional[str] = "English"
    requested_language: Optional[str] = Field("EN", description="EN for English, AM for Amharic, OM for Afan Oromo")

class PracticeQuestion(BaseModel):
    question: str
    options: List[str]
    correct_option: str
    explanation: str
    section: Optional[str] = "Grammar & Usage"

class TutorResponse(BaseModel):
    direct_answer: str
    step_by_step_explanation: str
    textbook_context: str
    metadata: ChunkMetadata
    practice_question: PracticeQuestion
    is_curriculum_supported: bool
    honesty_notice: Optional[str] = None
    language: str = "EN"

class UnitSummary(BaseModel):
    unit: int
    title: str
    topics: List[str]
    chunk_count: int

class ExamGenerationRequest(BaseModel):
    unit_id: Optional[int] = None
    topic: Optional[str] = None
    count: int = Field(5, ge=1, le=20)
    section: Optional[str] = None

class ExamQuestionSchema(BaseModel):
    id: str
    unit_id: int
    topic: str
    section: str
    question: str
    options: List[str]
    correct_option: str
    explanation: str

class ExamSubmitRequest(BaseModel):
    user_answers: Dict[str, str] = Field(..., description="Mapping of question ID to chosen option (A, B, C, D)")

class QuestionEvaluation(BaseModel):
    question_id: str
    chosen: str
    correct: str
    is_correct: bool
    explanation: str

class ExamResultResponse(BaseModel):
    score: int
    total: int
    percentage: float
    evaluations: List[QuestionEvaluation]


















