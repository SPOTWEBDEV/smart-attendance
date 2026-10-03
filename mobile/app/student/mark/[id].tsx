// app/student/mark/[id].tsx
// Mark attendance in three steps:
//   1. Find the lecturer's Bluetooth beacon (proves you are in the room)
//   2. Confirm with fingerprint / face unlock (proves it is you)
//   3. Send it to the server, which checks everything again
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/Button";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getDeviceId } from "@/lib/device";
import { prepareScan, sessionTag, startBeaconScan } from "@/lib/ble";
import { colors } from "@/lib/theme";

type Phase = "scanning" | "verifying" | "submitting" | "done" | "error";

export default function MarkAttendance() {
  const router = useRouter();
  const { token } = useAuth();
  const { id, code, topic } = useLocalSearchParams<{ id: string; code?: string; topic?: string }>();

  const [phase, setPhase] = useState<Phase>("scanning");
  const [found, setFound] = useState(false);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(""); // Bluetooth off / permission denied
  const [scanKey, setScanKey] = useState(0);
  const lastSeen = useRef<{ code: string; rssi?: number; at: number } | null>(null);

  // 1. Scan for this session's beacon
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    setBlocked("");

    (async () => {
      try {
        await prepareScan();
        const s = await startBeaconScan((b) => {
          if (b.tag === sessionTag(id)) {
            lastSeen.current = { code: b.code, rssi: b.rssi, at: Date.now() };
            setFound(true);
          }
        });
        if (cancelled) s();
        else stop = s;
      } catch (e) {
        if (!cancelled) setBlocked(errorMessage(e));
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [id, scanKey]);

  // As soon as the beacon is seen, go to the fingerprint step
  useEffect(() => {
    if (phase === "scanning" && found) verifyAndSubmit();
  }, [phase, found]); // eslint-disable-line react-hooks/exhaustive-deps

  function fail(msg: string) {
    setMessage(msg);
    setPhase("error");
  }

  // 2 + 3. Fingerprint, then send to the server
  async function verifyAndSubmit() {
    setPhase("verifying");

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      fail("Set up a fingerprint or face unlock in your phone's settings, then try again.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm it's you to mark attendance",
      cancelLabel: "Cancel",
      disableDeviceFallback: true, // biometrics only, no PIN
    });
    if (!result.success) {
      fail(result.error === "user_cancel" ? "Fingerprint check was cancelled." : "Fingerprint not recognised. Try again.");
      return;
    }

    // The beacon must still be in range after the fingerprint step
    const seen = lastSeen.current;
    if (!seen || Date.now() - seen.at > 20_000) {
      fail("Lost the class beacon. Stay close to the lecturer and try again.");
      return;
    }

    setPhase("submitting");
    try {
      const deviceId = await getDeviceId();
      await api(`/api/sessions/${id}/attendance`, {
        method: "POST",
        token,
        body: { deviceId, beaconCode: seen.code, rssi: seen.rssi, biometricVerified: true },
      });
      setMessage("Your attendance has been recorded.");
      setPhase("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setMessage("You were already marked present.");
        setPhase("done");
      } else {
        fail(errorMessage(e));
      }
    }
  }

  function retry() {
    lastSeen.current = null;
    setFound(false);
    setPhase("scanning");
    setScanKey((k) => k + 1); // restart the scan
  }

  const view = blocked
    ? { icon: "bluetooth-outline" as const, color: colors.danger, title: "Bluetooth needed", text: blocked }
    : phase === "done"
    ? { icon: "checkmark-circle" as const, color: "#16A34A", title: "Attendance marked", text: message }
    : phase === "error"
    ? { icon: "alert-circle" as const, color: colors.danger, title: "Couldn't mark attendance", text: message }
    : phase === "verifying"
    ? { icon: "finger-print" as const, color: colors.primary, title: "Confirm with fingerprint", text: "Class beacon found. Verify it's you." }
    : phase === "submitting"
    ? { icon: "cloud-upload-outline" as const, color: colors.primary, title: "Saving...", text: "Just a moment." }
    : { icon: "bluetooth" as const, color: colors.primary, title: "Looking for your lecturer", text: "Stay inside the classroom with Bluetooth on." };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={code ?? "Attendance"} subtitle={topic} />

      <View style={styles.center}>
        <View style={[styles.circle, { backgroundColor: view.color + "1A" }]}>
          <Ionicons name={view.icon} size={64} color={view.color} />
        </View>
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.text}>{view.text}</Text>

        {!blocked && (phase === "scanning" || phase === "submitting") && (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
        )}
      </View>

      <View style={styles.footer}>
        {phase === "done" ? (
          <Button title="Done" onPress={() => router.back()} />
        ) : blocked || phase === "error" ? (
          <Button title="Try again" onPress={retry} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  circle: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center" },
  text: { fontSize: 15, color: colors.muted, textAlign: "center", marginTop: 10, lineHeight: 22 },
  footer: { padding: 20, minHeight: 94 },
});
