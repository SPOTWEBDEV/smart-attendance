// app/lecturer/add-course.tsx
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FormScreen } from "@/components/FormScreen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function AddCourse() {
  const router = useRouter();
  const { token } = useAuth();

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("2");
  const [semester, setSemester] = useState("");
  const [session, setSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    setError("");
    const unitNum = parseInt(unit, 10);
    if (!code.trim() || !title.trim()) {
      setError("Course code and title are required");
      return;
    }
    if (!Number.isInteger(unitNum) || unitNum < 1 || unitNum > 10) {
      setError("Units should be a number from 1 to 10");
      return;
    }

    setLoading(true);
    try {
      await api("/api/courses", {
        method: "POST",
        token,
        body: {
          code: code.trim(),
          title: title.trim(),
          unit: unitNum,
          semester: semester.trim() || undefined,
          session: session.trim() || undefined,
        },
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Add course" />
      <FormScreen>
        <Field label="Course code" placeholder="CPE 401" autoCapitalize="characters" value={code} onChangeText={setCode} />
        <Field label="Course title" placeholder="Embedded Systems" autoCapitalize="words" value={title} onChangeText={setTitle} />
        <Field label="Units" keyboardType="number-pad" maxLength={2} value={unit} onChangeText={setUnit} />
        <Field label="Semester (optional)" placeholder="First" autoCapitalize="words" value={semester} onChangeText={setSemester} />
        <Field label="Academic session (optional)" placeholder="2025/2026" value={session} onChangeText={setSession} />

        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={{ marginTop: 4 }}>
          <Button title="Save course" onPress={onSubmit} loading={loading} />
        </View>
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 14, marginBottom: 14 },
});
