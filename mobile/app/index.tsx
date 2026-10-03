// app/index.tsx  -  Welcome screen
// Shows the branding for a moment, then goes to the role screen.
// If the user is already signed in, it goes straight to their home screen.
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function Welcome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fade]);

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (user?.role === "STUDENT") router.replace("/student/home");
      else if (user?.role === "LECTURER") router.replace("/lecturer/home");
      else router.replace("/role");
    }, 2200);
    return () => clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fade, alignItems: "center" }}>
        <View style={styles.logoWrap}>
          <Image source={require("@/assets/logo.jpg")} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Smart Attendance</Text>
        <Text style={styles.school}>Enugu State University of Science and Technology</Text>
        <Text style={styles.tagline}>
          Fingerprint attendance, verified by Bluetooth proximity
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logoWrap: {
    width: 116,
    height: 116,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logo: { width: 60, height: 66 },
  school: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginTop: 8,
  },
  title: { fontSize: 30, fontWeight: "700", color: colors.white },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
});
