// app/lecturer/home.tsx  -  the lecturer's courses
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
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

export default function LecturerHome() {
  const router = useRouter();
  const { user, token, signOut } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ courses: Course[] }>("/api/courses", { token });
      setCourses(data.courses);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Reload whenever this screen comes back into view (e.g. after adding a course)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hello, {user?.fullName}</Text>
          <Text style={styles.sub}>Your courses</Text>
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
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListHeaderComponent={!!error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={
            !error ? (
              <Text style={styles.empty}>
                No courses yet. Add the courses you teach to start taking attendance.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
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
          )}
        />
      )}

      <View style={styles.footer}>
        <Button title="Add course" onPress={() => router.push("/lecturer/add-course")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 8 },
  hello: { fontSize: 22, fontWeight: "700", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  code: { fontSize: 13, fontWeight: "700", color: colors.primary },
  title: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: 2 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 6 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, lineHeight: 22 },
  error: { color: colors.danger, marginBottom: 12 },
  footer: { padding: 20, paddingTop: 8 },
});
