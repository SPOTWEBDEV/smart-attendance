// app/lecturer/session/[id].tsx
// The live class screen. While the session is OPEN this screen:
//   1. fetches the current beacon code from the server,
//   2. broadcasts it over Bluetooth (refreshing every 30s),
//   3. shows who has marked present.
// Keep this screen open and the phone awake during class.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/Button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { makeBeaconName, prepareBroadcast, broadcast, stopBroadcast } from "@/lib/ble";
import { colors } from "@/lib/theme";

type Attendance = {
  id: string;
  method: "BIOMETRIC" | "MANUAL";
  note: string | null;
  markedAt: string;
  student: { id: string; matricNo: string; user: { fullName: string } };
};

type SessionDetail = {
  id: string;
  topic: string | null;
  status: "OPEN" | "CLOSED";
  startsAt: string;
  windowMins: number;
  course: { id: string; code: string; title: string };
  attendances: Attendance[];
};

type RosterStudent = { studentId: string; matricNo: string; fullName: string };

type BeaconState = { status: "idle" | "on" | "error"; message?: string; code?: string };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  useKeepAwake(); // Bluetooth advertising works best with the screen on

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [beacon, setBeacon] = useState<BeaconState>({ status: "idle" });
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);

  // manual marking modal
  const [manualFor, setManualFor] = useState<RosterStudent | null>(null);
  const [reason, setReason] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const data = await api<{ session: SessionDetail }>(`/api/sessions/${id}`, { token });
      setSession(data.session);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id, token]);

  const courseId = session?.course.id;
  const loadRoster = useCallback(async () => {
    if (!courseId) return;
    try {
      const data = await api<{ students: RosterStudent[] }>(`/api/courses/${courseId}/summary`, { token });
      setRoster(data.students);
    } catch {
      // roster is only needed for manual marking
    }
  }, [courseId, token]);

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { loadRoster(); }, [loadRoster]);

  const status = session?.status;

  // Live updates: poll attendance and tick the countdown while the session is open
  useEffect(() => {
    if (status !== "OPEN") return;
    const poll = setInterval(loadSession, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [status, loadSession]);

  // Beacon loop: get the code, broadcast it, repeat when it rotates
  useEffect(() => {
    if (status !== "OPEN" || !id) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function run() {
      try {
        await prepareBroadcast();
      } catch (e) {
        if (!stopped) setBeacon({ status: "error", message: errorMessage(e) });
        return;
      }

      async function tick() {
        try {
          const b = await api<{ code: string; expiresInSec: number }>(`/api/sessions/${id}/beacon`, { token });
          if (stopped) return;
          await broadcast(makeBeaconName(id, b.code));
          if (stopped) return;
          setBeacon({ status: "on", code: b.code });
          timer = setTimeout(tick, (b.expiresInSec + 0.5) * 1000); // right after the code rotates
        } catch (e) {
          if (stopped) return;
          setBeacon({ status: "error", message: errorMessage(e) });
          timer = setTimeout(tick, 5000); // try again
        }
      }
      tick();
    }

    run();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stopBroadcast();
    };
  }, [status, id, token]);

  function confirmClose() {
    Alert.alert("Close session?", "Students won't be able to mark attendance after this.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close session",
        style: "destructive",
        onPress: async () => {
          setClosing(true);
          try {
            await api(`/api/sessions/${id}/close`, { method: "POST", token });
            await loadSession();
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setClosing(false);
          }
        },
      },
    ]);
  }

  async function submitManual() {
    if (!manualFor) return;
    setManualError("");
    if (reason.trim().length < 3) {
      setManualError("Please give a reason");
      return;
    }
    setManualLoading(true);
    try {
      await api(`/api/sessions/${id}/manual`, {
        method: "POST",
        token,
        body: { studentId: manualFor.studentId, note: reason.trim() },
      });
      setManualFor(null);
      setReason("");
      await loadSession();
    } catch (e) {
      setManualError(errorMessage(e));
    } finally {
      setManualLoading(false);
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Session" />
        {error ? <Text style={[styles.error, { margin: 20 }]}>{error}</Text> : <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}
      </SafeAreaView>
    );
  }

  const isOpen = session.status === "OPEN";
  const windowEnd = new Date(session.startsAt).getTime() + session.windowMins * 60_000;
  const remaining = Math.max(0, Math.floor((windowEnd - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const presentIds = new Set(session.attendances.map((a) => a.student.id));
  const notYet = roster.filter((r) => !presentIds.has(r.studentId));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={session.course.code} subtitle={session.topic || session.course.title} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }}>
        {!!error && <Text style={styles.error}>{error}</Text>}

        {isOpen ? (
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: beacon.status === "on" ? "#16A34A" : beacon.status === "error" ? colors.danger : colors.muted }]} />
              <Text style={styles.statusText}>
                {beacon.status === "on" ? "Broadcasting to nearby students"
                  : beacon.status === "error" ? "Not broadcasting"
                  : "Starting beacon..."}
              </Text>
            </View>
            {beacon.status === "error" && <Text style={styles.error}>{beacon.message}</Text>}

            <Text style={styles.timer}>{remaining > 0 ? `${mm}:${ss}` : "Window ended"}</Text>
            <Text style={styles.hint}>
              {remaining > 0 ? "left for students to mark attendance" : "Students can no longer mark attendance. Close the session when class ends."}
            </Text>

            {__DEV__ && !!beacon.code && (
              <Text style={styles.dev}>Dev only: current beacon code {beacon.code}</Text>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.statusText}>Session closed</Text>
            <Text style={styles.hint}>{session.attendances.length} students were marked present.</Text>
          </View>
        )}

        <Text style={styles.section}>Present ({session.attendances.length})</Text>
        {session.attendances.length === 0 && <Text style={styles.empty}>Nobody yet.</Text>}
        {session.attendances.map((a) => (
          <View key={a.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{a.student.user.fullName}</Text>
              <Text style={styles.meta}>
                {a.student.matricNo} · {fmtTime(a.markedAt)}
                {a.method === "MANUAL" ? ` · manual: ${a.note}` : ""}
              </Text>
            </View>
            <Text style={[styles.badge, a.method === "MANUAL" && { color: "#B45309" }]}>
              {a.method === "MANUAL" ? "MANUAL" : "VERIFIED"}
            </Text>
          </View>
        ))}

        {notYet.length > 0 && (
          <>
            <Text style={styles.section}>Not yet marked ({notYet.length})</Text>
            {notYet.map((r) => (
              <View key={r.studentId} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.fullName}</Text>
                  <Text style={styles.meta}>{r.matricNo}</Text>
                </View>
                <Pressable onPress={() => { setManualFor(r); setReason(""); setManualError(""); }} hitSlop={8}>
                  <Text style={styles.link}>Mark present</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {isOpen && (
          <View style={{ marginTop: 28 }}>
            <Button title="Close session" variant="outline" onPress={confirmClose} loading={closing} />
          </View>
        )}
      </ScrollView>

      <Modal visible={!!manualFor} transparent animationType="fade" onRequestClose={() => setManualFor(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.cardTitle}>Mark {manualFor?.fullName} present</Text>
            <Text style={styles.hint}>This is recorded as a manual entry with your reason.</Text>
            <TextInput
              style={styles.input}
              placeholder="Reason (e.g. phone battery died)"
              placeholderTextColor={colors.muted}
              value={reason}
              onChangeText={setReason}
            />
            {!!manualError && <Text style={styles.error}>{manualError}</Text>}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}><Button title="Cancel" variant="outline" onPress={() => setManualFor(null)} /></View>
              <View style={{ flex: 1 }}><Button title="Mark" onPress={submitManual} loading={manualLoading} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 18, alignItems: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: "600", color: colors.text },
  timer: { fontSize: 40, fontWeight: "700", color: colors.text, marginTop: 14 },
  hint: { fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center" },
  dev: { fontSize: 12, color: colors.muted, marginTop: 12 },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 26, marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
  badge: { fontSize: 11, fontWeight: "700", color: "#16A34A" },
  link: { fontSize: 13, fontWeight: "600", color: colors.primary },
  empty: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14, marginTop: 8, textAlign: "center" },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    marginTop: 14,
  },
});
