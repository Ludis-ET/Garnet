import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { GlassScreen } from "@/components/ui/GlassScreen";
import { Icon, type IconName } from "@/components/ui/Icon";
import { goBack } from "@/navigation/goBack";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

/**
 * A settings page (prompt 15): the shared glass frame with a Back button and a small centred
 * title, then a large title and the page's groups. Back falls back to Settings (P-62 goBack).
 */
export function SettingsPage({
  title,
  intro,
  back = "/settings",
  children,
}: {
  title: string;
  intro?: string;
  back?: "/settings" | "/home";
  children: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <GlassScreen
      wash="none"
      onBack={() => {
        goBack(back);
      }}
      header={
        <AppText variant="headline" numberOfLines={1} style={styles.center}>
          {title}
        </AppText>
      }
      headerRight={<View style={styles.side} />}
    >
      {intro === undefined ? null : (
        <AppText variant="callout" color="textSecondary" style={{ marginTop: -spacing.sm }}>
          {intro}
        </AppText>
      )}
      {children}
    </GlassScreen>
  );
}

/** An iOS inset group on glass: a small header, rows split by hairlines, an optional footnote. */
export function SettingsSection({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string | undefined;
  children: ReactNode;
}) {
  const { colors, radii, spacing } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: spacing.xs }}>
      {title === undefined ? null : (
        <AppText
          variant="caption"
          weight="600"
          color="textSecondary"
          accessibilityRole="header"
          style={styles.sectionTitle}
        >
          {title.toUpperCase()}
        </AppText>
      )}
      <Glass radius={radii.lg + 2} contentStyle={styles.group}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i === 0 ? null : (
              <View style={[styles.hairline, { backgroundColor: colors.glassHairline }]} />
            )}
            {row}
          </Fragment>
        ))}
      </Glass>
      {footer === undefined ? null : (
        <AppText variant="caption" color="textTertiary" style={styles.sectionTitle}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

/** One row: a coloured icon tile, the label, an optional value, and a chevron or a control. */
export function SettingsRow({
  icon,
  tint,
  label,
  value,
  detail,
  onPress,
  right,
  destructive = false,
  disabled = false,
  badge,
}: {
  icon?: IconName;
  /** The icon tile's colour (iOS-style); defaults to the accent. */
  tint?: string;
  label: string;
  value?: string;
  /** A second line under the label. */
  detail?: string | undefined;
  onPress?: () => void;
  /** A control instead of the chevron (a toggle). */
  right?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  badge?: string;
}) {
  const { colors } = useTheme();
  const tile = tint ?? (destructive ? colors.danger : colors.accent);
  const body = (
    <View style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}>
      {icon === undefined ? null : (
        <View style={[styles.tile, { backgroundColor: tile }]}>
          <Icon name={icon} size={17} color="#FFFFFF" />
        </View>
      )}
      <View style={styles.flex}>
        <AppText variant="body" color={destructive ? "danger" : "textPrimary"}>
          {label}
        </AppText>
        {detail === undefined ? null : (
          <AppText variant="caption" color="textSecondary">
            {detail}
          </AppText>
        )}
      </View>
      {badge === undefined ? null : (
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <AppText variant="caption" weight="600" color="accent">
            {badge}
          </AppText>
        </View>
      )}
      {value === undefined ? null : (
        <AppText variant="callout" color="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      )}
      {right ??
        (onPress === undefined ? null : (
          <Icon name="chevron-right" size={16} color={colors.textTertiary} />
        ))}
    </View>
  );
  if (onPress === undefined || right !== undefined) return body;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.glassHighlight : undefined })}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  side: { width: 44, height: 44 },
  sectionTitle: { paddingHorizontal: 16, letterSpacing: 0.3 },
  group: { paddingVertical: 2 },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: touchTarget + 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tile: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  value: { maxWidth: "45%" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
