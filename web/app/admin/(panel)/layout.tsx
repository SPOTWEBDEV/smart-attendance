// app/admin/(panel)/layout.tsx
// Every page inside (panel) requires a signed-in admin. The login page sits outside this group.
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fullName: true },
  });

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar name={me?.fullName ?? "Admin"} />
      <main className="flex-1 p-5 md:p-10 min-w-0">{children}</main>
    </div>
  );
}
