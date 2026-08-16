from fastapi import APIRouter, Request, HTTPException
from utils.cache import cache
from models.responses import StandardResponse, ResponseMeta

router = APIRouter(prefix="/v1/subjects", tags=["Subjects"])

# Static mapping representing subjects data structured from TS subjects
JUNIOR_SCHOOL_SUBJECTS = [
    {"code": "JS_MATH", "name": "Mathematics", "level": "Junior School", "description": "Core Junior School mathematics covering basic algebra, geometry, and arithmetic."},
    {"code": "JS_ENG", "name": "English Language", "level": "Junior School", "description": "English language skills, grammar, comprehension, and vocabulary."},
    {"code": "JS_KISW", "name": "Kiswahili", "level": "Junior School", "description": "Kiswahili grammar, composition, and comprehension."},
    {"code": "JS_SCI", "name": "Integrated Science", "level": "Junior School", "description": "Introduction to biology, chemistry, physics, and ecology concepts."},
    {"code": "JS_SOC", "name": "Social Studies", "level": "Junior School", "description": "Junior School history, geography, and civic studies."},
    {"code": "JS_COMP", "name": "Computer Studies", "level": "Junior School", "description": "Introduction to computer systems, typing, and digital literacy."},
]

SENIOR_SCHOOL_SUBJECTS = [
    {"code": "SS_MATH", "name": "Mathematics", "level": "Senior School", "description": "Advanced mathematics, calculus, trigonometry, and statistics."},
    {"code": "SS_ENG", "name": "English Language", "level": "Senior School", "description": "English composition, functional writing, and comprehension."},
    {"code": "SS_KISW", "name": "Kiswahili", "level": "Senior School", "description": "Advanced Kiswahili grammar and literature studies."},
    {"code": "SS_BIO", "name": "Biology", "level": "Senior School", "description": "Study of living organisms, cells, ecology, genetics, and anatomy."},
    {"code": "SS_CHEM", "name": "Chemistry", "level": "Senior School", "description": "Study of substances, chemical reactions, structure, and bonding."},
    {"code": "SS_PHYS", "name": "Physics", "level": "Senior School", "description": "Study of matter, energy, mechanics, waves, and electricity."},
    {"code": "SS_HIST", "name": "History and Government", "level": "Senior School", "description": "World history, Kenyan history, constitution, and governance."},
    {"code": "SS_GEOG", "name": "Geography", "level": "Senior School", "description": "Physical, human, and practical geography."},
    {"code": "SS_COMP", "name": "Computer Studies", "level": "Senior School", "description": "Programming fundamentals, systems development, databases, and networks."},
    {"code": "SS_BUS", "name": "Business Studies", "level": "Senior School", "description": "Introduction to business, accounting, commerce, and entrepreneurship."},
]

UNIVERSITY_SUBJECTS = [
    {"code": "UNIV_CALC", "name": "Calculus and Analysis", "level": "University", "description": "Limits, derivatives, integrals, sequences, and series."},
    {"code": "UNIV_LALG", "name": "Linear Algebra", "level": "University", "description": "Vector spaces, matrices, linear transformations, and eigenvalues."},
    {"code": "UNIV_CS", "name": "Computer Science Fundamentals", "level": "University", "description": "Foundations of computer systems, logic gates, and computing theory."},
    {"code": "UNIV_PY", "name": "Programming — Python", "level": "University", "description": "Python syntax, OOP, standard libraries, and algorithm design."},
    {"code": "UNIV_DSA", "name": "Data Structures and Algorithms", "level": "University", "description": "Arrays, lists, trees, graphs, sorting, searching, and complexity analysis."},
    {"code": "UNIV_DBMS", "name": "Database Management Systems", "level": "University", "description": "Relational algebra, SQL, database design, normalization, and indexing."},
]

FLAT_SUBJECTS = JUNIOR_SCHOOL_SUBJECTS + SENIOR_SCHOOL_SUBJECTS + UNIVERSITY_SUBJECTS

@router.get("", response_model=StandardResponse)
async def get_subjects(request: Request):
    """
    Returns the full CBC subject list organized by education levels.
    Scope required: subjects.read
    """
    cached_data = cache.get("subjects_list")
    if cached_data:
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=cached_data,
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
        
    res_data = {
        "Junior School": JUNIOR_SCHOOL_SUBJECTS,
        "Senior School": SENIOR_SCHOOL_SUBJECTS,
        "University": UNIVERSITY_SUBJECTS
    }
    
    cache.set("subjects_list", res_data, 86400)
    
    rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
    return StandardResponse(
        data=res_data,
        meta=ResponseMeta(rate_limit_remaining=rate_remaining)
    )

@router.get("/{subject_id}/topics", response_model=StandardResponse)
async def get_subject_topics(subject_id: str, request: Request):
    """
    Returns all topics under a subject.
    Scope required: subjects.read
    """
    cache_key = f"topics_{subject_id}"
    cached_topics = cache.get(cache_key)
    if cached_topics:
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=cached_topics,
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )

    subject_code = subject_id.upper()
    subject = next((s for s in FLAT_SUBJECTS if s["code"] == subject_code), None)
    if not subject:
        subject = next((s for s in FLAT_SUBJECTS if s["name"].upper() == subject_code), None)
        
    if not subject:
        raise HTTPException(status_code=404, detail=f"Subject '{subject_id}' not found.")
        
    subject_name = subject["name"]
    
    if "Mathematics" in subject_name or "Calculus" in subject_name or "Algebra" in subject_name:
        topics = [
            {"id": "topic_1", "name": "Algebraic Expressions", "description": "Formulating and simplifying equations."},
            {"id": "topic_2", "name": "Calculus Foundations", "description": "Introduction to derivatives, integrals, and limits."},
            {"id": "topic_3", "name": "Coordinate Geometry", "description": "Graphs, straight lines, circles, and intersections."}
        ]
    elif "Science" in subject_name or "Biology" in subject_name or "Chemistry" in subject_name or "Physics" in subject_name:
        topics = [
            {"id": "topic_1", "name": "Scientific Inquiry", "description": "Hypothesis testing and lab safety rules."},
            {"id": "topic_2", "name": "Classification of Substances", "description": "Grouping matter based on physical and chemical attributes."},
            {"id": "topic_3", "name": "Forces and Motion", "description": "Newton's laws, speed, acceleration, and momentum."}
        ]
    elif "Computer" in subject_name or "Programming" in subject_name or "Structures" in subject_name:
        topics = [
            {"id": "topic_1", "name": "Introduction to Algorithms", "description": "Flowcharts, pseudocode, and complexity analysis."},
            {"id": "topic_2", "name": "Control Flow and Loops", "description": "Conditionals, iteration, recursion, and branching."},
            {"id": "topic_3", "name": "Data Operations", "description": "Storing, retrieving, and manipulating structured objects."}
        ]
    else:
        topics = [
            {"id": "topic_1", "name": "Introduction and History", "description": f"Core concepts and foundational history of {subject_name}."},
            {"id": "topic_2", "name": "Practical Applications", "description": f"Real-world use cases and practices of {subject_name}."},
            {"id": "topic_3", "name": "Review and Assessment", "description": f"Comprehensive study review for {subject_name} topics."}
        ]
        
    cache.set(cache_key, topics, 86400)
    
    rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
    return StandardResponse(
        data=topics,
        meta=ResponseMeta(rate_limit_remaining=rate_remaining)
    )
