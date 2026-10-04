// app/lecturer/home.tsx  -  lecturer dashboard: Overview and Analytics
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { BarChart, Card, ProgressBar, Segmented, SectionTitle, StatCard, percentColor } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type Course = {
  id: string;
  code: string;
  title: string;
  unit: number;
  semester: string | null;
  session: string | null;
  _count: { enrollments: number; sessions: number };
};

type Analytics = {
  minPercent: number;
  minSessionsForRisk: number;
  totals: {
    courses: number;
    students: number;
    sessions: number;
    openSessions: number;
    avgPercent: number;
    atRiskCount: number;
  };
  courses: { id: string; code: string; title: string; enrolled: number; sessions: number; avgPercent: number; atRisk: number }[];
  trend: { id: string; code: string; startsAt: string; present: number; enrolled: number; percent: number }[];
  atRisk: { studentId: string; fullName: string; matricNo: string; courseCode: string; percent: number }[];
};

const TABS = ["Overview", "Analytics"] as const;
type Tab = (typeof TABS)[number];

export default function LecturerHome() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");
  const [courses, setCourses] = useState<Course[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api<{ courses: Course[] }>("/api/courses", { token }),
        api<Analytics>("/api/lecturer/analytics", { token }),
      ]);
      setCourses(c.courses);
      setAnalytics(a);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Reload whenever this screen comes back into view (after adding a course, closing a session...)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const min = analytics?.minPercent ?? 75;
  const t = analytics?.totals;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello} numberOfLines={1}>Hello, {user?.fullName}</Text>
          <Text style={styles.sub}>Your teaching dashboard</Text>
        </View>
        <Pressable hitSlop={12} style={{ marginRight: 18 }} onPress={() => router.push("/lecturer/change-password")}>
          <Ionicons name="key-outline" size={24} color={colors.muted} />
        </Pressable>
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
              {t && (
                <>
                  <View style={styles.statRow}>
                    <StatCard label="Courses" value={t.courses} />
                    <StatCard label="Students" value={t.students} />
                  </View>
                  <View style={[styles.statRow, { marginTop: 10 }]}>
                    <StatCard label="Classes held" value={t.sessions} />
                    <StatCard label="Avg attendance" value={t.sessions ? `${t.avgPercent}%` : "-"} />
                  </View>

                  {t.openSessions > 0 && (
                    <View style={styles.banner}>
                      <Ionicons name="radio-outline" size={20} color="#16A34A" />
                      <Text style={styles.bannerText}>
                        {t.openSessions} class{t.openSessions === 1 ? " is" : "es are"} open right now. Open the course to go back to it.
                      </Text>
                    </View>
                  )}
                </>
              )}

              <SectionTitle>Your courses</SectionTitle>
              {courses.length === 0 && (
                <Text style={styles.empty}>
                  No courses yet. Add the courses you teach to start taking attendance.
                </Text>
              )}
              {courses.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.courseCard, pressed && { opacity: 0.85 }]}
                  onPress={() =>
                    router.push({
                      pathname: "/lecturer/course/[id]",
                      params: { id: item.id, code: item.code, title: item.title },
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.code}>{item.code}</Text>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.meta}>
                      {item._count.enrollments} students · {item._count.sessions} sessions
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.muted} />
                </Pressable>
              ))}

              <View style={{ marginTop: 12 }}>
                <Button title="Add course" onPress={() => router.push("/lecturer/add-course")} />
              </View>
            </>
          )}

          {tab === "Analytics" && analytics && (
            <>
              <Card>
                <Text style={styles.cardLabel}>Average attendance across all your classes</Text>
                <Text style={[styles.big, { color: t!.sessions ? percentColor(t!.avgPercent, min) : colors.muted }]}>
                  {t!.sessions ? `${t!.avgPercent}%` : "-"}
                </Text>
                <ProgressBar percent={t!.avgPercent} color={percentColor(t!.avgPercent, min)} height={10} />
                <Text style={styles.meta}>
                  {t!.sessions
                    ? `${t!.sessions} classes held · ${t!.students} students`
                    : "Start a class session to see your analytics."}
                </Text>
              </Card>

              {analytics.trend.length > 0 && (
                <>
                  <SectionTitle>Attendance trend</SectionTitle>
                  <Card>
                    <BarChart
                      max={100}
                      suffix="%"
                      data={analytics.trend.map((s) => ({
                        label: new Date(s.startsAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
                        value: s.percent,
                        color: percentColor(s.percent, min),
                      }))}
                    />
                    <Text style={styles.meta}>Share of enrolled students present, for your last {analytics.trend.length} classes</Text>
                  </Card>
                </>
              )}

              <SectionTitle>By course</SectionTitle>
              {analytics.courses.length === 0 && <Text style={styles.empty}>Add a course to see its numbers.</Text>}
              {analytics.courses.map((c) => (
                <Card key={c.id} style={{ marginBottom: 10 }}>
                  <View style={styles.courseTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.code}>{c.code}</Text>
                      <Text style={styles.name}>{c.title}</Text>
                    </View>
                    <Text style={[styles.pct, { color: c.sessions ? percentColor(c.avgPercent, min) : colors.muted }]}>
                      {c.sessions ? `${c.avgPercent}%` : "-"}
                    </Text>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <ProgressBar percent={c.avgPercent} color={percentColor(c.avgPercent, min)} />
                  </View>
                  <Text style={styles.meta}>
                    {c.enrolled} enrolled · {c.sessions} classes
                    {c.atRisk > 0 ? ` · ${c.atRisk} below ${min}%` : ""}
                  </Text>
                </Card>
              ))}

              <SectionTitle>Needs attention</SectionTitle>
              {analytics.atRisk.length === 0 ? (
                <Text style={styles.empty}>
                  No students are below {min}%. This list appears once a course has {analytics.minSessionsForRisk} or more classes.
                </Text>
              ) : (
                <>
                  <Text style={[styles.meta, { marginTop: 0, marginBottom: 8 }]}>
                    {analytics.totals.atRiskCount} student{analytics.totals.atRiskCount === 1 ? "" : "s"} below {min}%. Lowest first:
                  </Text>
                  {analytics.atRisk.map((s) => (
                    <View key={`${s.studentId}-${s.courseCode}`} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{s.fullName}</Text>
                        <Text style={styles.meta}>{s.matricNo} · {s.courseCode}</Text>
                      </View>
                      <Text style={[styles.pct, { color: percentColor(s.percent, min), fontSize: 18 }]}>{s.percent}%</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 12 },
  hello: { fontSize: 22, fontWeight: "700", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  statRow: { flexDirection: "row", gap: 10 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  bannerText: { flex: 1, fontSize: 13, color: "#166534", lineHeight: 19 },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  code: { fontSize: 13, fontWeight: "700", color: colors.primary },
  title: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: 2 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 6 },
  cardLabel: { fontSize: 13, color: colors.muted },
  big: { fontSize: 44, fontWeight: "700", marginVertical: 6 },
  courseTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  pct: { fontSize: 22, fontWeight: "700" },
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
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, marginBottom: 12 },
});
