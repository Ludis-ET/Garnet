import { AVATAR_MAX_BASE64 } from "@garnet/contracts";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export type PickedPicture =
  { ok: true; base64: string } | { ok: false; reason: "cancelled" | "failed" };

/** Sizes tried, largest first, until the picture fits what the API accepts (P-98). */
const ATTEMPTS = [
  { width: 360, compress: 0.75 },
  { width: 320, compress: 0.6 },
  { width: 256, compress: 0.5 },
] as const;

/**
 * One photo from the phone's gallery (P-98), cropped square by the system picker, then made
 * small on the phone: a JPEG of at most 360 px that fits the API's limit. The system picker
 * needs no permission (Android 13+ photo picker, iOS PHPicker): Garnet sees only the one photo
 * chosen, nothing else in the library.
 */
export async function pickPicture(): Promise<PickedPicture> {
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      exif: false,
    });
  } catch {
    return { ok: false, reason: "failed" };
  }
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return { ok: false, reason: "cancelled" };
  try {
    for (const { width, compress } of ATTEMPTS) {
      const image = await ImageManipulator.manipulate(asset.uri).resize({ width }).renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
      if (saved.base64 !== undefined && saved.base64.length <= AVATAR_MAX_BASE64)
        return { ok: true, base64: saved.base64 };
    }
  } catch {
    return { ok: false, reason: "failed" };
  }
  return { ok: false, reason: "failed" };
}
