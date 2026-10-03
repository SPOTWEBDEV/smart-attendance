// app/admin/(panel)/students/page.tsx  -  search students, reset a linked phone
"use client";

import { useCallback, useEffect, useState } from "react";
import { fetcher, msg } from "@/lib/fetcher";

type Student = {
  id: string;
  matricNo: string;
  department: string;
  level: number;
  user: { fullName: string; email: string };
  device: { model: string | null; platform: string | null; createdAt: string } | null;
  _count: { enrollments: number };
};

export default function StudentsPage() {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (query: string) => {
    try {
      const data = await fetcher<{ students: Student[] }>(
        `/api/admin/students${query ? `?q=${encodeURIComponent(query)}` : ""}`
      );
      setStudents(data.students);
      setError("");
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // search as you type, with a small delay
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  async function resetDevice(s: Student) {
    if (!confirm(`Unlink the phone for ${s.user.fullName}? They will need to link a new phone before they can mark attendance.`)) return;
    setBusyId(s.id);
    setNotice("");
    try {
      await fetcher(`/api/admin/students/${s.id}/device`, { method: "DELETE" });
      setNotice(`${s.user.fullName}'s phone was unlinked. They can link a new one from the app.`);
      await load(q.trim());
    } catch (e) {
      alert(msg(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Students</h1>
      <p className="text-slate-500 mt-1 mb-6">Search students and unlink a lost or replaced phone.</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, matric number or email"
        className="w-full max-w-md h-11 px-3 mb-6 rounded-lg border border-slate-300 bg-white outline-none focus:border-[#681609] focus:ring-2 focus:ring-red-100"
      />

      {notice && <p className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3">{notice}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Matric no.</th>
              <th className="px-5 py-3 font-medium">Dept / level</th>
              <th className="px-5 py-3 font-medium">Courses</th>
              <th className="px-5 py-3 font-medium">Linked phone</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>}
            {!loading && students.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No students found.</td></tr>
            )}
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{s.user.fullName}</p>
                  <p className="text-slate-500">{s.user.email}</p>
                </td>
                <td className="px-5 py-3 text-slate-700">{s.matricNo}</td>
                <td className="px-5 py-3 text-slate-700">{s.department} · {s.level}L</td>
                <td className="px-5 py-3 text-slate-700">{s._count.enrollments}</td>
                <td className="px-5 py-3 text-slate-700">
                  {s.device ? (
                    <>
                      <p>{s.device.model ?? "Unknown phone"}{s.device.platform ? ` (${s.device.platform})` : ""}</p>
                      <p className="text-xs text-slate-400">linked {new Date(s.device.createdAt).toLocaleDateString()}</p>
                    </>
                  ) : (
                    <span className="text-amber-600 font-medium">None, ready to link</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {s.device && (
                    <button
                      onClick={() => resetDevice(s)}
                      disabled={busyId === s.id}
                      className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {busyId === s.id ? "Working..." : "Reset phone"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
