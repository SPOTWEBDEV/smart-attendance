// app/student/home.tsx  -  open classes to mark, and my courses
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { DeviceBanner } from "@/components/DeviceBanner";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type OpenSession = {
  id: string;
  topic: string | null;
  startsAt: string;
  windowMins: number;
  course: { code: string; title: string };
  alreadyMarked: boolean;
};

type Enrollment = {
  id: string;
  course: { id: string; code: string; title: string; unit: number; lecturer: { user: { fullName: string } } };
};

export default function StudentHome() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [open, setOpen] = useState<OpenSession[]>([]);
  const [courses, setCourses] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        api<{ sessions: OpenSession[] }>("/api/student/sessions/open", { token }),
        api<{ enrollments: Enrollment[] }>("/api/student/enrollments", { token }),
      ]);
      setOpen(s.sessions);
      setCourses(e.enrollments);
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Load on focus and keep checking for newly opened classes
  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 10000);
      return () => clearInterval(t);
    }, [load])
  );

  const minsLeft = (s: OpenSession) =>
    Math.max(0, Math.ceil((new Date(s.startsAt).getTime() + s.windowMins * 60_000 - Date.now()) / 60_000));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hi, {user?.fullName.split(" ")[0]}</Text>
          <Text style={styles.sub}>Mark your attendance</Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={async () => {
            await signOut();
            router.replace("/role");
          }}
        >
          <Ionicons name="log-out-outline" size={26} color={colors.muted} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {!!error && <Text style={styles.error}>{error}</Text>}

          <DeviceBanner />

          <Text style={styles.section}>Open now</Text>
          {open.length === 0 && (
            <Text style={styles.empty}>No class is taking attendance right now. This updates automatically.</Text>
          )}
          {open.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{s.course.code}</Text>
                <Text style={styles.title}>{s.topic || s.course.title}</Text>
                <Text style={styles.meta}>{minsLeft(s)} min left to mark</Text>
              </View>
              {s.alreadyMarked ? (
                <View style={styles.done}>
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  <Text style={styles.doneText}>Marked</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.markBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/student/mark/[id]",
                      params: { id: s.id, code: s.course.code, topic: s.topic ?? s.course.title },
                    })
                  }
                >
                  <Text style={styles.markText}>Mark</Text>
                </Pressable>
              )}
            </View>
          ))}

          <Text style={styles.section}>My courses</Text>
          {courses.length === 0 && <Text style={styles.empty}>You haven't added any courses yet.</Text>}
          {courses.map((e) => (
            <View key={e.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{e.course.code} · {e.course.title}</Text>
                <Text style={styles.meta}>{e.course.lecturer.user.fullName}</Text>
              </View>
            </View>
          ))}

          <View style={{ marginTop: 16 }}>
            <Button title="Add or drop courses" variant="outline" onPress={() => router.push("/student/courses")} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 8 },
  hello: { fontSize: 24, fontWeight: "700", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  code: { fontSize: 13, fontWeight: "700", color: colors.primary },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  markBtn: { backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  markText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  done: { flexDirection: "row", alignItems: "center", gap: 4 },
  doneText: { color: "#16A34A", fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, marginBottom: 12 },
});
