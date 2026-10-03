// app/register.tsx  -  student sign-up. Binds this phone to the student.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FormScreen } from "@/components/FormScreen";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { api } from "@/lib/api";
import { getDeviceId, getDeviceInfo } from "@/lib/device";
import { useAuth, User } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type RegisterResponse = { token: string; user: User };

export default function Register() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [fullName, setFullName] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    setError("");

    const levelNum = parseInt(level, 10);
    if (!fullName.trim() || !matricNo.trim() || !department.trim() || !email.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (!Number.isInteger(levelNum) || levelNum < 100) {
      setError("Level should be like 100, 200, 300...");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const data = await api<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: {
          fullName: fullName.trim(),
          matricNo: matricNo.trim(),
          department: department.trim(),
          level: levelNum,
          email: email.trim(),
          password,
          deviceId,
          ...getDeviceInfo(),
        },
      });

      await signIn(data.token, data.user);
      router.replace("/student/home");
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

      <Text style={styles.heading}>Create account</Text>
      <Text style={styles.sub}>This phone will be linked to your account.</Text>

      <View style={{ marginTop: 28 }}>
        <Field
          label="Full name"
          placeholder="Ada Okafor"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
        <Field
          label="Matric number"
          placeholder="CPE/2021/001"
          autoCapitalize="characters"
          value={matricNo}
          onChangeText={setMatricNo}
        />
        <Field
          label="Department"
          placeholder="Computer Engineering"
          autoCapitalize="words"
          value={department}
          onChangeText={setDepartment}
        />
        <Field
          label="Level"
          placeholder="400"
          keyboardType="number-pad"
          maxLength={3}
          value={level}
          onChangeText={setLevel}
        />
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
          placeholder="At least 8 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button title="Create account" onPress={onSubmit} loading={loading} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: 16, alignSelf: "flex-start" },
  heading: { fontSize: 28, fontWeight: "700", color: colors.text },
  sub: { fontSize: 15, color: colors.muted, marginTop: 6 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 14 },
});
