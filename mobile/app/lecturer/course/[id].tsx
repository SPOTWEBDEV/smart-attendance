// app/lecturer/course/[id].tsx
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type Summary = {
  totalSessions: number;
  minPercent: number;
  students: { studentId: string; matricNo: string; fullName: string; attended: number; percent: number; belowMinimum: boolean }[];
};

type SessionItem = {
  id: string;
  topic: string | null;
  status: "OPEN" | "CLOSED";
  startsAt: string;
  _count: { attendances: number };
};

export default function CourseScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { id, code, title } = useLocalSearchParams<{ id: string; code?: string; title?: string }>();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([
        api<Summary>(`/api/courses/${id}/summary`, { token }),
        api<{ sessions: SessionItem[] }>(`/api/sessions?courseId=${id}`, { token }),
      ]);
      setSummary(s);
      setSessions(list.sessions);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openSession = (sessionId: string) =>
    router.push({ pathname: "/lecturer/session/[id]", params: { id: sessionId } });

  async function startSession() {
    setError("");
    setStarting(true);
    try {
      const data = await api<{ session: { id: string } }>("/api/sessions", {
        method: "POST",
        token,
        body: { courseId: id, topic: topic.trim() || undefined },
      });
      setTopic("");
      openSession(data.session.id);
    } catch (e) {
      // Already have an open session for this course? Just go back to it.
      if (e instanceof ApiError && e.status === 409 && e.data?.sessionId) {
        openSession(e.data.sessionId);
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={code ?? "Course"} subtitle={title} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Start a class session</Text>
            <Text style={styles.hint}>Students nearby will be able to mark attendance.</Text>
            <View style={{ marginTop: 14 }}>
              <Field label="Topic (optional)" placeholder="Week 5: Interrupts" autoCapitalize="sentences" value={topic} onChangeText={setTopic} />
            </View>
            <Button title="Start session" onPress={startSession} loading={starting} />
          </View>

          <Text style={styles.section}>
            Attendance{summary ? ` (${summary.totalSessions} sessions)` : ""}
          </Text>
          {summary && summary.students.length === 0 && (
            <Text style={styles.empty}>No students have enrolled in this course yet.</Text>
          )}
          {summary?.students.map((s) => (
            <View key={s.studentId} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.fullName}</Text>
                <Text style={styles.meta}>{s.matricNo} · {s.attended}/{summary.totalSessions}</Text>
              </View>
              <Text style={[styles.percent, s.belowMinimum && { color: colors.danger }]}>{s.percent}%</Text>
            </View>
          ))}
          {summary && summary.students.some((s) => s.belowMinimum) && (
            <Text style={styles.hint}>Red means below the {summary.minPercent}% minimum.</Text>
          )}

          <Text style={styles.section}>Sessions</Text>
          {sessions.length === 0 && <Text style={styles.empty}>No sessions yet.</Text>}
          {sessions.map((s) => (
            <Pressable key={s.id} style={styles.row} onPress={() => openSession(s.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.topic || "Class session"}</Text>
                <Text style={styles.meta}>
                  {new Date(s.startsAt).toLocaleDateString()} ·{" "}
                  {new Date(s.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {s._count.attendances} present
                </Text>
              </View>
              <Text style={[styles.badge, s.status === "OPEN" && styles.badgeOpen]}>
                {s.status === "OPEN" ? "OPEN" : "CLOSED"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  hint: { fontSize: 13, color: colors.muted, marginTop: 4 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 28, marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
  percent: { fontSize: 16, fontWeight: "700", color: colors.text },
  badge: { fontSize: 11, fontWeight: "700", color: colors.muted },
  badgeOpen: { color: "#16A34A" },
  empty: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, marginBottom: 12 },
});
