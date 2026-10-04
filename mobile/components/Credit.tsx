// components/Credit.tsx  -  who built the app (shown on the first two screens)
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export function Credit({ light }: { light?: boolean }) {
  const main = light ? "rgba(255,255,255,0.95)" : colors.text;
  const sub = light ? "rgba(255,255,255,0.65)" : colors.muted;
  return (
    <View style={styles.box}>
      <Text style={[styles.small, { color: sub }]}>Designed and developed by</Text>
      <Text style={[styles.name, { color: main }]}>Ezea Ugochukwu Micheal</Text>
      <Text style={[styles.small, { color: sub }]}>300 Level project · Computer Engineering · ESUT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", gap: 2 },
  small: { fontSize: 12 },
  name: { fontSize: 15, fontWeight: "700" },
});
