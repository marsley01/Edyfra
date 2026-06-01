export const EDUCATIONAL_SUBJECTS: Record<string, string[]> = {
  HIGH_SCHOOL: [
    "Mathematics",
    "Biology",
    "Chemistry",
    "Physics",
    "English",
    "Kiswahili",
    "History",
    "Geography",
    "CRE",
    "Agriculture",
    "Business Studies",
    "Computer Studies",
  ],
  UNIVERSITY: [
    "Computer Science & IT",
    "Engineering (All Branches)",
    "Medicine & Health Sciences",
    "Law & Legal Studies",
    "Business & Economics",
    "Mathematics & Statistics",
    "Natural Sciences",
    "Social Sciences & Humanities",
    "Education & Arts",
    "Accounting & Finance",
  ],
};

export const getSubjectsByLevel = (level: string) => {
  if (level?.includes("UNIVERSITY")) return EDUCATIONAL_SUBJECTS.UNIVERSITY;
  return EDUCATIONAL_SUBJECTS.HIGH_SCHOOL;
};
