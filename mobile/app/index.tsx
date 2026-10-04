// app/index.tsx  -  Welcome screen
// New users stay on this screen until they tap "Get started" (no timer, so there is time to read it).
// Signed-in users skip ahead to their home screen after a moment.
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Credit } from "@/components/Credit";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

const steps = [
  { icon: "bluetooth" as const, text: "Be in the classroom. Your phone finds your lecturer's Bluetooth signal." },
  { icon: "finger-print" as const, text: "Confirm it's you with your fingerprint or face unlock." },
  { icon: "checkmark-circle" as const, text: "Your attendance is recorded in seconds." },
];

export default function Welcome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fade]);

  useEffect(() => {
    if (loading || !user) return;
    const timer = setTimeout(() => {
      if (user.role === "STUDENT") router.replace("/student/home");
      else if (user.role === "LECTURER") router.replace("/lecturer/home");
      else router.replace("/role");
    }, 1800);
    return () => clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade, alignItems: "center" }}>
          <View style={styles.logoWrap}>
            <Image source={require("@/assets/logo.jpg")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Smart Attendance</Text>
          <Text style={styles.school}>Enugu State University of Science and Technology</Text>
          <Text style={styles.tagline}>Fingerprint attendance, verified by Bluetooth proximity</Text>

          <View style={styles.steps}>
            {steps.map((s) => (
              <View key={s.icon} style={styles.step}>
                <Ionicons name={s.icon} size={22} color={colors.white} />
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.bottom}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : user ? (
            <Text style={styles.back}>Welcome back, {user.fullName.split(" ")[0]}</Text>
          ) : (
            <Pressable
              onPress={() => router.push("/role")}
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.buttonText}>Get started</Text>
            </Pressable>
          )}

          <View style={{ marginTop: 32 }}>
            <Credit light />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: "space-between", padding: 28, paddingTop: 48 },
  logoWrap: {
    width: 116,
    height: 116,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: { width: 60, height: 66 },
  title: { fontSize: 30, fontWeight: "700", color: colors.white, textAlign: "center" },
  school: { fontSize: 13, color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 8 },
  tagline: { fontSize: 15, color: "rgba(255,255,255,0.9)", textAlign: "center", marginTop: 14, lineHeight: 22 },
  steps: { marginTop: 32, gap: 14, alignSelf: "stretch" },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 14,
  },
  stepText: { flex: 1, fontSize: 14, color: colors.white, lineHeight: 20 },
  bottom: { marginTop: 36, alignItems: "stretch" },
  button: { height: 54, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 16, fontWeight: "700", color: colors.primary },
  back: { textAlign: "center", color: colors.white, fontSize: 16, fontWeight: "600" },
});
