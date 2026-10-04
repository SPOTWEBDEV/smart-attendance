// app/student/home.tsx  -  student dashboard: Overview and Analytics
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { ProfileTab, initialsOf } from "@/components/ProfileTab";
import { DeviceBanner } from "@/components/DeviceBanner";
import { BarChart, Card, ProgressBar, Segmented, SectionTitle, StatCard, percentColor } from "@/components/ui";
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

type Analytics = {
  minPercent: number;
  overall: { attended: number; total: number; percent: number };
  courses: {
    id: string;
    code: string;
    title: string;
    attended: number;
    total: number;
    percent: number;
    belowMinimum: boolean;
    classesToReachMinimum: number;
  }[];
  weekly: { label: string; count: number }[];
  recent: {
    id: string;
    markedAt: string;
    method: "BIOMETRIC" | "MANUAL";
    session: { topic: string | null; course: { code: string; title: string } };
  }[];
};

const TABS = ["Overview", "Analytics", "Profile"] as const;
type Tab = (typeof TABS)[number];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) +
  " · " +
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function StudentHome() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");
  const [open, setOpen] = useState<OpenSession[]>([]);
  const [courses, setCourses] = useState<Enrollment[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, e, a] = await Promise.all([
        api<{ sessions: OpenSession[] }>("/api/student/sessions/open", { token }),
        api<{ enrollments: Enrollment[] }>("/api/student/enrollments", { token }),
        api<Analytics>("/api/student/analytics", { token }),
      ]);
      setOpen(s.sessions);
      setCourses(e.enrollments);
      setAnalytics(a);
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

  const min = analytics?.minPercent ?? 75;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hi, {user?.fullName.split(" ")[0]}</Text>
          <Text style={styles.sub}>Your attendance dashboard</Text>
        </View>
        <Pressable onPress={() => setTab("Profile")} style={styles.avatar} hitSlop={8}>
          <Text style={styles.avatarText}>{initialsOf(user?.fullName)}</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {!!error && <Text style={styles.error}>{error}</Text>}

          {tab === "Overview" && (
            <>
              <DeviceBanner />

              {analytics && (
                <View style={styles.statRow}>
                  <StatCard
                    label="Attendance"
                    value={analytics.overall.total ? `${analytics.overall.percent}%` : "-"}
                  />
                  <StatCard label="Courses" value={analytics.courses.length} />
                  <StatCard
                    label="Classes attended"
                    value={`${analytics.overall.attended}/${analytics.overall.total}`}
                  />
                </View>
              )}

              <SectionTitle>Open now</SectionTitle>
              {open.length === 0 && (
                <Text style={styles.empty}>No class is taking attendance right now. This updates automatically.</Text>
              )}
              {open.map((s) => (
                <View key={s.id} style={styles.openCard}>
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

              <SectionTitle>My courses</SectionTitle>
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
            </>
          )}

          {tab === "Analytics" && analytics && (
            <>
              <Card>
                <Text style={styles.cardLabel}>Overall attendance</Text>
                <Text style={[styles.big, { color: analytics.overall.total ? percentColor(analytics.overall.percent, min) : colors.muted }]}>
                  {analytics.overall.total ? `${analytics.overall.percent}%` : "-"}
                </Text>
                <ProgressBar
                  percent={analytics.overall.percent}
                  color={percentColor(analytics.overall.percent, min)}
                  height={10}
                />
                <Text style={styles.meta}>
                  {analytics.overall.total
                    ? `${analytics.overall.attended} of ${analytics.overall.total} classes attended · ${min}% is the minimum`
                    : "Your numbers appear after your first classes."}
                </Text>
              </Card>

              <SectionTitle>By course</SectionTitle>
              {analytics.courses.length === 0 && <Text style={styles.empty}>Add a course to see its attendance.</Text>}
              {analytics.courses.map((c) => (
                <Card key={c.id} style={{ marginBottom: 10 }}>
                  <View style={styles.courseTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.code}>{c.code}</Text>
                      <Text style={styles.name}>{c.title}</Text>
                    </View>
                    <Text style={[styles.pct, { color: c.total ? percentColor(c.percent, min) : colors.muted }]}>
                      {c.total ? `${c.percent}%` : "-"}
                    </Text>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <ProgressBar percent={c.percent} color={percentColor(c.percent, min)} />
                  </View>
                  <Text style={styles.meta}>
                    {c.total ? `${c.attended} of ${c.total} classes` : "No classes held yet"}
                  </Text>
                  {c.belowMinimum && (
                    <Text style={styles.warn}>
                      Below {min}%. Attend the next {c.classesToReachMinimum} class{c.classesToReachMinimum === 1 ? "" : "es"} in a row to get back to {min}%.
                    </Text>
                  )}
                </Card>
              ))}

              <SectionTitle>Last 6 weeks</SectionTitle>
              <Card>
                <BarChart data={analytics.weekly.map((w) => ({ label: w.label, value: w.count }))} />
                <Text style={styles.meta}>Classes you checked in to each week (week starting Monday)</Text>
              </Card>

              <SectionTitle>Recent check-ins</SectionTitle>
              {analytics.recent.length === 0 && <Text style={styles.empty}>No check-ins yet.</Text>}
              {analytics.recent.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{r.session.course.code} · {r.session.topic || r.session.course.title}</Text>
                    <Text style={styles.meta}>{fmtDate(r.markedAt)}</Text>
                  </View>
                  <Text style={[styles.badge, r.method === "MANUAL" && { color: "#B45309" }]}>
                    {r.method === "MANUAL" ? "MANUAL" : "VERIFIED"}
                  </Text>
                </View>
              ))}
            </>
          )}
          {tab === "Profile" && <ProfileTab />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 12 },
  hello: { fontSize: 24, fontWeight: "700", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  statRow: { flexDirection: "row", gap: 10 },
  openCard: {
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
  code: { fontSize: 12, fontWeight: "700", color: colors.primary },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 6 },
  markBtn: { backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  markText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  done: { flexDirection: "row", alignItems: "center", gap: 4 },
  doneText: { color: "#16A34A", fontWeight: "600" },
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
  cardLabel: { fontSize: 13, color: colors.muted },
  big: { fontSize: 44, fontWeight: "700", marginVertical: 6 },
  courseTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  pct: { fontSize: 22, fontWeight: "700" },
  warn: { fontSize: 12, color: colors.danger, marginTop: 8, lineHeight: 18 },
  badge: { fontSize: 11, fontWeight: "700", color: "#16A34A" },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, marginBottom: 12 },
});
