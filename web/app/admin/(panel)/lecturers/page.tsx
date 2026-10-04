// app/admin/(panel)/lecturers/page.tsx  -  add, edit, reset password, deactivate, delete lecturers
"use client";

import { useCallback, useEffect, useState } from "react";
import { fetcher, msg } from "@/lib/fetcher";

type Lecturer = {
  id: string;
  staffId: string;
  department: string;
  user: { id: string; fullName: string; email: string; isActive: boolean; mustChangePassword: boolean };
  _count: { courses: number };
};

type Notice = { title: string; email: string; staffId?: string; password: string };

const input =
  "w-full h-11 px-3 rounded-lg border border-slate-300 outline-none focus:border-[#681609] focus:ring-2 focus:ring-red-100";

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);

  // add form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", department: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // edit dialog
  const [editing, setEditing] = useState<Lecturer | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", department: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const data = await fetcher<{
        lecturer: { email: string; lecturer: { staffId: string } };
        startingPassword: string;
      }>("/api/admin/lecturers", { method: "POST", body: JSON.stringify(form) });

      setNotice({
        title: "Lecturer added. Share these sign-in details with them:",
        email: data.lecturer.email,
        staffId: data.lecturer.lecturer.staffId,
        password: data.startingPassword,
      });
      setForm({ fullName: "", email: "", department: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(msg(err));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(l: Lecturer) {
    setEditing(l);
    setEditForm({ fullName: l.user.fullName, email: l.user.email, department: l.department });
    setEditError("");
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError("");
    setEditSaving(true);
    try {
      const data = await fetcher<{ startingPassword?: string }>(`/api/admin/lecturers/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      // If the email changed before the lecturer ever signed in, their starting password changed too
      if (data.startingPassword) {
        setNotice({
          title: "Email updated. Their starting password was updated to match:",
          email: editForm.email,
          password: data.startingPassword,
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setEditError(msg(err));
    } finally {
      setEditSaving(false);
    }
  }

  async function resetPassword(l: Lecturer) {
    if (!confirm(`Reset the password for ${l.user.fullName}? They will have to choose a new one when they sign in.`)) return;
    try {
      const data = await fetcher<{ startingPassword: string }>(`/api/admin/lecturers/${l.id}`, {
        method: "PATCH",
        body: JSON.stringify({ resetPassword: true }),
      });
      setNotice({
        title: `Password reset for ${l.user.fullName}. Their starting password is:`,
        email: l.user.email,
        password: data.startingPassword,
      });
      await load();
    } catch (err) {
      alert(msg(err));
    }
  }

  async function toggleActive(l: Lecturer) {
    const next = !l.user.isActive;
    if (!next && !confirm(`Deactivate ${l.user.fullName}? They will be signed out and unable to log in.`)) return;
    try {
      await fetcher(`/api/admin/lecturers/${l.id}`, { method: "PATCH", body: JSON.stringify({ isActive: next }) });
      await load();
    } catch (err) {
      alert(msg(err));
    }
  }

  async function remove(l: Lecturer) {
    if (!confirm(`Delete ${l.user.fullName} (${l.staffId}) permanently? This cannot be undone.`)) return;
    try {
      await fetcher(`/api/admin/lecturers/${l.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(msg(err)); // e.g. "has courses, deactivate instead"
    }
  }

  const link = "text-sm font-semibold hover:underline";

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lecturers</h1>
          <p className="text-slate-500 mt-1">Lecturers can only be added, edited and removed here by an admin.</p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setNotice(null); }}
          className="px-4 py-2.5 rounded-lg bg-[#681609] text-white text-sm font-semibold hover:bg-[#4d1006] whitespace-nowrap"
        >
          {showForm ? "Cancel" : "Add lecturer"}
        </button>
      </div>

      {notice && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
          <p className="font-semibold">{notice.title}</p>
          <p className="mt-2">Email: <span className="font-mono">{notice.email}</span></p>
          {notice.staffId && <p>Staff ID: <span className="font-mono">{notice.staffId}</span></p>}
          <p>Starting password: <span className="font-mono">{notice.password}</span></p>
          <p className="mt-2 text-green-800">They will be asked to choose their own password the first time they sign in.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={onCreate} className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input required className={input} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Dr. Ade Bello" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input required type="email" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ade@esut.edu.ng" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <input required className={input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Engineering" />
          </div>
          <p className="md:col-span-2 text-sm text-slate-500">
            The Staff ID is generated automatically (<span className="font-mono">ESUT-date-number</span>, for example{" "}
            <span className="font-mono">ESUT-2024-03-11-4827</span>). The starting password is shown once you create the account.
          </p>
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
            {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>}
            {!loading && lecturers.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No lecturers yet.</td></tr>
            )}
            {lecturers.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{l.user.fullName}</p>
                  <p className="text-slate-500">{l.user.email}</p>
                </td>
                <td className="px-5 py-3 text-slate-700 font-mono text-xs">{l.staffId}</td>
                <td className="px-5 py-3 text-slate-700">{l.department}</td>
                <td className="px-5 py-3 text-slate-700">{l._count.courses}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${l.user.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                      {l.user.isActive ? "Active" : "Deactivated"}
                    </span>
                    {l.user.mustChangePassword && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        Starting password
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                    <button onClick={() => openEdit(l)} className={`${link} text-[#681609]`}>Edit</button>
                    <button onClick={() => resetPassword(l)} className={`${link} text-[#681609]`}>Reset password</button>
                    <button onClick={() => toggleActive(l)} className={`${link} text-slate-600`}>
                      {l.user.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                    <button onClick={() => remove(l)} className={`${link} text-red-600`}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form
            onSubmit={onSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-slate-900">Edit lecturer</h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">{editing.staffId}</p>

            <label className="block text-sm font-medium text-slate-700 mt-5 mb-1">Full name</label>
            <input required className={input} value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />

            <label className="block text-sm font-medium text-slate-700 mt-4 mb-1">Email</label>
            <input required type="email" className={input} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />

            <label className="block text-sm font-medium text-slate-700 mt-4 mb-1">Department</label>
            <input required className={input} value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />

            {editError && <p className="text-sm text-red-600 mt-4">{editError}</p>}

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={editSaving} className="flex-1 h-11 rounded-lg bg-[#681609] text-white text-sm font-semibold hover:bg-[#4d1006] disabled:opacity-60">
                {editSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
