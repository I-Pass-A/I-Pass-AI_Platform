import math
import re
from typing import List, Tuple
from app.models.schemas import ContextChunk, ChunkMetadata

class VectorStore:
    """
    Curriculum Vector Database Engine for Ethiopian Grade 9 English Textbook.
    Uses TF-IDF Vector Space Model & Cosine Similarity for fast semantic context retrieval.
    """
    def __init__(self):
        self.chunks: List[ContextChunk] = []
        self._vocabulary = set()
        self._idf = {}
        self._chunk_vectors = []
        self._initialize_curriculum_data()
        self._build_index()

    def _initialize_curriculum_data(self):
        raw_chunks = [
            # Unit 1
            {
                "id": "ENG-G9-U1-C1",
                "grade": 9, "subject": "English", "unit": 1, "unit_title": "Learning to Learn",
                "topic": "Present Simple vs Present Continuous",
                "content": "Present Simple is used for habitual actions, facts, and permanent states (e.g., 'Abebe studies every evening'). Present Continuous is used for actions happening right now or around the present moment (e.g., 'Students are reading in the library now'). Signal words for Present Simple include: always, usually, often, every day. Signal words for Present Continuous include: now, right now, at the moment, currently."
            },
            {
                "id": "ENG-G9-U1-C2",
                "grade": 9, "subject": "English", "unit": 1, "unit_title": "Learning to Learn",
                "topic": "Dictionary Skills & Guide Words",
                "content": "Guide words at the top of a dictionary page show the first and last words on that page. Headwords are listed alphabetically. Part of speech labels (n., v., adj., adv.) tell how the word functions in a sentence."
            },
            # Unit 2
            {
                "id": "ENG-G9-U2-C1",
                "grade": 9, "subject": "English", "unit": 2, "unit_title": "Family Life & Relationships",
                "topic": "Past Simple vs Past Continuous",
                "content": "Past Simple expresses completed actions in the past (e.g., 'Chaltu arrived home at 6 PM'). Past Continuous expresses an ongoing background action in the past (e.g., 'Her brother was doing his homework when she arrived'). We often use 'when' before Past Simple and 'while' before Past Continuous."
            },
            # Unit 3
            {
                "id": "ENG-G9-U3-C1",
                "grade": 9, "subject": "English", "unit": 3, "unit_title": "Traffic Safety & Road Usage",
                "topic": "Modal Verbs of Obligation & Advice",
                "content": "Use 'must' and 'have to' for strong obligation or official rules (e.g., 'Pedestrians must cross at zebra crossings'). Use 'should' or 'ought to' for advice and recommendations (e.g., 'Drivers should check their mirrors before turning'). Use 'must not' (mustn't) for prohibition (e.g., 'You must not drive without a seatbelt')."
            },
            # Unit 4
            {
                "id": "ENG-G9-U4-C1",
                "grade": 9, "subject": "English", "unit": 4, "unit_title": "Health and Fitness",
                "topic": "First Conditional (Real Possibility)",
                "content": "First Conditional structure: If + Present Simple, Will + Base Verb. It describes real, probable future events based on a condition (e.g., 'If you eat balanced traditional Ethiopian food like teff and vegetables, you will maintain good health'). If the 'if clause' comes first, use a comma."
            },
            # Unit 5
            {
                "id": "ENG-G9-U5-C1",
                "grade": 9, "subject": "English", "unit": 5, "unit_title": "Technology and Innovation",
                "topic": "Passive Voice (Present & Past Simple)",
                "content": "Passive Voice focuses on the action or receiver rather than the doer. Present Passive: Object + am/is/are + Past Participle (V3) (e.g., 'Solar energy is used across rural Ethiopia'). Past Passive: Object + was/were + Past Participle (V3) (e.g., 'The innovation award was presented to the young engineer')."
            },
            {
                "id": "ENG-G9-U5-C2",
                "grade": 9, "subject": "English", "unit": 5, "unit_title": "Technology and Innovation",
                "topic": "Relative Pronouns (Who, Which, That, Where)",
                "content": "Use 'who' for people ('The student who won the award is in Grade 9'). Use 'which' or 'that' for things and animals ('The software which was developed in Addis Ababa is free'). Use 'where' for places ('The lab where we conduct science experiments is brand new')."
            },
            # Unit 6
            {
                "id": "ENG-G9-U6-C1",
                "grade": 9, "subject": "English", "unit": 6, "unit_title": "Natural Resources & Conservation",
                "topic": "Second Conditional (Hypothetical/Unreal)",
                "content": "Second Conditional structure: If + Past Simple, Would + Base Verb. Used for hypothetical or unlikely present/future situations (e.g., 'If we planted more indigenous trees, our local climate would improve'). Note: For the verb 'to be', use 'were' for all subjects in formal grammar (e.g., 'If I were the minister...')."
            },
            {
                "id": "ENG-G9-U6-C2",
                "grade": 9, "subject": "English", "unit": 6, "unit_title": "Natural Resources & Conservation",
                "topic": "Cause and Effect Connectors",
                "content": "Cause connectors: because, since, as, due to, owing to. Effect connectors: therefore, as a result, consequently, so. Note: 'due to' and 'owing to' are followed by a noun phrase or gerund."
            },
            # Unit 7
            {
                "id": "ENG-G9-U7-C1",
                "grade": 9, "subject": "English", "unit": 7, "unit_title": "Cultural Heritage & Traditions",
                "topic": "Reported Speech (Indirect Speech)",
                "content": "When reporting statements in the past, present tenses shift back one step into the past. Present Simple -> Past Simple ('I love Meskel' -> He said he loved Meskel). Present Continuous -> Past Continuous. Present Perfect -> Past Perfect. Pronouns and time expressions also change (e.g., 'today' becomes 'that day', 'now' becomes 'then')."
            },
            # Unit 8
            {
                "id": "ENG-G9-U8-C1",
                "grade": 9, "subject": "English", "unit": 8, "unit_title": "Indigenous Knowledge",
                "topic": "Comparatives & Superlatives",
                "content": "Comparative adjective (+er / more) compares 2 items. Superlative adjective (+est / most) compares 3 or more items. Irregular forms: good -> better -> best; bad -> worse -> worst; far -> farther/further -> farthest/furthest."
            },
            # Unit 9
            {
                "id": "ENG-G9-U9-C1",
                "grade": 9, "subject": "English", "unit": 9, "unit_title": "Environment and Climate Change",
                "topic": "Present Perfect Tense",
                "content": "Structure: Subject + have/has + Past Participle (V3). Used for actions that started in the past and continue to the present, or past actions with present relevance (e.g., 'Ethiopia has launched the Green Legacy initiative'). Time indicators: since (point in time), for (duration)."
            },
            # Unit 10
            {
                "id": "ENG-G9-U10-C1",
                "grade": 9, "subject": "English", "unit": 10, "unit_title": "Future Aspirations & Careers",
                "topic": "Future Expressions (Will vs Be Going To)",
                "content": "Use 'be going to' for prior plans, intentions, or clear present evidence (e.g., 'Look at the dark clouds, it is going to rain'). Use 'will' for instant decisions, promises, offers, or general predictions (e.g., 'I will help you with your English assignment')."
            }
        ]

        for r in raw_chunks:
            meta = ChunkMetadata(
                grade=r["grade"],
                subject=r["subject"],
                unit=r["unit"],
                unit_title=r.get("unit_title"),
                topic=r["topic"]
            )
            self.chunks.append(ContextChunk(id=r["id"], content=r["content"], metadata=meta))

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())

    def _build_index(self):
        doc_count = len(self.chunks)
        doc_freq = {}

        # Tokenize each chunk (combining title, topic, content)
        doc_tokens_list = []
        for chunk in self.chunks:
            combined = f"{chunk.metadata.topic} {chunk.metadata.unit_title} {chunk.content}"
            tokens = self._tokenize(combined)
            doc_tokens_list.append(tokens)
            unique_tokens = set(tokens)
            self._vocabulary.update(unique_tokens)
            for t in unique_tokens:
                doc_freq[t] = doc_freq.get(t, 0) + 1

        # Calculate IDF
        for term, df in doc_freq.items():
            self._idf[term] = math.log((doc_count + 1) / (df + 1)) + 1.0

        # Build TF-IDF vectors
        self._chunk_vectors = []
        for tokens in doc_tokens_list:
            vector = self._compute_tfidf(tokens)
            self._chunk_vectors.append(vector)

    def _compute_tfidf(self, tokens: List[str]) -> dict:
        tf = {}
        total = len(tokens) if tokens else 1
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        
        tfidf = {}
        for t, count in tf.items():
            if t in self._idf:
                tfidf[t] = (count / total) * self._idf[t]
        return tfidf

    def _cosine_similarity(self, vec1: dict, vec2: dict) -> float:
        dot = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in vec1.keys())
        mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
        mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot / (mag1 * mag2)

    def search(self, query: str, top_k: int = 3, threshold: float = 0.05) -> List[ContextChunk]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        query_vec = self._compute_tfidf(query_tokens)
        results: List[Tuple[float, ContextChunk]] = []

        for idx, chunk_vec in enumerate(self._chunk_vectors):
            score = self._cosine_similarity(query_vec, chunk_vec)
            if score >= threshold:
                chunk_copy = self.chunks[idx].model_copy()
                chunk_copy.score = round(score, 4)
                results.append((score, chunk_copy))

        results.sort(key=lambda x: x[0], reverse=True)
        return [chunk for score, chunk in results[:top_k]]

vector_db = VectorStore()

















