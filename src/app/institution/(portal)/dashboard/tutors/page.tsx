import { requireInstitutionAdmin } from "@/app/actions/institution-guard";
import { getInstitutionTutors } from "@/app/actions/institution-data";

export default async function TutorsPage() {
  const membership = await requireInstitutionAdmin();
  const tutors = await getInstitutionTutors(membership.institution.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">People</p>
        <h1 className="text-2xl font-black text-gray-900">Tutors</h1>
        <p className="text-sm text-gray-500">View tutors associated with your institution.</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {tutors.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No tutors linked to your institution yet.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="p-4 font-bold text-gray-600">Name</th>
                <th className="p-4 font-bold text-gray-600">Email</th>
                <th className="p-4 font-bold text-gray-600">Subjects</th>
                <th className="p-4 font-bold text-gray-600">Rating</th>
                <th className="p-4 font-bold text-gray-600">Status</th>
                <th className="p-4 font-bold text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tutors.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{t.name}</td>
                  <td className="p-4 text-gray-500">{t.email}</td>
                  <td className="p-4 text-gray-500">{t.subjects.join(", ") || "-"}</td>
                  <td className="p-4 text-gray-500">{t.rating > 0 ? `${t.rating.toFixed(1)}` : "-"}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      t.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{t.joinedAt.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
