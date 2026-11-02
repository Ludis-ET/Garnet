import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/ui/AppText";
import { noOutline } from "@/components/ui/TextField";
import type { LetterStyle, PaperFont, PaperTone } from "@/domain/models";
import { DEFAULT_LETTER_STYLE } from "@/domain/openWhen";
import { useTheme } from "@/theme/ThemeProvider";
import { ENTER } from "@/theme/transitions";

export type { PaperFont, PaperTone };

/** Paper colours (art direction for the letter surface; light enough for AA ink). */
const TONES: Record<
  PaperTone,
  { label: string; top: string; bottom: string; line: string; dot: string }
> = {
  cream: {
    label: "Cream",
    top: "#FFFBF3",
    bottom: "#FBF2E2",
    line: "rgba(160,120,80,0.16)",
    dot: "#E9D8BC",
  },
  rose: {
    label: "Rose",
    top: "#FFF5F7",
    bottom: "#FDE6EC",
    line: "rgba(200,60,100,0.14)",
    dot: "#F7B9C8",
  },
  sky: {
    label: "Sky",
    top: "#F5F9FF",
    bottom: "#E3EEFF",
    line: "rgba(60,100,200,0.14)",
    dot: "#B7CDF6",
  },
  lilac: {
    label: "Lilac",
    top: "#F9F6FF",
    bottom: "#ECE4FF",
    line: "rgba(110,70,220,0.14)",
    dot: "#CDBDF5",
  },
};
const INK = "#2A2131";
/** One ruled line (P-71: roomier than before, so the letter reads large). */
const LINE = 36;
/** A fresh sheet is this many lines tall, so there's room to write before it grows. */
const MIN_LINES_WRITING = 14;
const MIN_LINES_READING = 6;

/**
 * OPEN-03 · The letter paper (P-62, enlarged P-71): tinted paper with faint ruled lines, "Dear
 * Noah," at the top and the author's name signed at the bottom, in serif, serif italic or a
 * clean sans. While writing, the sheet grows with every line and never scrolls inside itself;
 * a small toolbar picks the paper and the hand. The same paper, colour and hand show again
 * when the letter is read (`readOnly`), so it looks exactly as it was written. Always dark ink
 * on light paper, in both schemes; no outline and no word count.
 */
