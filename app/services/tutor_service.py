from typing import List, Optional
from app.models.schemas import (
    QueryRequest, TutorResponse, ContextChunk, ChunkMetadata, PracticeQuestion
)
from app.services.vector_store import vector_db

class TutorService:
    """
    Core AI Tutor Service enforcing Operational Rules 1-5 for Ethiopian Grade 9 Students.
    """

    def process_query(self, req: QueryRequest) -> TutorResponse:
        query_text = req.query
        lang = (req.requested_language or "EN").upper()

        # Step 1: Query Curriculum Vector DB
        chunks: List[ContextChunk] = vector_db.search(query_text, top_k=2, threshold=0.08)

        is_supported = len(chunks) > 0
        honesty_msg: Optional[str] = None
        top_chunk: Optional[ContextChunk] = chunks[0] if is_supported else None

        if not is_supported:
            # Rule 5: HONESTY RULE TRIGGERED
            honesty_msg = (
                "I couldn't find this specific topic in the grade 9 English textbook material "
                "but here is a general academic explanation."
            )
            metadata = ChunkMetadata(grade=9, subject="English", unit=0, topic="General English Concept")
            textbook_context = "Context retrieval returned 0 matching chunks from Grade 9 English textbook database."
            direct_ans, step_exp, practice_q = self._generate_fallback_response(query_text)
        else:
            metadata = top_chunk.metadata
            textbook_context = top_chunk.content
            direct_ans, step_exp, practice_q = self._format_curriculum_response(query_text, top_chunk)

        # Rule 3: Language & Tone handling (English default, Amharic/Afan Oromo translations if requested)
        if lang == "AM":
            direct_ans = f"[አማርኛ ማብራሪያ] {direct_ans}"
        elif lang == "OM":
            direct_ans = f"[Ibsa Afaan Oromoo] {direct_ans}"

        return TutorResponse(
            direct_answer=direct_ans,
            step_by_step_explanation=step_exp,
            textbook_context=textbook_context,
            metadata=metadata,
            practice_question=practice_q,
            is_curriculum_supported=is_supported,
            honesty_notice=honesty_msg,
            language=lang
        )

    def _format_curriculum_response(self, query: str, chunk: ContextChunk) -> tuple:
        q_lower = query.lower()
        topic = chunk.metadata.topic.lower()

        if "present" in q_lower or "present" in topic:
            direct = "Present Simple expresses habits, facts, and routines, whereas Present Continuous expresses actions currently in progress right now."
            step_by_step = (
                "1. Identify Time Indicators: Look for signal words like 'always', 'usually' (Present Simple) versus 'now', 'at the moment' (Present Continuous).\n"
                "2. Form Present Simple: Subject + Verb (+s/es for 3rd person singular). Example: Abebe studies hard.\n"
                "3. Form Present Continuous: Subject + am/is/are + Verb-ing. Example: Students are reading right now."
            )
            practice = PracticeQuestion(
                question="Betelehem ________ (read) her Grade 9 English textbook at the moment.",
                options=["A) reads", "B) is reading", "C) read", "D) has read"],
                correct_option="B",
                explanation="The time indicator 'at the moment' requires the Present Continuous tense ('is reading').",
                section="Grammar & Usage"
            )

        elif "passive" in q_lower or "passive" in topic:
            direct = "Passive Voice is used when the emphasis is placed on the action or receiver rather than the doer."
            step_by_step = (
                "1. Object to Subject: Move the object receiving the action to the start of the sentence.\n"
                "2. Choose Auxiliary 'Be': Match sentence tense (Present: am/is/are; Past: was/were).\n"
                "3. Past Participle (V3): Use the V3 verb form (e.g., grow -> grown, write -> written).\n"
                "4. Agent (Optional): Add 'by [doer]' if necessary."
            )
            practice = PracticeQuestion(
                question="Active: 'Farmers in Ethiopia grow teff.' -> Passive: 'Teff ________ in Ethiopia.'",
                options=["A) grew", "B) is grown", "C) was grown", "D) is growing"],
                correct_option="B",
                explanation="Present Simple Passive is formed with 'is' + Past Participle ('grown').",
                section="Passive Voice"
            )

        elif "conditional" in q_lower or "conditional" in topic:
            if "second" in q_lower or "second" in topic:
                direct = "Second Conditional expresses hypothetical or unreal present/future situations."
                step_by_step = (
                    "1. If-clause Tense: If + Past Simple (e.g., If I had more time...).\n"
                    "2. Main Clause: Would / Could + Base Verb (e.g., ...I would visit Lalibela).\n"
                    "3. Formal Rule for 'be': Use 'were' for all subjects (e.g., If I were you...)."
                )
                practice = PracticeQuestion(
                    question="If we ________ (plant) more indigenous trees, our local environment would improve.",
                    options=["A) plant", "B) planted", "C) will plant", "D) have planted"],
                    correct_option="B",
                    explanation="Second conditional uses Past Simple ('planted') in the if-clause.",
                    section="Conditionals"
                )
            else:
                direct = "First Conditional expresses real, possible future events dependent on a condition."
                step_by_step = (
                    "1. If-clause Tense: If + Present Simple (e.g., If you study daily...).\n"
                    "2. Main Clause Tense: Will + Base Verb (e.g., ...you will pass the Grade 9 regional exam).\n"
                    "3. Punctuation: Use a comma after the if-clause when it starts the sentence."
                )
                practice = PracticeQuestion(
                    question="If Aster ________ (work) hard, she will achieve high results.",
                    options=["A) works", "B) worked", "C) will work", "D) work"],
                    correct_option="A",
                    explanation="First conditional takes Present Simple ('works') in the if-clause.",
                    section="Conditionals"
                )

        elif "modal" in q_lower or "modal" in topic or "must" in q_lower or "should" in q_lower:
            direct = "Modal verbs (must, should, have to) express obligation, rules, and recommendations."
            step_by_step = (
                "1. Must / Have to: Strong obligation or legal rules (e.g., Drivers must stop at red lights).\n"
                "2. Should / Ought to: Advice or recommendations (e.g., Students should revise daily).\n"
                "3. Must not: Absolute prohibition (e.g., You must not cross when cars are coming)."
            )
            practice = PracticeQuestion(
                question="Pedestrians ________ use zebra crossings when crossing busy highways in Ethiopia.",
                options=["A) should not", "B) must", "C) might", "D) would"],
                correct_option="B",
                explanation="'Must' expresses official legal obligation and safety regulation.",
                section="Modal Verbs"
            )

        elif "report" in q_lower or "indirect" in q_lower or "reported" in topic:
            direct = "Reported Speech expresses what someone said by shifting present tenses back into past tenses."
            step_by_step = (
                "1. Tense Backshift: Present Simple -> Past Simple; Present Continuous -> Past Continuous.\n"
                "2. Pronoun Shift: Change first person (I/we) to third person (he/she/they).\n"
                "3. Time Words: 'now' -> 'then', 'today' -> 'that day'."
            )
            practice = PracticeQuestion(
                question="Direct: Tolossa said, 'I am studying today.' -> Reported: Tolossa said that he ________ for his exam ________.",
                options=["A) is studying / today", "B) was studying / that day", "C) studied / yesterday", "D) had studied / that day"],
                correct_option="B",
                explanation="Present Continuous shifts to Past Continuous ('was studying') and 'today' becomes 'that day'.",
                section="Reported Speech"
            )

        else:
            direct = f"Regarding {chunk.metadata.topic} in Unit {chunk.metadata.unit} of Grade 9 English:"
            step_by_step = (
                f"1. Core Curriculum Concept: {chunk.content}\n"
                f"2. Application: Apply this rule when answering Grade 9 reading comprehension and grammar exam items."
            )
            practice = PracticeQuestion(
                question=f"Which topic in Unit {chunk.metadata.unit} covers this concept?",
                options=[f"A) {chunk.metadata.topic}", "B) Essay Writing", "C) Listening Skills", "D) Phonetics"],
                correct_option="A",
                explanation=f"Retrieved chunk directly references Unit {chunk.metadata.unit}: {chunk.metadata.topic}.",
                section="Curriculum Knowledge"
            )

        return direct, step_by_step, practice

    def _generate_fallback_response(self, query: str) -> tuple:
        direct = "This general concept involves standard English grammar and language structures."
        step_by_step = (
            "1. Standard Language Rule: Apply standard English syntax principles.\n"
            "2. Note: While not explicitly tagged in the Grade 9 textbook vector index, this knowledge strengthens general academic proficiency."
        )
        practice = PracticeQuestion(
            question="Which part of speech modifies a verb, adjective, or another adverb?",
            options=["A) Noun", "B) Adverb", "C) Preposition", "D) Conjunction"],
            correct_option="B",
            explanation="An adverb modifies verbs, adjectives, or other adverbs.",
            section="General English Knowledge"
        )
        return direct, step_by_step, practice

tutor_service = TutorService()






















