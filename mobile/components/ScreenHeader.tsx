// components/ScreenHeader.tsx
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

type Props = { title: string; subtitle?: string; right?: ReactNode; hideBack?: boolean };

export function ScreenHeader({ title, subtitle, right, hideBack }: Props) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {!hideBack && (
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {!!subtitle && <Text numberOfLines={1} style={styles.sub}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
