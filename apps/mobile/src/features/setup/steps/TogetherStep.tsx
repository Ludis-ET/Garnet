/**
 * SETUP-05b · Together since (P-79): one date for the pair, shown on both phones and used for
 * the anniversary. Optional (Skip). If the partner already said, it shows their answer to keep
 * or change; either of them may change it later, and the change is the pair's.
 */
import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { DateField } from "@/components/ui/DateField";
import { useTheme } from "@/theme/ThemeProvider";

export function TogetherStep({
  value,
  partnerName,
  fromPartner,
  error,
  onChange,
}: {
  value: string | null;
  partnerName: string;
  /** True when the date showing is the partner's answer. */
  fromPartner: boolean;
  error?: string;
  onChange: (iso: string | null) => void;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <AppText variant="body" color="textSecondary">
        {fromPartner && partnerName !== ""
          ? `${partnerName} said this. Keep it, or change it for you both.`
          : "The day you two got together. You'll both see it, and Garnet remembers it for you."}
      </AppText>
      <DateField
        label="Together since"
        value={value}
        onChange={onChange}
        {...(error === undefined ? {} : { error })}
      />
    </View>
  );
}
