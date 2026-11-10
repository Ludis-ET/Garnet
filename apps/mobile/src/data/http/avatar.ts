import type { AvatarDto } from "@garnet/contracts";
import { DEMO_PHOTOS, type AvatarChoice } from "@/data/fixtures/demoProfile";
import { API_URL } from "./config";

/**
 * The app's picture from the API's (P-98). A real image becomes the address of its file, which
 * only the owner and their partner may load (with the session, see AuthImage); its version is in
 * the address, so a new picture is never mistaken for an old one cached on the phone.
 */
export function avatarFromDto(a: AvatarDto, whose: "me" | "partner"): AvatarChoice {
  if (a.kind === "initials") return a;
  if (a.kind === "image") {
    if (API_URL === null) return { kind: "initials", swatch: 0 };
    const path = whose === "me" ? "/v1/me/avatar" : "/v1/partner/avatar";
    return { kind: "image", uri: `${API_URL}${path}?v=${a.version}` };
  }
  const photo = DEMO_PHOTOS.find((p) => p === a.photo);
  return photo === undefined ? { kind: "initials", swatch: 0 } : { kind: "photo", photo };
}
