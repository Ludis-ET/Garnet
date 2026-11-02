/**
 * The phone's location for "how far apart" (owner direction P-66): asked for while the app is
 * open (never in the background), read once at low accuracy and rounded to about 11 km before
 * anything keeps it. If the person says no, or the device has none, the distance falls back to
 * their time zone; nothing asks them to type a place.
 */
import * as Location from "expo-location";
import { useEffect, useEffectEvent, useRef } from "react";
import { coarsen, type Point } from "@/domain/location";
import { useSettings } from "@/features/settings/useSettings";
import { useSaveLocation } from "@/features/us/useUs";

export type DeviceLocation =
  { kind: "ok"; point: Point } | { kind: "denied" } | { kind: "unavailable" };

export async function readCoarseLocation(): Promise<DeviceLocation> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) return { kind: "denied" };
    const at = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
    return { kind: "ok", point: coarsen(at.coords.latitude, at.coords.longitude) };
  } catch {
    return { kind: "unavailable" };
  }
}

/**
 * Reads the location once per visit when this person shares distance, and keeps the rounded
 * point. Turning sharing off forgets it.
 */
export function useAutoLocation(): void {
  const settings = useSettings().data?.settings;
  const save = useSaveLocation();
  const share = settings?.location.share;
  const asked = useRef(false);
  const update = useEffectEvent(async () => {
    const result = await readCoarseLocation();
    if (result.kind === "ok") save.mutate(result.point);
  });
  const forget = useEffectEvent(() => {
    save.mutate(null);
  });
  useEffect(() => {
    if (share === undefined) return;
    if (!share) {
      asked.current = false;
      forget();
      return;
    }
    if (asked.current) return;
    asked.current = true;
    void update();
  }, [share]);
}
