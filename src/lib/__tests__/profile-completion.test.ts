import { describe, it, expect } from "vitest";

import { sanitizeNextPath, authErrorMessage } from "@/lib/google-auth";
import {
  getProfileStatus,
  isProfileComplete,
  isShellUsable,
  profileFieldLabel,
  resolveProfileKind,
} from "@/lib/profile-completion";

const completeStudent = {
  name: "Amina",
  role: "STUDENT",
  educationLevel: "HIGH_SCHOOL",
  curriculum: "8-4-4",
  formYear: 3,
  county: "Nairobi",
  studentProfile: {
    subjects: ["Mathematics"],
    weakTopics: ["Algebra"],
    studyStyle: "visual",
  },
};

describe("sanitizeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/dashboard/settings?tab=profile")).toBe(
      "/dashboard/settings?tab=profile",
    );
  });

  it("defaults to /dashboard when missing", () => {
    expect(sanitizeNextPath(null)).toBe("/dashboard");
    expect(sanitizeNextPath(undefined)).toBe("/dashboard");
    expect(sanitizeNextPath("")).toBe("/dashboard");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    // new URL(value, base) would treat all of these as off-site origins.
    expect(sanitizeNextPath("https://evil.example")).toBe("/dashboard");
    expect(sanitizeNextPath("//evil.example")).toBe("/dashboard");
    expect(sanitizeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects header-splitting attempts", () => {
    expect(sanitizeNextPath("/dashboard\nSet-Cookie: a=b")).toBe("/dashboard");
    expect(sanitizeNextPath("/dashboard\r\nLocation: https://evil.example")).toBe(
      "/dashboard",
    );
  });
});

describe("authErrorMessage", () => {
  it("maps known Supabase error codes", () => {
    expect(authErrorMessage("access_denied")).toContain("cancelled");
    expect(authErrorMessage("exchange_code_failed")).toBeTruthy();
    expect(authErrorMessage("oauth_provider_not_supported")).toContain("isn't enabled");
  });

  it("returns null for unknown or missing codes so no raw error leaks to the UI", () => {
    expect(authErrorMessage("something_weird")).toBeNull();
    expect(authErrorMessage(null)).toBeNull();
  });
});

describe("resolveProfileKind", () => {
  it("treats admin-family roles as staff", () => {
    expect(resolveProfileKind({ role: "ADMIN" })).toBe("STAFF");
    expect(resolveProfileKind({ role: "FOUNDER" })).toBe("STAFF");
    expect(resolveProfileKind({ role: "founder" })).toBe("STAFF");
  });

  it("defaults to student", () => {
    expect(resolveProfileKind({ role: "STUDENT" })).toBe("STUDENT");
    expect(resolveProfileKind({ role: undefined })).toBe("STUDENT");
  });
});

