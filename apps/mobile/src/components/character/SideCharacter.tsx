import { CharacterSlot } from "@/components/character/CharacterSlot";
import type { Pose } from "@/components/character/characterAssets";
import { FRAME_ASPECT } from "@/features/figures/art/figure";
import { useMySide } from "@/features/setup/useMySide";

/**
 * The viewer's own character on personal screens and sheets (owner direction P-55): Ruby for a
 * Ruby person, Sapphire for a Sapphire person, Garnet before a side is chosen or when `shared`
 * (pages for both). Owner images only, via CharacterSlot (rule 5). Decorative.
 */
export function SideCharacter({
  pose,
  size,
  shared = false,
}: {
  pose: Pose;
  size: number;
  shared?: boolean;
}) {
  const side = useMySide();
  return (
    <CharacterSlot
      character={shared || side === null ? "garnet" : side}
      pose={pose}
      size={size}
      aspectRatio={FRAME_ASPECT}
    />
  );
}
