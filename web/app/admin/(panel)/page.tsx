// app/admin/(panel)/page.tsx  -  overview
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetcher, msg } from "@/lib/fetcher";

type Stats = {
  students: number;
  lecturers: number;
  courses: number;
  sessions: number;
  openSessions: number;
  attendanceToday: number;
};

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetcher<Stats>("/api/admin/stats").then(setStats).catch((e) => setError(msg(e)));
  }, []);

  const cards = stats && [
    { label: "Students", value: stats.students },
    { label: "Lecturers", value: stats.lecturers },
    { label: "Courses", value: stats.courses },
    { label: "Classes held", value: stats.sessions },
    { label: "Classes open now", value: stats.openSessions },
    { label: "Marked today", value: stats.attendanceToday },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
      <p className="text-slate-500 mt-1 mb-8">What is happening across the school.</p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards
          ? cards.map((c) => (
              <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{c.value}</p>
              </div>
            ))
          : Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-24 animate-pulse" />
            ))}
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mt-10 mb-3">Quick actions</h2>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/lecturers" className="px-4 py-2.5 rounded-lg bg-[#681609] text-white text-sm font-semibold hover:bg-[#4d1006]">
          Add a lecturer
        </Link>
        <Link href="/admin/students" className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Reset a student's phone
        </Link>
        <Link href="/admin/reports" className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          View attendance reports
        </Link>
      </div>
    </div>
  );
}
