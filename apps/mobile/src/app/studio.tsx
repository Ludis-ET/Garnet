import { useLocalSearchParams } from "expo-router";
import { FigureStudio } from "@/features/figures/FigureStudio";

/**
 * Temporary home: the Figure Studio (owner directions P-41, P-43). Replaced by HOME-01 once its
 * design exists (gate B-04). Deep links such as `/?scene=birthday` pick a scene.
 */
export default function HomeRoute() {
  const params = useLocalSearchParams<{
    scene?: string;
    cast?: string;
    mood?: string;
    occasion?: string;
    bubble?: string;
  }>();
  // Params can arrive after the first render on web; remount so the reducer starts from them.
  return <FigureStudio key={JSON.stringify(params)} params={params} />;
}
