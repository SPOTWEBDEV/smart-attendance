// app/admin/(panel)/reports/page.tsx  -  attendance report per course, export CSV or print
"use client";

import { useEffect, useMemo, useState } from "react";
import { fetcher, msg } from "@/lib/fetcher";

type CourseOption = {
  id: string;
  code: string;
  title: string;
  lecturer: { user: { fullName: string } };
  _count: { enrollments: number; sessions: number };
};

type Report = {
  course: { id: string; code: string; title: string };
  lecturerName: string;
  totalSessions: number;
  minPercent: number;
  students: { studentId: string; matricNo: string; fullName: string; attended: number; percent: number; belowMinimum: boolean }[];
};

// Stops spreadsheet formulas ("=...", "+...") in names from running when the CSV is opened in Excel
function csvCell(value: string | number) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export default function ReportsPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [onlyBelow, setOnlyBelow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetcher<{ courses: CourseOption[] }>("/api/courses")
      .then((d) => setCourses(d.courses))
      .catch((e) => setError(msg(e)));
  }, []);

  useEffect(() => {
    if (!courseId) { setReport(null); return; }
    setLoading(true);
    setError("");
    fetcher<Report>(`/api/courses/${courseId}/summary`)
      .then(setReport)
      .catch((e) => setError(msg(e)))
      .finally(() => setLoading(false));
  }, [courseId]);

  const rows = useMemo(
    () => (report ? report.students.filter((s) => !onlyBelow || s.belowMinimum) : []),
    [report, onlyBelow]
  );

  const stats = useMemo(() => {
    if (!report || report.students.length === 0) return null;
    const avg = Math.round(report.students.reduce((sum, s) => sum + s.percent, 0) / report.students.length);
    return { avg, below: report.students.filter((s) => s.belowMinimum).length };
  }, [report]);

  function exportCsv() {
    if (!report) return;
    const header = ["Matric No", "Name", "Attended", "Total Sessions", "Percentage", "Status"];
    const lines = rows.map((s) => [
      s.matricNo,
      s.fullName,
      s.attended,
      report.totalSessions,
      `${s.percent}%`,
      s.belowMinimum ? `Below ${report.minPercent}%` : "OK",
    ]);
    const csv = [header, ...lines].map((r) => r.map(csvCell).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.course.code.replace(/\s+/g, "-")}-attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Attendance reports</h1>
        <p className="text-slate-500 mt-1 mb-6">Pick a course to see every student's attendance.</p>

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full max-w-md h-11 px-3 rounded-lg border border-slate-300 bg-white outline-none focus:border-[#681609]"
        >
          <option value="">Select a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.title} ({c.lecturer.user.fullName})
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}
      {loading && <p className="text-slate-400 mt-6">Loading report...</p>}

      {report && !loading && (
        <div className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">{report.course.code} · {report.course.title}</h2>
            <p className="text-slate-500 text-sm">
              Lecturer: {report.lecturerName} · {report.totalSessions} sessions held · Minimum {report.minPercent}%
            </p>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-sm text-slate-500">Students</p>
                <p className="text-2xl font-bold text-slate-900">{report.students.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-sm text-slate-500">Average attendance</p>
                <p className="text-2xl font-bold text-slate-900">{stats.avg}%</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="text-sm text-slate-500">Below minimum</p>
                <p className={`text-2xl font-bold ${stats.below ? "text-red-600" : "text-slate-900"}`}>{stats.below}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={onlyBelow} onChange={(e) => setOnlyBelow(e.target.checked)} />
              Show only students below {report.minPercent}%
            </label>
            <div className="flex gap-2">
              <button onClick={exportCsv} className="px-4 py-2 rounded-lg bg-[#681609] text-white text-sm font-semibold hover:bg-[#4d1006]">
                Export CSV
              </button>
              <button onClick={() => window.print()} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Print / Save as PDF
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="px-5 py-3 font-medium">Matric no.</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Attended</th>
                  <th className="px-5 py-3 font-medium w-56">Attendance</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No students to show.</td></tr>
                )}
                {rows.map((s) => (
                  <tr key={s.studentId} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-700">{s.matricNo}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{s.fullName}</td>
                    <td className="px-5 py-3 text-slate-700">{s.attended} / {report.totalSessions}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${s.belowMinimum ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${s.percent}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-slate-700">{s.percent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.belowMinimum ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {s.belowMinimum ? "Below minimum" : "OK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
