// app/lecturer/_layout.tsx
import { Redirect, Stack, usePathname } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function LecturerLayout() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return null;
  if (!user || user.role !== "LECTURER") return <Redirect href="/role" />;

  // Still on the starting password? Nothing else is available until it is changed.
  if (user.mustChangePassword && pathname !== "/lecturer/change-password") {
    return <Redirect href="/lecturer/change-password" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
