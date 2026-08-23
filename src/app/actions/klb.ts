"use server";

/**
 * KLB (Kenya Literature Bureau) library integration.
 *
 * When KLB_API_URL (and optionally KLB_API_KEY) are configured, resources are
 * fetched live from the KLB API. Until then, a curated built-in catalog of
 * KLB course books / revision materials is served so the library works out of
 * the box — every entry links to the official KLB source.
 *
 * Shape is normalized so the Resource Library page can render internal and
 * KLB materials side by side.
 */

export interface KLBResource {
  id: string;
  title: string;
  subject: string;
  level: string;
  type: "Course Book" | "Revision" | "Past Paper" | "Teacher Guide" | "Set Book";
  description: string;
  url: string;
  source: "klb";
}

const KLB_CATALOG_URL = "https://klb.co.ke";

const CATALOG: Omit<KLBResource, "source">[] = [
  // ── Secondary course books ──
  { id: "klb-math-f1", title: "KLB Secondary Mathematics Form 1", subject: "Mathematics", level: "Form 1", type: "Course Book", description: "The classic KLB maths course book — number theory, algebra, geometry and measurements with worked examples and exercises.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-math-f2", title: "KLB Secondary Mathematics Form 2", subject: "Mathematics", level: "Form 2", type: "Course Book", description: "Quadratics, sequences, trigonometry and statistics — the full Form 2 syllabus by KLB.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-math-f3", title: "KLB Secondary Mathematics Form 3", subject: "Mathematics", level: "Form 3", type: "Course Book", description: "Advanced algebra, circles, matrices and probability with revision exercises.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-math-f4", title: "KLB Secondary Mathematics Form 4", subject: "Mathematics", level: "Form 4", type: "Course Book", description: "Final-year KCSE maths — integration, differentiation, complex numbers and exam practice.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-phy-f3", title: "KLB Secondary Physics Form 3", subject: "Physics", level: "Form 3", type: "Course Book", description: "Linear motion, refraction, waves and electrostatics — practical-oriented KLB physics.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-phy-f4", title: "KLB Secondary Physics Form 4", subject: "Physics", level: "Form 4", type: "Course Book", description: "Thin lenses, photoelectric effect, radioactivity and electronics for KCSE.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-bio-f1", title: "KLB Secondary Biology Form 1", subject: "Biology", level: "Form 1", type: "Course Book", description: "Introduction to biology, cell physiology and classification with vivid illustrations.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-bio-f4", title: "KLB Secondary Biology Form 4", subject: "Biology", level: "Form 4", type: "Course Book", description: "Genetics, evolution, excretion and the full KCSE biology wrap-up.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-chem-f2", title: "KLB Secondary Chemistry Form 2", subject: "Chemistry", level: "Form 2", type: "Course Book", description: "Atomic structure, periodic table, ionic and covalent bonding — KLB's structured approach.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-chem-f4", title: "KLB Secondary Chemistry Form 4", subject: "Chemistry", level: "Form 4", type: "Course Book", description: "Organic chemistry, redox reactions, electrochemistry and radioactivity for KCSE.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },

  // ── Humanities & languages ──
  { id: "klb-eng-f3", title: "KLB Secondary English Form 3", subject: "English", level: "Form 3", type: "Course Book", description: "Comprehension, grammar, oral literature and writing skills aligned to KCSE.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-kis-f2", title: "KLB Kidagaa Kimemozzi (Kiswahili)", subject: "Kiswahili", level: "Form 3", type: "Set Book", description: "The definitive guide to the KCSE Kiswahili set book — analysis, themes and questions.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-hist-f2", title: "KLB Secondary History & Government Form 2", subject: "History", level: "Form 2", type: "Course Book", description: "Trade, transport, political developments and citizenship — KLB History Form 2.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-geo-f4", title: "KLB Secondary Geography Form 4", subject: "Geography", level: "Form 4", type: "Course Book", description: "Fieldwork, energy resources, industry and management of environment for KCSE.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-cre-f4", title: "KLB Secondary C.R.E. Form 4", subject: "C.R.E.", level: "Form 4", type: "Course Book", description: "Christian Religious Education — ethics, African heritage and contemporary issues.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },

  // ── Business & technical ──
  { id: "klb-bst-f3", title: "KLB Secondary Business Studies Form 3", subject: "Business Studies", level: "Form 3", type: "Course Book", description: "Demand and supply, product markets and business finance with local case studies.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },
  { id: "klb-agri-f2", title: "KLB Secondary Agriculture Form 2", subject: "Agriculture", level: "Form 2", type: "Course Book", description: "Livestock health, soil fertility and crop production — practical Kenyan agriculture.", url: `${KLB_CATALOG_URL}/product-category/secondary/` },

  // ── Revision & exams ──
  { id: "klb-kcse-math-rev", title: "KCSE Mathematics Revision", subject: "Mathematics", level: "Form 4", type: "Revision", description: "Topical revision questions and full KCSE past papers with marking-scheme style answers.", url: `${KLB_CATALOG_URL}/product-category/revision/` },
  { id: "klb-kcse-sci-rev", title: "KCSE Sciences Combined Revision", subject: "Sciences", level: "Form 4", type: "Revision", description: "Biology, Chemistry and Physics revision packs — condensed notes plus practice papers.", url: `${KLB_CATALOG_URL}/product-category/revision/` },
  { id: "klb-kcse-past-papers", title: "KCSE Past Papers Collection", subject: "All Subjects", level: "Form 4", type: "Past Paper", description: "Years of KCSE past papers across subjects — the ultimate exam practice bank.", url: `${KLB_CATALOG_URL}/product-category/revision/` },

  // ── CBC / primary ──
  { id: "klb-cbc-math-g7", title: "KLB Visionary Mathematics Grade 7 (CBC)", subject: "Mathematics", level: "Grade 7", type: "Course Book", description: "CBC junior secondary maths — numbers, algebra, geometry and data handling.", url: `${KLB_CATALOG_URL}/product-category/pre-primary-primary/` },
  { id: "klb-cbc-eng-g6", title: "KLB Visionary English Grade 6 (CBC)", subject: "English", level: "Grade 6", type: "Course Book", description: "Competency-based English with activities for reading, writing and speaking.", url: `${KLB_CATALOG_URL}/product-category/pre-primary-primary/` },
  { id: "klb-cbc-int-science-g8", title: "KLB Integrated Science Grade 8 (CBC)", subject: "Integrated Science", level: "Grade 8", type: "Course Book", description: "Junior secondary integrated science — mixtures, living things and energy (CBC).", url: `${KLB_CATALOG_URL}/product-category/pre-primary-primary/` },

  // ── Teacher guides ──
  { id: "klb-tg-math-f1", title: "KLB Mathematics Teacher's Guide Form 1", subject: "Mathematics", level: "Form 1", type: "Teacher Guide", description: "Schemes of work, lesson plans and answers for KLB Maths Form 1.", url: `${KLB_CATALOG_URL}/product-category/teachers-guides/` },
  { id: "klb-tg-eng-f2", title: "KLB English Teacher's Guide Form 2", subject: "English", level: "Form 2", type: "Teacher Guide", description: "Teaching notes, sample compositions and marking guidance for English Form 2.", url: `${KLB_CATALOG_URL}/product-category/teachers-guides/` },
];

const SUBJECTS = Array.from(new Set(CATALOG.map((r) => r.subject))).sort();
const TYPES = Array.from(new Set(CATALOG.map((r) => r.type))).sort();

export async function getKLBMeta(): Promise<{ subjects: string[]; types: string[]; live: boolean }> {
  return { subjects: SUBJECTS, types: TYPES, live: Boolean(process.env.KLB_API_URL) };
}

export async function fetchKLBResources(filters: {
  query?: string;
  subject?: string;
  type?: string;
}): Promise<{ items: KLBResource[]; live: boolean }> {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const subject = filters.subject && filters.subject !== "All" ? filters.subject : "";
  const type = filters.type && filters.type !== "All" ? filters.type : "";

  // Live KLB API mode — normalize whatever the endpoint returns.
  const apiUrl = process.env.KLB_API_URL;
  if (apiUrl) {
    try {
      const params = new URLSearchParams({ q: query, subject, type, limit: "40" });
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/resources?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          ...(process.env.KLB_API_KEY ? { Authorization: `Bearer ${process.env.KLB_API_KEY}` } : {}),
        },
        next: { revalidate: 600 },
      });
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data) ? data : (data.items ?? data.resources ?? []);
        const items: KLBResource[] = raw.map((r: Record<string, unknown>, i: number) => ({
          id: String(r.id ?? `klb-${i}`),
          title: String(r.title ?? r.name ?? "Untitled"),
          subject: String(r.subject ?? "General"),
          level: String(r.level ?? r.form ?? ""),
          type: (String(r.type ?? r.category ?? "Course Book") as KLBResource["type"]),
          description: String(r.description ?? r.summary ?? ""),
          url: String(r.url ?? r.download_url ?? r.link ?? KLB_CATALOG_URL),
          source: "klb",
        }));
        return { items, live: true };
      }
      console.warn(`[KLB] API responded ${res.status} — falling back to built-in catalog`);
    } catch (err) {
      console.warn("[KLB] API unreachable — falling back to built-in catalog:", err);
    }
  }

  // Built-in catalog mode
  const items: KLBResource[] = CATALOG.filter((r) => {
    if (subject && r.subject !== subject) return false;
    if (type && r.type !== type) return false;
    if (query) {
      const haystack = `${r.title} ${r.subject} ${r.description} ${r.level}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
  }).map((r) => ({ ...r, source: "klb" as const }));
  return { items, live: false };
}
