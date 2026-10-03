// components/Button.tsx
import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
};

export function Button({ title, onPress, loading, disabled, variant = "primary" }: Props) {
  const outline = variant === "outline";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.primary,
        (pressed || disabled) && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.text, { color: outline ? colors.primary : colors.white }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "transparent" },
  text: { fontSize: 16, fontWeight: "600" },
});
