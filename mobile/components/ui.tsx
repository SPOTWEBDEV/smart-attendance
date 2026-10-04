// components/ui.tsx  -  small building blocks for the dashboards (no chart library needed)
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "@/lib/theme";

export const GOOD = "#16A34A";
export const WARN = "#D97706";

// green at or above the minimum, amber a little below, red well below
export function percentColor(p: number, min = 75) {
  if (p >= min) return GOOD;
  if (p >= min - 15) return WARN;
  return colors.danger;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={s.section}>{children}</Text>;
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {!!hint && <Text style={s.statHint}>{hint}</Text>}
    </View>
  );
}

export function ProgressBar({ percent, color = colors.primary, height = 8 }: { percent: number; color?: string; height?: number }) {
  const width = `${Math.max(0, Math.min(100, percent))}%` as `${number}%`;
  return (
    <View style={[s.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.segment}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[s.segmentItem, value === o && s.segmentActive]}>
          <Text style={[s.segmentText, value === o && s.segmentTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export type Bar = { label: string; value: number; color?: string };

export function BarChart({
  data,
  max,
  height = 110,
  suffix = "",
  color = colors.primary,
}: {
  data: Bar[];
  max?: number;
  height?: number;
  suffix?: string;
  color?: string;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: height + 40 }}>
      {data.map((d, i) => (
        <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <Text style={s.barValue}>{d.value}{suffix}</Text>
          <View
            style={{
              width: "70%",
              maxWidth: 34,
              height: Math.max(4, (d.value / top) * height),
              borderRadius: 6,
              backgroundColor: d.color ?? color,
            }}
          />
          <Text style={s.barLabel} numberOfLines={1}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  section: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  statValue: { fontSize: 24, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 4 },
  statHint: { fontSize: 11, color: colors.muted, marginTop: 2 },
  track: { backgroundColor: "#EEF2F6", overflow: "hidden" },
  segment: { flexDirection: "row", backgroundColor: "#EEF2F6", borderRadius: 12, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  segmentTextActive: { color: colors.primary },
  barValue: { fontSize: 10, color: colors.muted, marginBottom: 4 },
  barLabel: { fontSize: 10, color: colors.muted, marginTop: 6 },
});
