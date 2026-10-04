// app/role.tsx  -  "Continue as Student / Lecturer"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Credit } from "@/components/Credit";
import { colors } from "@/lib/theme";

type Choice = {
  role: "student" | "lecturer";
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const choices: Choice[] = [
  {
    role: "student",
    title: "Continue as Student",
    subtitle: "Mark your attendance in class",
    icon: "school-outline",
  },
  {
    role: "lecturer",
    title: "Continue as Lecturer",
    subtitle: "Start sessions and track attendance",
    icon: "person-outline",
  },
];

export default function RoleScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={styles.heading}>Welcome</Text>
          <Text style={styles.sub}>How would you like to continue?</Text>

          <View style={{ marginTop: 32, gap: 16 }}>
            {choices.map((c) => (
              <Pressable
                key={c.role}
                onPress={() => router.push({ pathname: "/login", params: { role: c.role } })}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={c.icon} size={28} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardSub}>{c.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ paddingVertical: 16 }}>
          <Credit />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 32, fontWeight: "700", color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: 6 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FDF3F1",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  cardSub: { fontSize: 13, color: colors.muted, marginTop: 3 },
});
