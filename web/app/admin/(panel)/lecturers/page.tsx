// app/admin/(panel)/lecturers/page.tsx  -  add lecturers, activate/deactivate
"use client";

import { useCallback, useEffect, useState } from "react";
import { fetcher, msg } from "@/lib/fetcher";

type Lecturer = {
  id: string;
  staffId: string;
  department: string;
  user: { id: string; fullName: string; email: string; isActive: boolean };
  _count: { courses: number };
};

const empty = { fullName: "", email: "", staffId: "", department: "", password: "" };

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetcher<{ lecturers: Lecturer[] }>("/api/admin/lecturers");
      setLecturers(data.lecturers);
      setError("");
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      await fetcher("/api/admin/lecturers", { method: "POST", body: JSON.stringify(form) });
      setCreated({ email: form.email, password: form.password });
      setForm(empty);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(msg(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(l: Lecturer) {
    const next = !l.user.isActive;
    if (!next && !confirm(`Deactivate ${l.user.fullName}? They will be signed out and unable to log in.`)) return;
    try {
      await fetcher(`/api/admin/lecturers/${l.id}`, { method: "PATCH", body: JSON.stringify({ isActive: next }) });
      await load();
    } catch (err) {
      alert(msg(err));
    }
  }

  const input =
    "w-full h-11 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#681609] focus:ring-2 focus:ring-red-100";

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lecturers</h1>
          <p className="text-slate-500 mt-1">Lecturers can only be added here by an admin.</p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setCreated(null); }}
          className="px-4 py-2.5 rounded-lg bg-[#681609] text-white text-sm font-semibold hover:bg-[#4d1006] whitespace-nowrap"
        >
          {showForm ? "Cancel" : "Add lecturer"}
        </button>
      </div>

      {created && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
          <p className="font-semibold">Lecturer added. Share these login details with them:</p>
          <p className="mt-2">Email: <span className="font-mono">{created.email}</span></p>
          <p>Password: <span className="font-mono">{created.password}</span></p>
          <p className="mt-2 text-green-800">This password is not shown again.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={onCreate} className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input required className={input} value={form.fullName} onChange={set("fullName")} placeholder="Dr. Ade Bello" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input required type="email" className={input} value={form.email} onChange={set("email")} placeholder="ade@school.edu" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Staff ID</label>
            <input required className={input} value={form.staffId} onChange={set("staffId")} placeholder="STF001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <input required className={input} value={form.department} onChange={set("department")} placeholder="Computer Engineering" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Starting password</label>
            <div className="flex gap-2">
              <input required minLength={8} className={input + " font-mono"} value={form.password} onChange={set("password")} placeholder="At least 8 characters" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, password: randomPassword() }))}
                className="px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </div>
          {formError && <p className="md:col-span-2 text-sm text-red-600">{formError}</p>}
          <div className="md:col-span-2">
            <button disabled={saving} className="px-5 py-2.5 rounded-lg bg-[#681609] text-white text-sm font-semibold hover:bg-[#4d1006] disabled:opacity-60">
              {saving ? "Saving..." : "Create lecturer"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Staff ID</th>
              <th className="px-5 py-3 font-medium">Department</th>
              <th className="px-5 py-3 font-medium">Courses</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
            )}
            {!loading && lecturers.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No lecturers yet.</td></tr>
            )}
            {lecturers.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{l.user.fullName}</p>
                  <p className="text-slate-500">{l.user.email}</p>
                </td>
                <td className="px-5 py-3 text-slate-700">{l.staffId}</td>
                <td className="px-5 py-3 text-slate-700">{l.department}</td>
                <td className="px-5 py-3 text-slate-700">{l._count.courses}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${l.user.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                    {l.user.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => toggle(l)} className="text-sm font-semibold text-[#681609] hover:underline">
                    {l.user.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
