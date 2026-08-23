// Central subject registry for all grades
// This is the single source of truth used by tutor, exams, admin, and API routes

export const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  "6": [
    "Afaan Oromo",
    "Barnoota Safuu",
    "Afaan Ingiliffaa",
    "FJQ",
    "Gada",
    "Herrega",
    "Og-Aartiiwwan",
    "Saayinsii",
  ],
  "8": [
    "Afaan Amaharaa",
    "Afaan Oromo",
    "Herrega",
    "Saayinsii",
    "Hawaasummaa",
    "Afaan Ingiliffaa",
    "FJQ",
    "IT",
    "Lammummaa",
    "Og-Aartiiwwan",
  ],
  "12": [
    "Mathematics",
    "Physics",
    "English",
    "Biology",
    "Chemistry",
    "IT",
    "Geography",
    "History",
    "Economics",
    "Agriculture",
  ],
};

export const LANGUAGE_BY_GRADE: Record<string, string> = {
  "6": "Afaan Oromo",
  "8": "Afaan Oromo",
  "12": "English",
};

/** Returns the subject list for a given grade. Falls back to Grade 12 list. */
export function getSubjectsForGrade(grade: string | null | undefined): string[] {
  return SUBJECTS_BY_GRADE[grade ?? "12"] ?? SUBJECTS_BY_GRADE["12"];
}

/** Returns the instruction language for a given grade. */
export function getLanguageForGrade(grade: string | null | undefined): string {
  return LANGUAGE_BY_GRADE[grade ?? "12"] ?? "English";
}

/** Returns the active grade for a user based on their role */
export function getActiveGrade(user: { role: string; grade: string | null; grade_taught: string | null } | null): string {
  if (!user) return "12";
  if (user.role === "teacher") return user.grade_taught ?? user.grade ?? "12";
  return user.grade ?? "12";
}

/** Returns whether a user can access a specific grade */
export function canAccessGrade(user: { role: string; grade: string | null; grade_taught: string | null } | null, grade: string): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "director") return true;
  return getActiveGrade(user) === grade;
}
