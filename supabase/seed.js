require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

let ai = null;
if (geminiApiKey) {
  try {
    const { GoogleGenAI } = require("@google/genai");
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (e) {
    console.warn("Could not load @google/genai, falling back to mock embeddings:", e.message);
  }
}

const MOCK_CHUNKS = [
  // Grades 9-12 (English)
  {
    subject: "English",
    topic: "Tenses",
    grade: "9-12",
    language: "English",
    source_document: "Grade9_English_Unit1.pdf",
    content: "The Present Perfect Tense is used to describe an action that happened at an indefinite time in the past or began in the past and continues in the present. It is formed using 'have/has' + past participle (e.g., 'I have lived in Adama for five years'). In contrast, the Past Simple Tense is used for actions completed at a specific time in the past (e.g., 'I lived in Adama in 2021'). Common markers for present perfect include 'already', 'yet', 'since', and 'for', while past simple uses 'yesterday', 'ago', and 'last year'."
  },
  {
    subject: "Biology",
    topic: "Cell Structure",
    grade: "9-12",
    language: "English",
    source_document: "Grade10_Biology_Unit2.pdf",
    content: "The cell is the basic structural and functional unit of life. Animal cells and plant cells have key differences. Plant cells have a rigid cell wall made of cellulose, chloroplasts for photosynthesis, and a large central vacuole for turgor pressure. Animal cells lack cell walls and chloroplasts, and typically have smaller, temporary vacuoles. Both cell types share common organelles like the nucleus (which houses DNA), mitochondria (the powerhouses generating ATP energy), ribosomes (sites of protein synthesis), and the cell membrane (regulating entry and exit of materials)."
  },
  {
    subject: "Chemistry",
    topic: "Periodic Table",
    grade: "9-12",
    language: "English",
    source_document: "Grade11_Chemistry_Unit3.pdf",
    content: "The periodic table is arranged by increasing atomic number. Rows are called periods, and columns are called groups or families. Elements in the same group share similar chemical properties because they have the same number of valence electrons. Group 1 elements are Alkali Metals, which are highly reactive with water. Group 17 elements are Halogens, highly reactive non-metals. Group 18 contains Noble Gases, which are inert due to having a full outer electron shell (octet rule)."
  },

  // Grades 1-6 (Afaan Oromo)
  {
    subject: "Afaan Oromo",
    topic: "Caasluga (Grammar)",
    grade: "1-6",
    language: "Afaan Oromo",
    source_document: "Kutaa3_AfaanOromo_Caasluga.txt",
    content: "Afaan Oromo keessatti dhamijni fi sagaleen caasaa bu'uuraa jechootaa uumu. Qubeelee Afaan Oromo guutuun 26 yoo ta'an, dubbachiiftuu (vowels) shani: a, e, i, o, u. Dubbachiiftuun kunniin dheeraa ykn gabaabaa ta'anii barreeffamu keessatti dachaafamanii (fkn, 'baala' vs 'bala') hiika jechaa jijjiiru. Dubbifamtoonni (consonants) immoo sagalee jabaa ykn laafaa qabu."
  },
  {
    subject: "Saayinsii",
    topic: "Naannoo Keenya",
    grade: "1-6",
    language: "Afaan Oromo",
    source_document: "Kutaa5_Saayinsii_Naannoo.txt",
    content: "Lubbu qabeeyyiin naannoo keenyaa bishaan, qilleensa, fi soorata irratti hirkatu. Biqiltoonni gocha footosintasisitiin bishaan, ifa biiftuu fi kaarboondayi'oksaayidiitti fayyadamanii soorata ofii qopheessu. Oksijiinii gara naannootti gadhisu, kunis bineensota fi namootaaf barbaachisaa dha. Lubbu-dhabeeyyiin akka biyyee, dhagaa, fi bishaanii jireenya lubbu-qabeeyyiif haala mijeessu."
  },

  // Grades 7-8 (Afaan Oromo)
  {
    subject: "Afaan Oromo",
    topic: "Og-barruu (Literature)",
    grade: "7-8",
    language: "Afaan Oromo",
    source_document: "Kutaa7_AfaanOromo_Ogbarruu.txt",
    content: "Og-barruun afoolaa fi barreeffama jedhamuun qoodama. Afoolli uummata Oromo keessatti iddoo guddaa qaba. Isaan keessaa hibboo, mammaksa, weedduu, fi sheekkoon caasaa aadaa seenaa dhalootaa dhalootatti dabarsuuf gargaaran dha. Hibboon sammuu naamusaan qaruuf, mammaksi immoo dubbii qaxaxeessuuf gargara. Og-barruun barreeffamaa immoo walaloo, asoosama fi diraamaa of keessatti qabata."
  },
  {
    subject: "Hawaasummaa (Social Studies)",
    topic: "Seenaa Adama",
    grade: "7-8",
    language: "Afaan Oromo",
    source_document: "Kutaa8_Hawaasummaa_Adama.txt",
    content: "Magaalaan Adaamaa wiirtuu daldalaa fi geejjibaa Oromiyaa keessatti iddoo guddaa qabdu dha. Bara 1915 keessa ijaarama babal'achuu kan jalqabde yoo ta'u, sababa daandii baaburaa Finfinnee irraa gara Jibutitti diriireeni. Adaamaan maqaa 'Naazireet' jedhamuunis waggoota hedduuf waamamaa turte, haa ta'u malee maqaa durii fi hawaasummaa ishee 'Adaamaa' jedhu deebifattee jirti. Magaalittiin misooma Smart City fi indaastiriitiin saffisaan guddachaa jirti."
  }
];

async function seedData() {
  console.log("Checking vector database chunks...");
  
  // Verify chunks
  const { count, error: countErr } = await supabase
    .from("curriculum_chunks")
    .select("*", { count: "exact", head: true });
    
  if (countErr) {
    console.error("Database query failed. Ensure you have run supabase/schema.sql in your Supabase dashboard SQL editor first!");
    console.error("Detail:", countErr.message);
    process.exit(1);
  }

  if (count === 0) {
    console.log(`Seeding ${MOCK_CHUNKS.length} curriculum chunks. Generating embeddings...`);
    for (const chunk of MOCK_CHUNKS) {
      let embedding = [];
      if (ai) {
        try {
          const embedRes = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: chunk.content
          });
          embedding = embedRes.embeddings[0].values;
        } catch (e) {
          console.error(`Failed to get embedding for topic ${chunk.topic}:`, e.message);
        }
      }
      
      if (embedding.length === 0) {
        // Deterministic mock vector
        embedding = Array.from({ length: 1536 }, (_, idx) => 
          Math.sin(chunk.content.length + idx) * 0.1
        );
      }

      const { error: insErr } = await supabase
        .from("curriculum_chunks")
        .insert({
          ...chunk,
          embedding,
          version: 1,
          uploaded_by: "System Seed"
        });
        
      if (insErr) {
        console.error(`Insert failed for topic ${chunk.topic}:`, insErr.message);
      } else {
        console.log(`Successfully seeded chunk: ${chunk.subject} -> ${chunk.topic}`);
      }
    }
  } else {
    console.log(`Curriculum chunks already seeded (${count} records).`);
  }

  console.log("\n--- Database Seeding Complete ---");
  console.log("Sign up students and teachers directly from the web interface.");
  console.log("Roles (student/teacher/admin) can be adjusted in the public.profiles table.");
}

seedData().catch(e => console.error("Uncaught seed error:", e));
