import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GlassChip } from "@/components/ui/GlassChip";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { ENTRY_KINDS, type EntryFilter, type EntryKind } from "@/domain/days";
import { useTheme } from "@/theme/ThemeProvider";

/** DAYS-11 · Search and filter: words, kinds of moment, and whose. */
export function FilterSheet({
  visible,
  initial,
  partnerName,
  onApply,
  onClose,
}: {
  visible: boolean;
  initial: EntryFilter | null;
  partnerName: string;
  onApply: (filter: EntryFilter | null) => void;
  onClose: () => void;
}) {
  const { spacing } = useTheme();
  const [query, setQuery] = useState(initial?.query ?? "");
  const [kinds, setKinds] = useState<readonly EntryKind[]>(initial?.kinds ?? []);
  const [who, setWho] = useState<EntryFilter["who"]>(initial?.who ?? "both");
  const toggle = (k: EntryKind) => {
    setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));
  };
  const empty = query.trim().length === 0 && kinds.length === 0 && who === "both";
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Find a moment"
      footer={
        <>
          <Button
            label="Show moments"
            onPress={() => {
              onApply(empty ? null : { query: query.trim(), kinds, who });
            }}
          />
          <Button
            label="Clear"
            variant="text"
            disabled={empty}
            onPress={() => {
              setQuery("");
              setKinds([]);
              setWho("both");
            }}
          />
        </>
      }
    >
      <TextField
        label="Search"
        placeholder="Coffee, rain, sunset…"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoCorrect={false}
      />
      <Segmented
        label="Whose moments"
        options={[
          { label: "Both", value: "both" },
          { label: "Mine", value: "me" },
          { label: partnerName, value: "partner" },
        ]}
        value={who}
        onChange={setWho}
      />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="footnote" color="textSecondary" weight="500">
          Kind
        </AppText>
        <View accessibilityRole="list" style={[styles.wrap, { gap: spacing.sm }]}>
          {ENTRY_KINDS.map((k) => (
            <GlassChip
              key={k.kind}
              role="checkbox"
              leading={k.emoji}
              label={k.label}
              selected={kinds.includes(k.kind)}
              onPress={() => {
                toggle(k.kind);
              }}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap" },
});
