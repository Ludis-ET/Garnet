import { randomUUID } from "node:crypto";
import { avatarSchema, type AvatarDto } from "@garnet/contracts";
import { sql, type Transaction } from "kysely";
import type { ObjectStorage } from "../media/storage/object-storage";
import type { Database, Viewer } from "../db/database";

/**
 * Real profile pictures (P-98). A picture is stored as one small file per version under the
 * owner's id; the profile's avatar names the version. Only the owner and their partner are ever
 * given the file.
 */
export type ImageType = "image/jpeg" | "image/png" | "image/webp";

export const AVATAR_BUCKET = process.env["GARNET_MEDIA_BUCKET"] ?? "garnet-media";
export const avatarKey = (userId: string, version: string) => `avatars/${userId}/${version}`;

/** The image type its first bytes say, or null: the declared type alone is never trusted. */
export function sniffImage(bytes: Buffer): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return "image/webp";
  return null;
}

/** The avatar stored for a profile row, or initials when it is missing or malformed. */
export function avatarOf(raw: unknown): AvatarDto {
  const parsed = avatarSchema.safeParse(typeof raw === "string" ? safeJson(raw) : raw);
  return parsed.success ? parsed.data : { kind: "initials", swatch: 0 };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Stores a new picture for the viewer and makes it theirs; the previous file is removed after
 * the profile points at the new one, so a failure never leaves the profile without its file.
 */
export async function saveAvatar(
  storage: ObjectStorage,
  viewer: Viewer,
  bytes: Buffer,
  type: ImageType,
  asViewer: <T>(fn: (trx: Transaction<Database>) => Promise<T>) => Promise<T>,
  /** The person chose it (the picture step is then done); false for the account's own. */
  chosen = true,
): Promise<AvatarDto> {
  const version = randomUUID();
  await storage.putObject(AVATAR_BUCKET, avatarKey(viewer.userId, version), bytes, type);
  const avatar: AvatarDto = { kind: "image", version };
  const before = await asViewer(async (trx) => {
    const row = await trx
      .selectFrom("profile")
      .select("avatar")
      .where("user_id", "=", viewer.userId)
      .executeTakeFirst();
    await trx
      .updateTable("profile")
      .set({
        avatar: JSON.stringify(avatar),
        ...(chosen
          ? { done: sql<string[]>`(select array(select distinct unnest(done || array['photo'])))` }
          : {}),
        updated_at: sql<Date>`now()`,
      })
      .where("user_id", "=", viewer.userId)
      .execute();
    return avatarOf(row?.avatar);
  });
  if (before.kind === "image")
    await storage
      .deleteObject(AVATAR_BUCKET, avatarKey(viewer.userId, before.version))
      .catch(() => undefined);
  return avatar;
}

/** Google's picture hosts; nothing else is ever fetched (no request forgery through `image`). */
const GOOGLE_PICTURE_HOST = /^lh[0-9]\.googleusercontent\.com$/;
const IMPORT_MAX_BYTES = 1024 * 1024;

/**
 * The sign-in account's picture (Google's), fetched once at setup so the app shows it without
 * any phone asking Google for it. Only https on Google's picture hosts, no redirects, 4 seconds,
 * at most 1 MB, and only a real image. Null for anything else.
 */
export async function fetchAccountPicture(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ bytes: Buffer; type: ImageType } | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !GOOGLE_PICTURE_HOST.test(parsed.hostname)) return null;
  // Google sizes the picture by the suffix: ask for one as large as the app draws it.
  const sized = parsed.href.replace(/=s\d+(-c)?$/, "=s360-c");
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 4000);
  try {
    const res = await fetchImpl(sized, { redirect: "error", signal: controller.signal });
    if (!res.ok) return null;
    const length = Number(res.headers.get("content-length") ?? "0");
    if (length > IMPORT_MAX_BYTES) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > IMPORT_MAX_BYTES) return null;
    const type = sniffImage(bytes);
    return type === null ? null : { bytes, type };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
