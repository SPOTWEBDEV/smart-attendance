// components/ProfileTab.tsx  -  the Profile page inside the student and lecturer dashboards
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Card, SectionTitle } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

export const initialsOf = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

type Profile = {
  user: { id: string; fullName: string; email: string; role: "STUDENT" | "LECTURER"; createdAt: string };
  student: {
    matricNo: string;
    department: string;
    level: number;
    _count: { enrollments: number };
    device: { model: string | null; platform: string | null; createdAt: string } | null;
  } | null;
  lecturer: { staffId: string; department: string; _count: { courses: number } } | null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ProfileTab() {
  const router = useRouter();
  const { token, updateUser, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    try {
      setProfile(await api<Profile>("/api/me", { token }));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  if (!profile) return <Text style={styles.error}>{error || "Couldn't load your profile."}</Text>;

  const { user, student, lecturer } = profile;
  const isStudent = user.role === "STUDENT";

  function openEdit() {
    setFullName(user.fullName);
    setDepartment(student?.department ?? "");
    setLevel(student ? String(student.level) : "");
    setEditError("");
    setEditing(true);
  }

  async function save() {
    setEditError("");
    const levelNum = parseInt(level, 10);
    if (fullName.trim().length < 2) {
      setEditError("Enter your full name");
      return;
    }
    if (isStudent && (!department.trim() || !Number.isInteger(levelNum) || levelNum < 100)) {
      setEditError("Enter your department and a level like 100, 200, 300...");
      return;
    }

    setSaving(true);
    try {
      await api("/api/me", {
        method: "PATCH",
        token,
        body: isStudent
          ? { fullName: fullName.trim(), department: department.trim(), level: levelNum }
          : { fullName: fullName.trim() },
      });
      await updateUser({ fullName: fullName.trim() }); // keeps the greeting up to date
      setEditing(false);
      await load();
    } catch (e) {
      setEditError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/role");
        },
      },
    ]);
  }

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user.fullName)}</Text>
        </View>
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.roleBadge}>{isStudent ? "STUDENT" : "LECTURER"}</Text>
      </View>

      <SectionTitle>Details</SectionTitle>
      <Card>
        {student && (
          <>
            <Row label="Matric number" value={student.matricNo} />
            <Row label="Department" value={student.department} />
            <Row label="Level" value={`${student.level} Level`} />
            <Row label="Courses" value={student._count.enrollments} />
          </>
        )}
        {lecturer && (
          <>
            <Row label="Staff ID" value={lecturer.staffId} />
            <Row label="Department" value={lecturer.department} />
            <Row label="Courses" value={lecturer._count.courses} />
          </>
        )}
        <Row label="Member since" value={fmtDate(user.createdAt)} />
      </Card>

      {isStudent && (
        <>
          <SectionTitle>Linked phone</SectionTitle>
          <Card>
            {student?.device ? (
              <>
                <Text style={styles.deviceName}>
                  {student.device.model ?? "Your phone"}
                  {student.device.platform ? ` (${student.device.platform})` : ""}
                </Text>
                <Text style={styles.hint}>
                  Linked on {fmtDate(student.device.createdAt)}. Only this phone can mark your attendance.
                  If you change phones, ask the admin to reset it.
                </Text>
              </>
            ) : (
              <Text style={styles.hint}>No phone is linked yet. Go to the Overview tab to link this phone.</Text>
            )}
          </Card>
        </>
      )}

      <View style={{ marginTop: 24, gap: 10 }}>
        <Button title="Edit profile" onPress={openEdit} />
        <Button
          title="Change password"
          variant="outline"
          onPress={() => router.push(isStudent ? "/student/change-password" : "/lecturer/change-password")}
        />
        <Button title="Sign out" variant="outline" onPress={confirmSignOut} />
      </View>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit profile</Text>
            <View style={{ marginTop: 16 }}>
              <Field label="Full name" autoCapitalize="words" value={fullName} onChangeText={setFullName} />
              {isStudent ? (
                <>
                  <Field label="Department" autoCapitalize="words" value={department} onChangeText={setDepartment} />
                  <Field label="Level" keyboardType="number-pad" maxLength={3} value={level} onChangeText={setLevel} />
                </>
              ) : (
                <Text style={styles.hint}>Your department and Staff ID are managed by the admin.</Text>
              )}
            </View>
            {!!editError && <Text style={styles.error}>{editError}</Text>}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1 }}><Button title="Cancel" variant="outline" onPress={() => setEditing(false)} /></View>
              <View style={{ flex: 1 }}><Button title="Save" onPress={save} loading={saving} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 30, fontWeight: "700", color: colors.white },
  name: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 14, textAlign: "center" },
  email: { fontSize: 14, color: colors.muted, marginTop: 4 },
  roleBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: "#FDF3F1",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowValue: { fontSize: 14, fontWeight: "600", color: colors.text, flexShrink: 1, textAlign: "right" },
  deviceName: { fontSize: 15, fontWeight: "600", color: colors.text },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 4 },
  error: { color: colors.danger, fontSize: 14, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: colors.card, borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
});
