import {
  avatarSchema,
  notificationPrefsSchema,
  SETUP_STEPS,
  type ProfileDto,
} from "@garnet/contracts";
import { sql, type Transaction } from "kysely";
import type { Database, Viewer } from "../db/database";

type ProfileRow = Database["profile"];

/** Every person has a profile row from their first signed-in request, named from sign-up. */
export async function ensureProfile(trx: Transaction<Database>, viewer: Viewer): Promise<void> {
  const name = viewer.name.trim().slice(0, 100);
  await sql`
    insert into profile (user_id, display_name)
    values (${viewer.userId}, ${name === "" ? "You" : name})
    on conflict (user_id) do nothing`.execute(trx);
}

export async function readProfile(trx: Transaction<Database>, viewer: Viewer): Promise<ProfileRow> {
  return trx
    .selectFrom("profile")
    .selectAll()
    .where("user_id", "=", viewer.userId)
    .executeTakeFirstOrThrow();
}

/** A stored profile as the app sees it; anything malformed falls back to safe defaults. */
export function toProfileDto(row: ProfileRow): ProfileDto {
  const avatar = avatarSchema.safeParse(row.avatar);
  const notifications = notificationPrefsSchema.safeParse(row.notifications);
  return {
    displayName: row.display_name,
    nickname: row.nickname,
    side: row.side,
    avatar: avatar.success ? avatar.data : { kind: "initials", swatch: 0 },
    timeZone: row.time_zone,
    homeCity: row.home_city,
    appearance: row.appearance,
    accent: row.accent,
    notifications: notifications.success
      ? notifications.data
      : { status: "unset", thoughts: true, support: true, days: true },
    done: SETUP_STEPS.filter((s) => row.done.includes(s)),
    complete: row.complete,
  };
}
