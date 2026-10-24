import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Sheet } from "@/components/ui/Sheet";
import { formatMessageTime, type ChatMessage } from "@/domain/chat";
import { useTheme } from "@/theme/ThemeProvider";

export function MessageDetailsSheet({
  visible,
  message,
  myZone = "Africa/Addis_Ababa",
  partnerZone = "Europe/London",
  readReceiptsEnabled = false,
  onClose,
}: {
  visible: boolean;
  message: ChatMessage | null;
  myZone?: string;
  partnerZone?: string;
  readReceiptsEnabled?: boolean;
  onClose: () => void;
}) {
  const { colors, spacing } = useTheme();

  if (!message) return null;

  const timeMine = formatMessageTime(message.createdAt, myZone);
  const timePartner = formatMessageTime(message.createdAt, partnerZone);

  const editedTimeMine = message.editedAt ? formatMessageTime(message.editedAt, myZone) : null;
  const editedTimePartner = message.editedAt
    ? formatMessageTime(message.editedAt, partnerZone)
    : null;

  return (
    <Sheet visible={visible} onClose={onClose} title="Message details">
      <View style={{ gap: spacing.md, paddingBottom: spacing.lg }}>
        {/* Sent time */}
        <View style={styles.detailRow}>
          <AppText variant="callout" color="textSecondary">
            Sent
          </AppText>
          <View style={styles.valuesCol}>
            <AppText variant="callout" weight="500">
              {timeMine} (Addis Ababa)
            </AppText>
            <AppText variant="caption" color="textTertiary">
              {timePartner} (London)
            </AppText>
          </View>
        </View>

        {/* Edited time if edited */}
        {message.editedAt ? (
          <View
            style={[
              styles.detailRow,
              {
                borderTopColor: colors.border,
                borderTopWidth: StyleSheet.hairlineWidth,
                paddingTop: spacing.sm,
              },
            ]}
          >
            <AppText variant="callout" color="textSecondary">
              Edited
            </AppText>
            <View style={styles.valuesCol}>
              <AppText variant="callout" weight="500">
                {editedTimeMine} (Addis Ababa)
              </AppText>
              <AppText variant="caption" color="textTertiary">
                {editedTimePartner} (London)
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Delivery / Read Status */}
        {/* U-35: delivery state is shown only as 'Sent' unless read receipts are enabled for both */}
        <View
          style={[
            styles.detailRow,
            {
              borderTopColor: colors.border,
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingTop: spacing.sm,
            },
          ]}
        >
          <AppText variant="callout" color="textSecondary">
            Status
          </AppText>
          <View style={styles.valuesCol}>
            <AppText variant="callout" weight="500">
              {readReceiptsEnabled ? "Read" : "Sent"}
            </AppText>
            {!readReceiptsEnabled ? (
              <AppText variant="caption" color="textTertiary">
                Read receipts are off (U-35)
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  valuesCol: {
    alignItems: "flex-end",
    gap: 2,
  },
});
