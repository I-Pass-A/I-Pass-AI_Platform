import uuid
from typing import List, Dict
from backend_app.models.schemas import (
    ExamQuestionSchema, ExamGenerationRequest, ExamSubmitRequest, ExamResultResponse, QuestionEvaluation
)
from backend_app.services.vector_store import vector_db

class ExamService:
    """
    EGSECE / Ethiopian National Exam Generator Service for Grade 9 English.
    """
    def __init__(self):
        self._question_bank: Dict[str, ExamQuestionSchema] = {}
        self._seed_bank()

    def _seed_bank(self):
        questions_raw = [
            {
                "id": "EXAM-G9-01", "unit_id": 1, "topic": "Present Simple vs Continuous", "section": "Grammar & Usage",
                "question": "Choose the correct sentence to complete the conversation:\nAman: 'Where is Hawi?'\nBetelehem: 'She ________ in the library right now.'",
                "options": ["A) studied", "B) is studying", "C) studies", "D) has studied"],
                "correct_option": "B",
                "explanation": "The phrase 'right now' indicates an action in progress at the moment of speaking (Present Continuous)."
            },
            {
                "id": "EXAM-G9-02", "unit_id": 3, "topic": "Modal Verbs", "section": "Modal Verbs & Safety Rules",
                "question": "According to traffic regulations in Ethiopia, pedestrians ________ use zebra crossings when crossing busy highways.",
                "options": ["A) should not", "B) must", "C) might", "D) would"],
                "correct_option": "B",
                "explanation": "'Must' expresses strong legal obligation and official road safety rules."
            },
            {
                "id": "EXAM-G9-03", "unit_id": 4, "topic": "First Conditional", "section": "Conditionals",
                "question": "If students prepare consistently for the Grade 9 regional exams, they ________ high marks.",
                "options": ["A) will achieve", "B) achieved", "C) would achieve", "D) had achieved"],
                "correct_option": "A",
                "explanation": "First Conditional formula: If + Present Simple (prepare) -> Will + Base Verb (will achieve)."
            },
            {
                "id": "EXAM-G9-04", "unit_id": 5, "topic": "Passive Voice", "section": "Passive Voice",
                "question": "Identify the correct passive form of: 'The teacher corrected our test papers yesterday.'",
                "options": [
                    "A) Our test papers are corrected yesterday by the teacher.",
                    "B) Our test papers were corrected by the teacher yesterday.",
                    "C) Our test papers have been corrected by the teacher.",
                    "D) The teacher was corrected our test papers."
                ],
                "correct_option": "B",
                "explanation": "Past Simple Active ('corrected') becomes Past Simple Passive: Object + was/were + Past Participle ('were corrected')."
            },
            {
                "id": "EXAM-G9-05", "unit_id": 6, "topic": "Cause and Effect", "section": "Vocabulary & Context",
                "question": "Soil erosion has increased significantly in the region ________ heavy deforestation.",
                "options": ["A) because", "B) due to", "C) so", "D) as a result"],
                "correct_option": "B",
                "explanation": "'Due to' is followed by a noun phrase ('heavy deforestation'). 'Because' requires a clause with a verb."
            },
            {
                "id": "EXAM-G9-06", "unit_id": 7, "topic": "Reported Speech", "section": "Reported Speech",
                "question": "Direct: Tolossa said, 'I am studying for my English exam today.'\nReported: Tolossa said that he ________ for his English exam ________.",
                "options": [
                    "A) is studying / today",
                    "B) was studying / that day",
                    "C) studied / the day before",
                    "D) had studied / that day"
                ],
                "correct_option": "B",
                "explanation": "Present continuous 'am studying' shifts back to past continuous 'was studying'. Time expression 'today' shifts to 'that day'."
            }
        ]

        for q in questions_raw:
            model = ExamQuestionSchema(**q)
            self._question_bank[model.id] = model

    def generate_exam(self, req: ExamGenerationRequest) -> List[ExamQuestionSchema]:
        filtered = list(self._question_bank.values())

        if req.unit_id:
            filtered = [q for q in filtered if q.unit_id == req.unit_id]
        if req.topic:
            filtered = [q for q in filtered if req.topic.lower() in q.topic.lower()]
        if req.section:
            filtered = [q for q in filtered if req.section.lower() in q.section.lower()]

        # Return up to req.count items
        return filtered[:req.count]

    def evaluate_exam(self, req: ExamSubmitRequest) -> ExamResultResponse:
        total = len(req.user_answers)
        score = 0
        evaluations: List[QuestionEvaluation] = []

        for q_id, chosen in req.user_answers.items():
            q_item = self._question_bank.get(q_id)
            if not q_item:
                continue

            chosen_clean = chosen.strip().upper()
            correct_clean = q_item.correct_option.strip().upper()
            is_correct = (chosen_clean == correct_clean)
            if is_correct:
                score += 1

            evaluations.append(
                QuestionEvaluation(
                    question_id=q_id,
                    chosen=chosen_clean,
                    correct=correct_clean,
                    is_correct=is_correct,
                    explanation=q_item.explanation
                )
            )

        percentage = round((score / total) * 100, 2) if total > 0 else 0.0
        return ExamResultResponse(
            score=score,
            total=total,
            percentage=percentage,
            evaluations=evaluations
        )

exam_service = ExamService()



























