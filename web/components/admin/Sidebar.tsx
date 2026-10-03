// components/admin/Sidebar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/lecturers", label: "Lecturers" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/reports", label: "Reports" },
];

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="bg-slate-900 text-white md:w-64 md:min-h-screen p-4 md:p-6 flex md:flex-col gap-4 md:gap-8 items-center md:items-stretch print:hidden">
      <div className="hidden md:block">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1.5">
            <Image src="/logo.jpg" alt="ESUT logo" width={30} height={33} />
          </div>
          <p className="text-lg font-bold leading-tight">Smart Attendance</p>
        </div>
        <p className="text-xs text-slate-400 mt-3">Signed in as {name}</p>
      </div>

      <nav className="flex md:flex-col gap-1 flex-1 overflow-x-auto">
        {links.map((l) => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                active ? "bg-[#681609] text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <button onClick={logout} className="text-sm text-slate-400 hover:text-white text-left px-3 py-2">
        Sign out
      </button>
    </aside>
  );
}