describe("getProfileStatus", () => {
  it("marks a fully populated student complete", () => {
    const status = getProfileStatus(completeStudent);
    expect(status.isComplete).toBe(true);
    expect(status.percent).toBe(100);
    expect(status.missing).toEqual([]);
  });

  it("does not treat a stub profile row as complete", () => {
    // This is the row updateUserRole creates. The old truthy-object gate
    // accepted it, so a brand-new account looked onboarded while being empty.
    const status = getProfileStatus({
      name: "Amina",
      role: "STUDENT",
      educationLevel: "HIGH_SCHOOL",
      curriculum: "8-4-4",
      county: "Nairobi",
      studentProfile: { subjects: [], weakTopics: [], studyStyle: "" },
    });
    expect(status.isComplete).toBe(false);
    expect(status.missing).toEqual(
      expect.arrayContaining(["formYear", "subjects", "weakTopics", "studyStyle"]),
    );
  });

  it("lists every missing field for an untouched account", () => {
    const status = getProfileStatus({ role: "STUDENT" });
    expect(status.isComplete).toBe(false);
    expect(status.percent).toBe(0);
    expect(status.missing).toHaveLength(8);
  });

  it("always reports staff as complete", () => {
    const status = getProfileStatus({ role: "ADMIN" });
    expect(status.isComplete).toBe(true);
    expect(status.percent).toBe(100);
  });

  it("requires a 30-character tutor bio", () => {
    const base = {
      name: "Brian",
      role: "TUTOR",
      tutorProfile: {
        bio: "Too short",
        subjects: ["Physics"],
        levelsTaught: ["Form 3"],
        hourlyRate: 500,
        mpesaNumber: "0712345678",
      },
      tutorApplication: { status: "PENDING", idPhotoUrl: "a", selfieUrl: "b" },
    };
    expect(getProfileStatus(base).missing).toContain("bio");

    const long = { ...base, tutorProfile: { ...base.tutorProfile, bio: "x".repeat(30) } };
    expect(getProfileStatus(long).isComplete).toBe(true);
  });

  it("accepts a reviewed tutor application as documented", () => {
    // A tutor cannot upload anything further once an admin has ruled; nagging
    // them forever would be wrong.
    const status = getProfileStatus({
      name: "Brian",
      role: "TUTOR",
      tutorProfile: {
        bio: "x".repeat(30),
        subjects: ["Physics"],
        levelsTaught: ["Form 3"],
        hourlyRate: 500,
        mpesaNumber: "0712345678",
      },
      tutorApplication: { status: "APPROVED" },
    });
    expect(status.isComplete).toBe(true);
  });

  it("requires both KYC documents while an application is still pending", () => {
    const base = {
      name: "Brian",
      role: "TUTOR",
      tutorProfile: {
        bio: "x".repeat(30),
        subjects: ["Physics"],
        levelsTaught: ["Form 3"],
        hourlyRate: 500,
        mpesaNumber: "0712345678",
      },
    };
    expect(
      getProfileStatus({
        ...base,
        tutorApplication: { status: "PENDING", idPhotoUrl: "a" },
      }).missing,
    ).toContain("kycDocuments");

    expect(
      getProfileStatus({
        ...base,
        tutorApplication: { status: "PENDING", idPhotoUrl: "a", selfieUrl: "b" },
      }).isComplete,
    ).toBe(true);
  });

  it("points tutors at tutor settings and students at dashboard settings", () => {
    expect(getProfileStatus({ role: "TUTOR" }).resumePath).toBe("/tutor/settings");
    expect(getProfileStatus({ role: "STUDENT" }).resumePath).toBe("/dashboard/settings");
  });
});

describe("isShellUsable", () => {
  it("is false with no profile row, which is what triggers the onboarding redirect", () => {
    expect(isShellUsable({ role: "STUDENT" })).toBe(false);
  });

  it("is true as soon as a profile row exists, even an empty one", () => {
    // Deliberately looser than isProfileComplete: the dashboard needs to render
    // so the user can reach settings and finish. Completeness is a separate,
    // non-blocking concern.
    expect(
      isShellUsable({
        role: "STUDENT",
        studentProfile: { subjects: [], weakTopics: [], studyStyle: "" },
      }),
    ).toBe(true);
  });

  it("is true for staff with no profile at all", () => {
    expect(isShellUsable({ role: "FOUNDER" })).toBe(true);
  });
});

describe("isProfileComplete", () => {
  it("is false for the loop-inducing TUTOR-with-no-profile case", () => {
    // Guards the regression that produced the /dashboard <-> /onboarding/choice
    // infinite redirect loop.
    expect(isProfileComplete({ role: "TUTOR" })).toBe(false);
  });
});

describe("profileFieldLabel", () => {
  it("returns a human label for every known field", () => {
    expect(profileFieldLabel("weakTopics")).toBe("Topics you find difficult");
    expect(profileFieldLabel("kycDocuments")).toBe("ID photo and selfie");
  });
});
