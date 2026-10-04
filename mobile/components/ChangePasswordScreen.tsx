// components/ChangePasswordScreen.tsx  (used by both the lecturer and student routes)
// Forced on a lecturer's first sign-in (starting password), and available any time from the home screen.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FormScreen } from "@/components/FormScreen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export default function ChangePassword() {
  const router = useRouter();
  const { token, user, updateUser, signOut } = useAuth();
  const forced = !!user?.mustChangePassword;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    setError("");
    if (!current || !next) {
      setError("Fill in all the fields");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      setError("The new passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        token,
        body: { currentPassword: current, newPassword: next },
      });
      await updateUser({ mustChangePassword: false });
      if (forced) router.replace("/lecturer/home"); // first sign-in: go on to the dashboard
      else router.back(); // came from the profile page: go back to it
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={forced ? "Choose a new password" : "Change password"}
        subtitle={forced ? "You are using the starting password" : undefined}
        hideBack={forced}
      />
      <FormScreen>
        {forced && (
          <Text style={styles.info}>
            Your first password was your email address (or the one the admin gave you). Pick your own password to continue.
          </Text>
        )}

        <Field label={forced ? "Starting password" : "Current password"} secureTextEntry value={current} onChangeText={setCurrent} />
        <Field label="New password" placeholder="At least 8 characters" secureTextEntry value={next} onChangeText={setNext} />
        <Field label="Confirm new password" secureTextEntry value={confirm} onChangeText={setConfirm} />

        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button title="Save password" onPress={onSubmit} loading={loading} />

        {forced && (
          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Pressable
              onPress={async () => {
                await signOut();
                router.replace("/role");
              }}
              hitSlop={10}
            >
              <Text style={styles.link}>Sign out</Text>
            </Pressable>
          </View>
        )}
      </FormScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  info: { fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 20 },
  error: { color: colors.danger, fontSize: 14, marginBottom: 14 },
  link: { color: colors.primary, fontWeight: "600", fontSize: 14 },
});
