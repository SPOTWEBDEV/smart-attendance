// components/DeviceBanner.tsx
// Shown on the student home screen when this phone is not the one linked to the account.
//  - no phone linked (admin reset it)  -> offer to link this phone
//  - a different phone is linked       -> tell the student to ask the admin
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button } from "@/components/Button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getDeviceId, getDeviceInfo } from "@/lib/device";
import { colors } from "@/lib/theme";

type State = "ok" | "unlinked" | "other";

export function DeviceBanner() {
  const { token } = useAuth();
  const [state, setState] = useState<State>("ok");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    try {
      const [{ device }, localId] = await Promise.all([
        api<{ device: { deviceId: string } | null }>("/api/student/device", { token }),
        getDeviceId(),
      ]);
      setState(!device ? "unlinked" : device.deviceId === localId ? "ok" : "other");
    } catch {
      setState("ok"); // don't show a warning if we simply couldn't check
    }
  }, [token]);

  useFocusEffect(useCallback(() => { check(); }, [check]));

  async function link() {
    setBusy(true);
    setError("");
    try {
      const deviceId = await getDeviceId();
      await api("/api/student/device", { method: "POST", token, body: { deviceId, ...getDeviceInfo() } });
      await check();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (state === "ok") return null;

  return (
    <View style={styles.box}>
      {state === "unlinked" ? (
        <>
          <Text style={styles.title}>This phone isn't linked to your account</Text>
          <Text style={styles.text}>Link it to start marking attendance from this phone.</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={{ marginTop: 12 }}>
            <Button title="Link this phone" onPress={link} loading={busy} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Your account is linked to a different phone</Text>
          <Text style={styles.text}>
            Ask the admin to reset your phone, then come back here to link this one.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FCD34D", borderRadius: 16, padding: 16, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "700", color: "#92400E" },
  text: { fontSize: 13, color: "#92400E", marginTop: 4, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
});
