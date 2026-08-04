import os
import json
from typing import List, Dict, Any
from sqlmodel import Session
from backend.app.rag import retrieve_context, client

def generate_exam_content(
    subject: str, topic: str, difficulty: str, grade: str, language: str, session: Session
) -> Dict[str, Any]:
    """Generates a list of questions and an answer key using curriculum chunks and Gemini."""
    # Retrieve relevant context
    retrieved = retrieve_context(topic, subject, grade, language, session, top_k=5)
    context_block = "\n---\n".join([c["content"] for c in retrieved])

    if not client:
        # Mock exam generator when Gemini is not configured
        mock_questions = []
        if language.lower() == "afaan oromo":
            mock_questions = [
                {
                    "id": 1,
                    "type": "multiple_choice",
                    "question_text": f"Qormaata Mock {subject} - Gaafilee 1: Hiika jecha '{topic}' maali?",
                    "options": ["Deebii A", "Deebii B", "Deebii C", "Deebii D"],
                    "correct_answer": "Deebii A",
                    "explanation": f"Jechi '{topic}' hiika garii qaba sababa kanaan Deebii A dha."
                },
                {
                    "id": 2,
                    "type": "short_answer",
                    "question_text": f"Gaafilee 2: '{topic}' irratti ibsa gabaabaa barreessi.",
                    "correct_answer": f"Ibsa '{topic}'",
                    "explanation": f"Ibsi guutuun '{topic}' haala kanaan ta'a."
                }
            ]
        else:
            mock_questions = [
                {
                    "id": 1,
                    "type": "multiple_choice",
                    "question_text": f"Mock Exam {subject} - Question 1: What is the main concept of {topic}?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "Option A",
                    "explanation": f"Option A is correct based on the mock curriculum for {topic}."
                },
                {
                    "id": 2,
                    "type": "short_answer",
                    "question_text": f"Question 2: Briefly explain the importance of {topic}.",
                    "correct_answer": f"Importance of {topic}",
                    "explanation": f"The main importance of {topic} is to understand its fundamentals."
                }
            ]
            
        return {
            "questions": [
                {
                    "id": q["id"],
                    "type": q["type"],
                    "question_text": q["question_text"],
                    "options": q.get("options")
                }
                for q in mock_questions
            ],
            "answer_key": [
                {
                    "id": q["id"],
                    "correct_answer": q["correct_answer"],
                    "explanation": q["explanation"]
                }
                for q in mock_questions
            ]
        }

    # Gemini prompt
    system_instruction = f"""
You are an expert curriculum test designer. Generate a school exam for Grade {grade} students in {subject}.
The exam must be generated entirely in the instruction language: {language}.
Format the output as a strict JSON object with two fields: 'questions' and 'answer_key'.
Ensure questions are:
- Strictly grounded in the provided curriculum context. Do not ask general knowledge questions that are not mentioned or implied by the context.
- Age-appropriate (Grade {grade} level).
- Divided equally between 'multiple_choice' and 'short_answer' question types.
- Multiple-choice questions must have exactly 4 choices under 'options'.
"""

    prompt = f"""
Curriculum Context:
{context_block}

Exam Request:
- Subject: {subject}
- Topic: {topic}
- Difficulty: {difficulty} (generate questions of this level)
- Language: {language}
- Number of questions: 6

Generate the exam. Output MUST be valid JSON matching this schema:
{{
  "questions": [
    {{
      "id": 1,
      "type": "multiple_choice",
      "question_text": "text of the question",
      "options": ["choice 1", "choice 2", "choice 3", "choice 4"]
    }},
    {{
      "id": 2,
      "type": "short_answer",
      "question_text": "text of the question"
    }}
  ],
  "answer_key": [
    {{
      "id": 1,
      "correct_answer": "choice 1",
      "explanation": "step-by-step explanation why this is correct in {language}"
    }},
    {{
      "id": 2,
      "correct_answer": "expected key phrases or answer model",
      "explanation": "step-by-step explanation of what content is required in {language}"
    }}
  ]
}}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json"
            )
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Error generating exam with Gemini: {e}")
        # Fallback to standard error mock
        return {
            "questions": [{"id": 1, "type": "short_answer", "question_text": f"Error generating exam. Please try again. Detailed error: {e}"}],
            "answer_key": [{"id": 1, "correct_answer": "error", "explanation": "none"}]
        }

def evaluate_exam_attempt(student_answers: List[Dict[str, Any]], answer_key: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Scores student answers against the exam answer key."""
    correct_map = {item["id"]: item for item in answer_key}
    
    total = len(answer_key)
    score = 0.0
    results = []
    
    for ans in student_answers:
        q_id = ans.get("id")
        student_val = str(ans.get("answer", "")).strip().lower()
        
        key_item = correct_map.get(q_id)
        if not key_item:
            continue
            
        correct_val = str(key_item.get("correct_answer", "")).strip().lower()
        is_correct = False
        
        # Simple string matching for evaluation.
        # In a real app we might use LLM to grade short answers, but standard exact match or simple key phrase containment works well for immediate feedback.
        if correct_val in student_val or student_val in correct_val:
            is_correct = True
            score += 1.0
        
        results.append({
            "id": q_id,
            "student_answer": ans.get("answer"),
            "correct_answer": key_item.get("correct_answer"),
            "is_correct": is_correct,
            "explanation": key_item.get("explanation")
        })
        
    final_score = (score / total) * 100 if total > 0 else 0.0
    return {
        "score": final_score,
        "results": results
    }
