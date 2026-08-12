import { createClient } from "@supabase/supabase-js";

const isRealConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder-project-id.supabase.co";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

// Real Supabase Client
const realSupabase = createClient(supabaseUrl, supabaseAnonKey);

// ================= LOCAL STORAGE MOCK DATABASE LAYER =================
class MockQueryBuilder {
  table: string;
  filters: Array<(item: any) => boolean> = [];
  sortCol: string | null = null;
  sortAsc = true;
  isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(cols?: string) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((item) => item[col] === val);
    return this;
  }

  order(col: string, options = { ascending: true }) {
    this.sortCol = col;
    this.sortAsc = options.ascending;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  private getDB() {
    if (typeof window === "undefined") return {};
    const db = localStorage.getItem("ipassa_mock_db");
    if (!db) {
      // Seed default chunks and user if empty
      const defaultDB = {
        profiles: [
          { id: "mock-student-id", name: "Mock Student", role: "student", grade: "9", language: "English" },
          { id: "mock-teacher-id", name: "Mock Teacher", role: "teacher", grade: null, language: "English" },
          { id: "mock-admin-id", name: "Mock Administrator", role: "admin", grade: null, language: "English" }
        ],
        curriculum_chunks: [
          {
            id: 1,
            subject: "English",
            topic: "Tenses",
            grade: "12",
            language: "English",
            source_document: "English_Grade9_Grammar.pdf",
            content: "The Present Perfect Tense is used to describe an action that happened at an indefinite time in the past or began in the past and continues in the present. It is formed using 'have/has' + past participle (e.g., 'I have lived in Adama for five years'). In contrast, the Past Simple Tense is used for actions completed at a specific time in the past (e.g., 'I lived in Adama in 2021'). Common markers for present perfect include 'already', 'yet', 'since', and 'for', while past simple uses 'yesterday', 'ago', and 'last year'.",
            version: 1,
            uploaded_by: "System Seed",
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            subject: "Biology",
            topic: "Cell Structure",
            grade: "9",
            language: "English",
            source_document: "Biology_Grade10_Unit2.pdf",
            content: "The cell is the basic structural and functional unit of life. Animal cells and plant cells have key differences. Plant cells have a rigid cell wall made of cellulose, chloroplasts for photosynthesis, and a large central vacuole for turgor pressure. Animal cells lack cell walls and chloroplasts, and typically have smaller, temporary vacuoles. Both cell types share common organelles like the nucleus (which houses DNA), mitochondria (the powerhouses generating ATP energy), ribosomes (sites of protein synthesis), and the cell membrane (regulating entry and exit of materials).",
            version: 1,
            uploaded_by: "System Seed",
            created_at: new Date().toISOString()
          },
          {
            id: 3,
            subject: "Afaan Oromo",
            topic: "Caasluga",
            grade: "6",
            language: "Afaan Oromo",
            source_document: "Kutaa3_Caasluga_Barreeffama.txt",
            content: "Afaan Oromo keessatti dhamijni fi sagaleen caasaa bu'uuraa jechootaa uumu. Qubeelee Afaan Oromo guutuun 26 yoo ta'an, dubbachiiftuu (vowels) shani: a, e, i, o, u. Dubbachiiftuun kunniin dheeraa ykn gabaabaa ta'anii barreeffamu keessatti dachaafamanii (fkn, 'baala' vs 'bala') hiika jechaa jijjiiru. Dubbifamtoonni (consonants) immoo sagalee jabaa ykn laafaa qabu.",
            version: 1,
            uploaded_by: "System Seed",
            created_at: new Date().toISOString()
          }
        ],
        tutor_sessions: [],
        tutor_messages: [],
        exams: [],
        exam_attempts: []
      };
      localStorage.setItem("ipassa_mock_db", JSON.stringify(defaultDB));
      return defaultDB;
    }
    return JSON.parse(db);
  }

  private saveDB(db: any) {
    if (typeof window !== "undefined") {
      localStorage.setItem("ipassa_mock_db", JSON.stringify(db));
    }
  }

  async insert(data: any) {
    const db = this.getDB();
    if (!db[this.table]) db[this.table] = [];
    
    const records = Array.isArray(data) ? data : [data];
    const inserted = records.map((r, idx) => ({
      id: r.id || Date.now() + idx,
      created_at: new Date().toISOString(),
      ...r
    }));

    db[this.table].push(...inserted);
    this.saveDB(db);

    return {
      data: Array.isArray(data) ? inserted : inserted[0],
      error: null,
      select: () => ({
        single: () => Promise.resolve({ data: inserted[0], error: null })
      })
    };
  }

  async update(data: any) {
    const db = this.getDB();
    let items = db[this.table] || [];

    // Find and update matched records
    items = items.map((item: any) => {
      // Evaluate if item matches filters
      const match = this.filters.every(filter => filter(item));
      if (match) {
        return { ...item, ...data };
      }
      return item;
    });

    db[this.table] = items;
    this.saveDB(db);

    return { data: items, error: null };
  }

  async delete() {
    const db = this.getDB();
    let items = db[this.table] || [];
    
    // Keep only records that do NOT match filters
    const deletedCount = items.length;
    items = items.filter((item: any) => !this.filters.every(filter => filter(item)));
    db[this.table] = items;
    this.saveDB(db);

    return { data: items, error: null };
  }

  // Enable thenable syntax for direct await call
  async then(resolve: any) {
    const db = this.getDB();
    let items = db[this.table] || [];

    // Filter
    for (const filter of this.filters) {
      items = items.filter(filter);
    }

    // Sort
    if (this.sortCol) {
      items = [...items].sort((a, b) => {
        const valA = a[this.sortCol!];
        const valB = b[this.sortCol!];
        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    if (this.isSingle) {
      resolve({ data: items[0] || null, error: null });
    } else {
      resolve({ data: items, error: null });
    }
  }
}

// Mock Supabase Auth Client
class MockAuthClient {
  private getSessionUser() {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("ipassa_mock_session_user");
    return userStr ? JSON.parse(userStr) : null;
  }

  private setSessionUser(user: any) {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("ipassa_mock_session_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("ipassa_mock_session_user");
      }
    }
  }

  async getSession() {
    const user = this.getSessionUser();
    if (user) {
      return { data: { session: { user, access_token: "mock-jwt-token" } }, error: null };
    }
    return { data: { session: null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }

  async signInWithPassword({ email }: { email: string }) {
    // Generate simple mock profile
    const name = email.split("@")[0];
    const role = email.includes("admin") ? "admin" : email.includes("teacher") ? "teacher" : "student";
    const user = {
      id: `mock-user-${name}`,
      email,
      user_metadata: { name, role, grade: "9", language: "English" }
    };
    
    this.setSessionUser(user);
    
    // Add to mock profiles DB if not present
    const dbStr = localStorage.getItem("ipassa_mock_db");
    const db = dbStr ? JSON.parse(dbStr) : {};
    if (!db.profiles) db.profiles = [];
    if (!db.profiles.find((p: any) => p.id === user.id)) {
      db.profiles.push({
        id: user.id,
        name: name.toUpperCase(),
        role,
        grade: "9",
        language: role === "student" ? "English" : "English"
      });
      localStorage.setItem("ipassa_mock_db", JSON.stringify(db));
    }

    // Trigger state change visually by refreshing page
    setTimeout(() => window.location.reload(), 100);

    return { data: { user, session: { user, access_token: "mock-jwt-token" } }, error: null };
  }

  async signUp({ email, options }: { email: string, options?: any }) {
    const meta = options?.data || {};
    const user = {
      id: `mock-user-${email.split("@")[0]}`,
      email,
      user_metadata: {
        name: meta.name || "Student Name",
        role: meta.role || "student",
        grade: meta.grade || "9",
        language: meta.language || "English"
      }
    };

    const dbStr = localStorage.getItem("ipassa_mock_db");
    const db = dbStr ? JSON.parse(dbStr) : {};
    if (!db.profiles) db.profiles = [];
    db.profiles.push({
      id: user.id,
      name: user.user_metadata.name,
      role: user.user_metadata.role,
      grade: user.user_metadata.grade,
      language: user.user_metadata.language
    });
    localStorage.setItem("ipassa_mock_db", JSON.stringify(db));

    return { data: { user }, error: null };
  }

  async signOut() {
    this.setSessionUser(null);
    setTimeout(() => window.location.reload(), 100);
    return { error: null };
  }
}

// Unified Mock Supabase Client Interceptor
const mockSupabase = {
  auth: new MockAuthClient(),
  from(table: string) {
    return new MockQueryBuilder(table);
  },
  rpc(fn: string, args: any) {
    // Handle RAG mock retrieval
    if (fn === "match_chunks") {
      const filter_subject = args.filter_subject;
      const dbStr = localStorage.getItem("ipassa_mock_db");
      const db = dbStr ? JSON.parse(dbStr) : {};
      const chunks = db.curriculum_chunks || [];
      
      const filtered = chunks.filter((c: any) => 
        c.subject.toLowerCase() === filter_subject.toLowerCase()
      ).map((c: any) => ({
        ...c,
        similarity: 0.85
      }));

      return Promise.resolve({ data: filtered, error: null });
    }
    return Promise.resolve({ data: [], error: null });
  }
};

// ================= DUAL CLIENT CONNECTOR =================
export const supabase = isRealConfigured 
  ? realSupabase 
  : (mockSupabase as any);

export const getSupabaseAdmin = () => {
  if (isRealConfigured) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return realSupabase;
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return mockSupabase as any;
};
