// app/student/_layout.tsx
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function StudentLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "STUDENT") return <Redirect href="/role" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