export function LetterPaper({
  body,
  onChange,
  to,
  from,
  placeholder = "",
  paper,
  onPaperChange,
  readOnly = false,
  signedAt,
}: {
  body: string;
  onChange?: (text: string) => void;
  to: string;
  from: string;
  placeholder?: string;
  /** The paper and hand; when left out, the sheet keeps its own (cream, serif). */
  paper?: LetterStyle;
  onPaperChange?: (paper: LetterStyle) => void;
  /** Reading a letter: no toolbar, nothing editable, the same sheet. */
  readOnly?: boolean;
  /** Shown under the signature when reading ("Opened 21:04 Addis Ababa"). */
  signedAt?: string;
}) {
  const { radii, spacing, typography } = useTheme();
  const [own, setOwn] = useState<LetterStyle>(paper ?? DEFAULT_LETTER_STYLE);
  const style = paper ?? own;
  const setStyle = (next: LetterStyle) => {
    setOwn(next);
    onPaperChange?.(next);
  };
  const [height, setHeight] = useState(0);
  // Where the writing starts, so each rule sits just under a line of text (not through it).
  const [bodyTop, setBodyTop] = useState(96);
  const t = TONES[style.tone];
  const family =
    style.font === "clean"
      ? typography.families.text["400"]
      : style.font === "italic"
        ? typography.families.displayItalic
        : typography.families.display;
  const minLines = readOnly ? MIN_LINES_READING : MIN_LINES_WRITING;
  const bodyHeight = Math.max(LINE * minLines, Math.ceil(height / LINE) * LINE);
  const lines = Math.round(bodyHeight / LINE);
  const textStyle = {
    color: INK,
    fontFamily: family,
    fontSize: style.font === "clean" ? 19 : 21,
    lineHeight: LINE,
  };
  return (
    <View style={{ gap: spacing.sm }}>
      {readOnly ? null : (
        <View style={[styles.toolbar, { gap: spacing.sm }]}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Paper"
            style={[styles.row, { gap: 6 }]}
          >
            {(Object.keys(TONES) as PaperTone[]).map((k) => {
              const on = k === style.tone;
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    setStyle({ ...style, tone: k });
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${TONES[k].label} paper`}
                  accessibilityState={{ checked: on }}
                  hitSlop={6}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: TONES[k].dot,
                      borderWidth: on ? 2.5 : 0,
                      borderColor: INK,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.flex} />
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Handwriting"
            style={[styles.row, { gap: 4 }]}
          >
            {(["serif", "italic", "clean"] as const).map((f) => {
              const on = f === style.font;
              return (
                <Pressable
                  key={f}
                  onPress={() => {
                    setStyle({ ...style, font: f });
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={f === "serif" ? "Serif" : f === "italic" ? "Italic" : "Clean"}
                  accessibilityState={{ checked: on }}
                  style={[
                    styles.fontBtn,
                    {
                      borderRadius: radii.pill,
                      backgroundColor: on ? "rgba(42,33,49,0.1)" : "transparent",
                    },
                  ]}
                >
                  <AppText
                    variant="callout"
                    serif={f !== "clean"}
                    italic={f === "italic"}
                    {...(f === "clean" ? { weight: "600" as const } : {})}
                    style={{ color: INK }}
                  >
                    Aa
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Animated.View
        key={style.tone}
        entering={ENTER}
        style={[styles.paper, { borderRadius: radii.lg + 2 }]}
      >
        <LinearGradient colors={[t.top, t.bottom]} style={StyleSheet.absoluteFill} />
        {/* Ruled lines and a margin, like real letter paper. */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { paddingTop: bodyTop + LINE - 5 }]}
        >
          {Array.from({ length: lines }, (_, i) => (
            <View
              key={i}
              style={[styles.rule, { backgroundColor: t.line, marginTop: i === 0 ? 0 : LINE - 1 }]}
            />
          ))}
        </View>
        <View pointerEvents="none" style={[styles.margin, { backgroundColor: t.line }]} />
        <View
          style={{
            paddingLeft: 48,
            paddingRight: spacing.xl,
            paddingTop: spacing.xl + 4,
            paddingBottom: spacing.xl,
          }}
        >
          <AppText variant="title" serif italic style={[styles.dear, { color: INK }]}>
            Dear {to},
          </AppText>
          {readOnly ? (
            <View
              onLayout={(e) => {
                setBodyTop(e.nativeEvent.layout.y);
              }}
              style={[styles.body, { minHeight: bodyHeight }]}
            >
              {/* Plain text in exactly the writing style, so it reads as it was written. */}
              <Text
                style={textStyle}
                onLayout={(e) => {
                  setHeight(e.nativeEvent.layout.height);
                }}
              >
                {body}
              </Text>
            </View>
          ) : (
            <TextInput
              value={body}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor="rgba(42,33,49,0.4)"
              accessibilityLabel="Your letter"
              multiline
              autoFocus
              // The sheet grows instead of scrolling (P-71).
              scrollEnabled={false}
              textAlignVertical="top"
              selectionColor={INK}
              onLayout={(e) => {
                setBodyTop(e.nativeEvent.layout.y);
              }}
              onContentSizeChange={(e) => {
                setHeight(e.nativeEvent.contentSize.height);
              }}
              style={[styles.body, noOutline, textStyle, { height: bodyHeight }]}
            />
          )}
          <AppText variant="headline" serif italic style={[styles.sign, { color: INK }]}>
            — {from}
          </AppText>
          {signedAt === undefined ? null : (
            <AppText variant="caption" style={[styles.signedAt, { color: "rgba(42,33,49,0.6)" }]}>
              {signedAt}
            </AppText>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  toolbar: { flexDirection: "row", alignItems: "center" },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  fontBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  paper: {
    overflow: "hidden",
    shadowColor: "#2B1240",
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  rule: { height: 1, marginHorizontal: 20 },
  margin: { position: "absolute", top: 0, bottom: 0, left: 32, width: 1 },
  dear: { fontSize: 26, lineHeight: 34 },
  body: { marginTop: 14, paddingVertical: 0 },
  sign: { alignSelf: "flex-end", marginTop: 16 },
  signedAt: { alignSelf: "flex-end", marginTop: 4 },
});
