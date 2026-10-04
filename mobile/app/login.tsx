// app/login.tsx  -  shared login screen for both roles (?role=student | lecturer)
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FormScreen } from "@/components/FormScreen";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { api } from "@/lib/api";
import { useAuth, User } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type LoginResponse = { token: string; user: User };

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { role } = useLocalSearchParams<{ role: "student" | "lecturer" }>();

  const isLecturer = role === "lecturer";
  const expected = isLecturer ? "LECTURER" : "STUDENT";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const data = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      // Stop a lecturer from signing in through the student button (and vice versa)
      if (data.user.role !== expected) {
        setError(
          data.user.role === "ADMIN"
            ? "Admins use the web dashboard."
            : `This is a ${data.user.role.toLowerCase()} account. Go back and choose ${data.user.role.toLowerCase()}.`
        );
        return;
      }

      await signIn(data.token, data.user);
      router.replace(isLecturer ? "/lecturer/home" : "/student/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormScreen>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>

      <Text style={styles.heading}>{isLecturer ? "Lecturer login" : "Student login"}</Text>
      <Text style={styles.sub}>Sign in to continue</Text>

      <View style={{ marginTop: 28 }}>
        <Field
          label="Email"
          placeholder="you@school.edu"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Password"
          placeholder="Your password"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button title="Sign in" onPress={onSubmit} loading={loading} />
      </View>

      <View style={styles.footer}>
        {isLecturer ? (
          <Text style={styles.note}>
            Lecturer accounts are created by the school admin. Your first password is your email address, and you will be asked to change it.
          </Text>
        ) : (
          <Pressable onPress={() => router.push("/register")}>
            <Text style={styles.note}>
              New student? <Text style={styles.link}>Create an account</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: 16, alignSelf: "flex-start" },
  heading: { fontSize: 28, fontWeight: "700", color: colors.text },
  sub: { fontSize: 15, color: colors.muted, marginTop: 6 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 14 },
  footer: { marginTop: 28, alignItems: "center" },
  note: { fontSize: 14, color: colors.muted, textAlign: "center" },
  link: { color: colors.primary, fontWeight: "600" },
});
