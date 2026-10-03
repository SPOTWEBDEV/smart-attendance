// app/student/courses.tsx  -  search courses, add or drop them
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type Course = {
  id: string;
  code: string;
  title: string;
  unit: number;
  lecturerName: string;
  enrolled: boolean;
};

export default function StudentCourses() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (query: string) => {
    try {
      const data = await api<{ courses: Course[] }>(
        `/api/student/courses${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        { token }
      );
      setCourses(data.courses);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Search as the student types (small delay so we don't call on every keystroke)
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  const setEnrolled = (id: string, enrolled: boolean) =>
    setCourses((list) => list.map((c) => (c.id === id ? { ...c, enrolled } : c)));

  async function enroll(c: Course) {
    setBusyId(c.id);
    try {
      await api("/api/student/enrollments", { method: "POST", token, body: { courseId: c.id } });
      setEnrolled(c.id, true);
    } catch (e) {
      Alert.alert("Couldn't add course", errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  function confirmDrop(c: Course) {
    Alert.alert(`Drop ${c.code}?`, "Your past attendance records are kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Drop",
        style: "destructive",
        onPress: async () => {
          setBusyId(c.id);
          try {
            await api(`/api/student/enrollments/${c.id}`, { method: "DELETE", token });
            setEnrolled(c.id, false);
          } catch (e) {
            Alert.alert("Couldn't drop course", errorMessage(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Courses" subtitle="Add the courses you are taking" />
      <View style={{ paddingHorizontal: 20 }}>
        <TextInput
          style={styles.search}
          placeholder="Search by code or title"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          value={q}
          onChangeText={setQ}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 10 }}
          ListHeaderComponent={!!error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={!error ? <Text style={styles.empty}>No courses found.</Text> : null}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code} · {item.unit} units</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>{item.lecturerName}</Text>
              </View>
              {busyId === item.id ? (
                <ActivityIndicator color={colors.primary} />
              ) : item.enrolled ? (
                <Pressable onPress={() => confirmDrop(item)} style={[styles.btn, styles.btnOutline]}>
                  <Text style={[styles.btnText, { color: colors.primary }]}>Added</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => enroll(item)} style={styles.btn}>
                  <Text style={styles.btnText}>Add</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  code: { fontSize: 12, fontWeight: "700", color: colors.primary },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, minWidth: 70, alignItems: "center" },
  btnOutline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.primary },
  btnText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 30 },
  error: { color: colors.danger, marginBottom: 12 },
});
