// app/lecturer/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function LecturerLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "LECTURER") return <Redirect href="/role" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
