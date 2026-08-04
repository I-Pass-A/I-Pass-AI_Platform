import json
from sqlmodel import Session
from backend.app.database import engine, init_db
from backend.app.models import CurriculumChunk, User
from backend.app.auth import get_password_hash
from backend.app.rag import get_embedding

MOCK_CHUNKS = [
    # Grades 9-12 (English)
    {
        "subject": "English",
        "topic": "Tenses",
        "grade": "9-12",
        "language": "English",
        "source_document": "Grade9_English_Unit1.pdf",
        "content": "The Present Perfect Tense is used to describe an action that happened at an indefinite time in the past or began in the past and continues in the present. It is formed using 'have/has' + past participle (e.g., 'I have lived in Adama for five years'). In contrast, the Past Simple Tense is used for actions completed at a specific time in the past (e.g., 'I lived in Adama in 2021'). Common markers for present perfect include 'already', 'yet', 'since', and 'for', while past simple uses 'yesterday', 'ago', and 'last year'."
    },
    {
        "subject": "Biology",
        "topic": "Cell Structure",
        "grade": "9-12",
        "language": "English",
        "source_document": "Grade10_Biology_Unit2.pdf",
        "content": "The cell is the basic structural and functional unit of life. Animal cells and plant cells have key differences. Plant cells have a rigid cell wall made of cellulose, chloroplasts for photosynthesis, and a large central vacuole for turgor pressure. Animal cells lack cell walls and chloroplasts, and typically have smaller, temporary vacuoles. Both cell types share common organelles like the nucleus (which houses DNA), mitochondria (the powerhouses generating ATP energy), ribosomes (sites of protein synthesis), and the cell membrane (regulating entry and exit of materials)."
    },
    {
        "subject": "Chemistry",
        "topic": "Periodic Table",
        "grade": "9-12",
        "language": "English",
        "source_document": "Grade11_Chemistry_Unit3.pdf",
        "content": "The periodic table is arranged by increasing atomic number. Rows are called periods, and columns are called groups or families. Elements in the same group share similar chemical properties because they have the same number of valence electrons. Group 1 elements are Alkali Metals, which are highly reactive with water. Group 17 elements are Halogens, highly reactive non-metals. Group 18 contains Noble Gases, which are inert due to having a full outer electron shell (octet rule)."
    },

    # Grades 1-6 (Afaan Oromo)
    {
        "subject": "Afaan Oromo",
        "topic": "Caasluga (Grammar)",
        "grade": "1-6",
        "language": "Afaan Oromo",
        "source_document": "Kutaa3_AfaanOromo_Caasluga.txt",
        "content": "Afaan Oromo keessatti dhamijni fi sagaleen caasaa bu'uuraa jechootaa uumu. Qubeelee Afaan Oromo guutuun 26 yoo ta'an, dubbachiiftuu (vowels) shani: a, e, i, o, u. Dubbachiiftuun kunniin dheeraa ykn gabaabaa ta'anii barreeffamu keessatti dachaafamanii (fkn, 'baala' vs 'bala') hiika jechaa jijjiiru. Dubbifamtoonni (consonants) immoo sagalee jabaa ykn laafaa qabu."
    },
    {
        "subject": "Saayinsii",
        "topic": "Naannoo Keenya",
        "grade": "1-6",
        "language": "Afaan Oromo",
        "source_document": "Kutaa5_Saayinsii_Naannoo.txt",
        "content": "Lubbu qabeeyyiin naannoo keenyaa bishaan, qilleensa, fi soorata irratti hirkatu. Biqiltoonni gocha footosintasisitiin bishaan, ifa biiftuu fi kaarboondayi'oksaayidiitti fayyadamanii soorata ofii qopheessu. Oksijiinii gara naannootti gadhisu, kunis bineensota fi namootaaf barbaachisaa dha. Lubbu-dhabeeyyiin akka biyyee, dhagaa, fi bishaanii jireenya lubbu-qabeeyyiif haala mijeessu."
    },

    # Grades 7-8 (Afaan Oromo)
    {
        "subject": "Afaan Oromo",
        "topic": "Og-barruu (Literature)",
        "grade": "7-8",
        "language": "Afaan Oromo",
        "source_document": "Kutaa7_AfaanOromo_Ogbarruu.txt",
        "content": "Og-barruun afoolaa fi barreeffama jedhamuun qoodama. Afoolli uummata Oromo keessatti iddoo guddaa qaba. Isaan keessaa hibboo, mammaksa, weedduu, fi sheekkoon caasaa aadaa seenaa dhalootaa dhalootatti dabarsuuf gargaaran dha. Hibboon sammuu naamusaan qaruuf, mammaksi immoo dubbii qaxaxeessuuf gargara. Og-barruun barreeffamaa immoo walaloo, asoosama fi diraamaa of keessatti qabata."
    },
    {
        "subject": "Hawaasummaa (Social Studies)",
        "topic": "Seenaa Adama",
        "grade": "7-8",
        "language": "Afaan Oromo",
        "source_document": "Kutaa8_Hawaasummaa_Adama.txt",
        "content": "Magaalaan Adaamaa wiirtuu daldalaa fi geejjibaa Oromiyaa keessatti iddoo guddaa qabdu dha. Bara 1915 keessa ijaarama babal'achuu kan jalqabde yoo ta'u, sababa daandii baaburaa Finfinnee irraa gara Jibutitti diriireeni. Adaamaan maqaa 'Naazireet' jedhamuunis waggoota hedduuf waamamaa turte, haa ta'u malee maqaa durii fi hawaasummaa ishee 'Adaamaa' jedhu deebifattee jirti. Magaalittiin misooma Smart City fi indaastiriitiin saffisaan guddachaa jirti."
    }
]

def seed_data():
    init_db()
    with Session(engine) as session:
        # Check if users already exist
        admin_exists = session.query(User).filter(User.role == "admin").first()
        if not admin_exists:
            print("Seeding users...")
            admin_user = User(
                name="Admin User",
                email="admin@ipassa.com",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                language="English"
            )
            teacher_user = User(
                name="Teacher User",
                email="teacher@ipassa.com",
                hashed_password=get_password_hash("teacher123"),
                role="teacher",
                language="English"
            )
            student_user = User(
                name="Student User",
                email="student@ipassa.com",
                hashed_password=get_password_hash("student123"),
                role="student",
                grade="9",
                language="English"
            )
            session.add(admin_user)
            session.add(teacher_user)
            session.add(student_user)
            session.commit()
            print("Users seeded (admin@ipassa.com:admin123, teacher@ipassa.com:teacher123, student@ipassa.com:student123)")

        # Check if chunks already exist
        chunk_count = session.query(CurriculumChunk).count()
        if chunk_count == 0:
            print("Seeding mock curriculum chunks (this might take a few seconds)...")
            for chunk_data in MOCK_CHUNKS:
                embedding = get_embedding(chunk_data["content"])
                chunk = CurriculumChunk(
                    subject=chunk_data["subject"],
                    topic=chunk_data["topic"],
                    grade=chunk_data["grade"],
                    language=chunk_data["language"],
                    source_document=chunk_data["source_document"],
                    content=chunk_data["content"],
                    embedding_json=json.dumps(embedding),
                    version=1
                )
                session.add(chunk)
            session.commit()
            print(f"Seeded {len(MOCK_CHUNKS)} mock curriculum chunks.")
        else:
            print("Curriculum chunks already seeded.")

if __name__ == "__main__":
    seed_data()
