// app/admin/login/page.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetcher, msg } from "@/lib/fetcher";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await fetcher<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.user.role !== "ADMIN") {
        // The login route already set a cookie, so clear it again
        await fetch("/api/auth/logout", { method: "POST" });
        setError("This page is for admins only. Lecturers and students use the mobile app.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(msg(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <Image src="/logo.jpg" alt="ESUT logo" width={51} height={56} className="mb-5" priority />
        <h1 className="text-2xl font-bold text-slate-900">Admin sign in</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">ESUT Smart Attendance dashboard</p>

        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-11 px-3 rounded-lg border border-slate-300 mb-4 outline-none focus:border-[#681609] focus:ring-2 focus:ring-red-100"
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-11 px-3 rounded-lg border border-slate-300 mb-4 outline-none focus:border-[#681609] focus:ring-2 focus:ring-red-100"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-lg bg-[#681609] text-white font-semibold hover:bg-[#4d1006] disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
