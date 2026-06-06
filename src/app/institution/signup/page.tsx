import { KENYA_COUNTIES } from "@/lib/kenya-counties";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Apply — Edyfra Institutions",
  description: "Bring your school onto Edyfra Institutions.",
};

export default function InstitutionSignupPage() {
  const counties = KENYA_COUNTIES.map((c) => ({ name: c.name, subCounties: c.subCounties }));
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 py-12">
      <SignupForm counties={counties} />
    </div>
  );
}
