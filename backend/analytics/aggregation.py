"""
Heavy analytics aggregation for the institution dashboard.

Port of the JS in-memory aggregation from institution-admin.ts.
Uses pandas for ~10x faster grouping/aggregation at scale.
"""

from datetime import datetime
from typing import Any

import pandas as pd

from db import query, query_one


async def institution_overview(institution_id: str) -> dict[str, Any]:
    counts = await query_one(
        """
        SELECT
          (SELECT COUNT(*) FROM "InstitutionMember" WHERE "institutionId" = $1 AND role = 'STUDENT') AS students,
          (SELECT COUNT(*) FROM "InstitutionMember" WHERE "institutionId" = $1 AND role = 'TEACHER') AS teachers,
          (SELECT COUNT(*) FROM "CoachingAssignment" WHERE "institutionId" = $1 AND status = 'ACTIVE') AS coaching
        """,
        institution_id,
    ) or {"students": 0, "teachers": 0, "coaching": 0}

    results = await query(
        """
        SELECT sra.*
        FROM "StudentResultsAnalysis" sra
        JOIN "InstitutionMember" im ON im."userId" = sra."studentUserId"
        WHERE im."institutionId" = $1
        ORDER BY sra."createdAt" DESC
        LIMIT 500
        """,
        institution_id,
    )

    avg_performance = 0.0
    if results:
        df = pd.DataFrame(results)
        if "marks" in df.columns:
            avg_performance = round(float(df["marks"].mean()), 1)

    return {
        "totalStudents": counts["students"],
        "totalTeachers": counts["teachers"],
        "activeCoaching": counts["coaching"],
        "avgPerformance": avg_performance,
        "resultsAnalyzed": len(results),
    }


async def performance_trend(institution_id: str) -> list[dict[str, Any]]:
    rows = await query(
        """
        SELECT sra.subject, sra.term, sra.year, sra.marks
        FROM "StudentResultsAnalysis" sra
        JOIN "InstitutionMember" im ON im."userId" = sra."studentUserId"
        WHERE im."institutionId" = $1
        """,
        institution_id,
    )

    if not rows:
        return []

    df = pd.DataFrame(rows)
    grouped = df.groupby(["subject", "term", "year"], as_index=False)["marks"].mean()
    grouped["marks"] = grouped["marks"].round(1)
    return grouped.to_dict(orient="records")


async def flagged_students(
    institution_id: str,
    term: str,
    year: int,
    threshold: float = 50.0,
) -> list[dict[str, Any]]:
    students = await query(
        """
        SELECT sra."studentUserId", u.name, u.email, AVG(sra.marks) as avg_mark
        FROM "StudentResultsAnalysis" sra
        JOIN "User" u ON u.id = sra."studentUserId"
        JOIN "InstitutionMember" im ON im."userId" = sra."studentUserId"
        WHERE im."institutionId" = $1
          AND sra.term = $2
          AND sra.year = $3
        GROUP BY sra."studentUserId", u.name, u.email
        HAVING AVG(sra.marks) < $4
        ORDER BY avg_mark ASC
        """,
        institution_id, term, year, threshold,
    )

    return [
        {
            "userId": s["studentUserId"],
            "name": s["name"],
            "email": s["email"],
            "avgMark": round(float(s["avg_mark"]), 1),
        }
        for s in students
    ]


async def student_full_profile(
    institution_id: str,
    student_user_id: str,
) -> dict[str, Any]:
    user = await query_one(
        'SELECT * FROM "User" WHERE id = $1',
        student_user_id,
    )
    member = await query_one(
        'SELECT * FROM "InstitutionMember" WHERE "userId" = $1 AND "institutionId" = $2',
        student_user_id, institution_id,
    )
    current_term = await query_one(
        'SELECT * FROM "AcademicTerm" WHERE "institutionId" = $1 AND status = \'ACTIVE\'',
        institution_id,
    )

    sessions = await query(
        """
        SELECT * FROM "Session"
        WHERE "studentId" = $1 AND status = 'COMPLETED'
        ORDER BY "startedAt" DESC
        LIMIT 20
        """,
        student_user_id,
    )

    results = await query(
        'SELECT * FROM "StudentResult" WHERE "studentUserId" = $1 ORDER BY year DESC, term DESC',
        student_user_id,
    )
    analyses = await query(
        'SELECT * FROM "StudentResultsAnalysis" WHERE "studentUserId" = $1 ORDER BY "createdAt" DESC',
        student_user_id,
    )

    coaching = await query(
        'SELECT * FROM "CoachingAssignment" WHERE "studentUserId" = $1 AND "institutionId" = $2',
        student_user_id, institution_id,
    )

    return {
        "user": user,
        "member": member,
        "currentTerm": current_term,
        "sessions": sessions,
        "results": results,
        "analyses": analyses,
        "coaching": coaching,
    }
