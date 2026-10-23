import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, FadeOutUp, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTheme } from "@/theme/ThemeProvider";
import { touchTarget } from "@/theme/tokens";

export type ToastTone = "info" | "success" | "error";

interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (text: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * SYS-02: toasts auto-dismiss after 4 s; errors stay until dismissed. Always announced. In
 * Daylight Glass (P-48) a toast is a glass capsule that drops from under the status bar with a
 * spring, like iOS's Dynamic Island; under reduced motion it fades.
 */
const AUTO_DISMISS_MS = 4000;

const ICON: Record<ToastTone, IconName> = { info: "sparkle", success: "check", error: "alert" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const show = useCallback((text: string, tone: ToastTone = "info") => {
    setToast({ id: Date.now(), text, tone });
    AccessibilityInfo.announceForAccessibility(text);
  }, []);
  const api = useMemo(() => ({ show }), [show]);

  useEffect(() => {
    if (toast === null || toast.tone === "error") return;
    const id = setTimeout(() => {
      setToast(null);
    }, AUTO_DISMISS_MS);
    return () => {
      clearTimeout(id);
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast === null ? null : (
        <ToastView
          key={toast.id}
          toast={toast}
          onDismiss={() => {
            setToast(null);
          }}
        />
      )}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const { colors, radii, spacing, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const tint =
    toast.tone === "error"
      ? colors.danger
      : toast.tone === "success"
        ? colors.success
        : colors.accent;
  return (
    <Animated.View
      {...(reduceMotion
        ? { entering: FadeIn.duration(120), exiting: FadeOut.duration(120) }
        : {
            entering: SlideInUp.springify().damping(17).stiffness(220),
            exiting: FadeOutUp.duration(180),
          })}
      style={[styles.wrap, { top: insets.top + spacing.sm, paddingHorizontal: spacing.lg }]}
      pointerEvents="box-none"
    >
      <Glass
        radius={radii.pill}
        style={styles.toast}
        contentStyle={[styles.content, { gap: spacing.sm, paddingLeft: spacing.lg }]}
      >
        <View
          accessibilityRole={toast.tone === "error" ? "alert" : "text"}
          accessibilityLiveRegion={toast.tone === "error" ? "assertive" : "polite"}
          style={[styles.content, styles.flexRow, { gap: spacing.sm }]}
        >
          <Icon name={ICON[toast.tone]} size={18} color={tint} />
          <AppText variant="callout" weight="500" style={styles.flex}>
            {toast.text}
          </AppText>
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.close}
        >
          <Icon name="x" size={18} color={colors.textSecondary} />
        </Pressable>
      </Glass>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  toast: { maxWidth: 440, width: "100%" },
  content: { flexDirection: "row", alignItems: "center", minHeight: 52 },
  flexRow: { flex: 1 },
  flex: { flex: 1, paddingVertical: 12 },
  close: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
