import { z } from "zod";
import { isoDateSchema } from "./registration";
import { avatarSchema, sideSchema } from "./setup";

/**
 * Each person's own settings (prompt 15, SET-01 to SET-17, B2). One document per person: nothing
 * here changes what the partner gets (§5 "each person controls only their own"), and the partner
 * can never read it. Open questions stay open: quiet hours have no default window (U-21) and
 * reminders start "not chosen", which sends nothing (P-65). Previews are generic by default
 * (P-17, §5).
 */

/** Bumped when a stored document's shape changes; readSettings fills in what is missing. */
export const SETTINGS_SCHEMA_VERSION = 1;

const notifyMode = z.enum(["immediate", "quiet", "scheduled", "off"]);
/** "HH:MM", in the person's own zone. */
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const notifySchema = z
  .object({
    messages: notifyMode,
    signals: notifyMode,
    days: notifyMode,
    letters: notifyMode,
    events: notifyMode,
    account: notifyMode,
    reminders: notifyMode,
  })
  .strict();

const quietSchema = z
  .object({ on: z.boolean(), start: clockTime.nullable(), end: clockTime.nullable() })
  .strict();

const homeCardsSchema = z
  .object({
    now: z.boolean(),
    messages: z.boolean(),
    upcoming: z.boolean(),
    letters: z.boolean(),
    memory: z.boolean(),
    today: z.boolean(),
  })
  .strict();

const homeSchema = z
  .object({ ring: z.boolean(), watchers: z.boolean(), cards: homeCardsSchema })
  .strict();

const locationSchema = z.object({ share: z.boolean() }).strict();

const fields = {
  notify: notifySchema,
  sound: z.boolean(),
  vibration: z.boolean(),
  badge: z.boolean(),
  quiet: quietSchema,
  previews: z.enum(["generic", "sender", "full"]),
  /** null: not chosen yet, which sends no reminders (P-65). */
  reminders: z.enum(["off", "gentle", "custom"]).nullable(),
  partnerNickname: z.string().max(24),
  greeting: z.enum(["time", "custom"]),
  customGreeting: z.string().max(40),
  home: homeSchema,
  motion: z.enum(["system", "reduce"]),
  haptics: z.boolean(),
  location: locationSchema,
};

export const settingsSchema = z.object(fields).strict();
export type SettingsDto = z.infer<typeof settingsSchema>;

/**
 * `PATCH /v1/me/settings`: only what changed, at any depth, so two devices changing different
 * settings never undo each other. Unknown fields are refused.
 */
export const settingsPatchSchema = z
  .object({
    ...fields,
    notify: notifySchema.partial().strict(),
    quiet: quietSchema.partial().strict(),
    home: z
      .object({
        ring: z.boolean(),
        watchers: z.boolean(),
        cards: homeCardsSchema.partial().strict(),
      })
      .partial()
      .strict(),
  })
  .partial()
  .strict();
export type SettingsPatchDto = z.infer<typeof settingsPatchSchema>;

/** A new person's settings. Categories start on (P-52); previews start generic (P-17). */
export function defaultSettingsDoc(): SettingsDto {
  return {
    notify: {
      messages: "immediate",
      signals: "immediate",
      days: "immediate",
      letters: "immediate",
      events: "immediate",
      account: "immediate",
      reminders: "off",
    },
    sound: true,
    vibration: true,
    badge: true,
    quiet: { on: false, start: null, end: null },
    previews: "generic",
    reminders: null,
    partnerNickname: "",
    greeting: "time",
    customGreeting: "",
    home: {
      ring: true,
      watchers: true,
      cards: {
        now: true,
        messages: true,
        upcoming: true,
        letters: true,
        memory: true,
        today: true,
      },
    },
    motion: "system",
    haptics: true,
    location: { share: true },
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** `patch` laid over `base`, object by object; anything else replaces. */
function merged(base: unknown, patch: unknown): unknown {
  if (!isRecord(base) || !isRecord(patch)) return patch === undefined ? base : patch;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) out[key] = merged(base[key], value);
  return out;
}

/** A patch applied to a person's settings. Only fields the patch names change. */
export function mergeSettings(current: SettingsDto, patch: SettingsPatchDto): SettingsDto {
  return settingsSchema.parse(merged(current, patch));
}

/**
 * A stored document as a whole, valid one: defaults fill anything missing (an older version),
 * and a setting that no longer makes sense falls back to its default rather than failing the
 * screen. Fields it doesn't know are dropped.
 */
export function readSettings(stored: unknown): SettingsDto {
  const defaults = defaultSettingsDoc();
  const source = isRecord(stored) ? stored : {};
  const out: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(fields)) {
    const fallback = defaults[key as keyof SettingsDto];
    // A nested group keeps its good fields: each is checked on its own.
    if (isRecord(fallback) && isRecord(source[key])) {
      const group = fallback as Record<string, unknown>;
      const candidate: Record<string, unknown> = { ...group };
      for (const field of Object.keys(group)) {
        const trial = merged(group, { [field]: source[key][field] });
        if (schema.safeParse(trial).success) candidate[field] = (trial as typeof group)[field];
      }
      out[key] = candidate;
    } else {
      out[key] = schema.safeParse(source[key]).success ? source[key] : fallback;
    }
  }
  return settingsSchema.parse(out);
}

/** The person's account details, shown only to them. */
export const accountDetailsSchema = z.object({
  email: z.string(),
  birthDate: z.string().nullable(),
  termsVersion: z.string().nullable(),
  termsAcceptedAt: z.iso.datetime({ offset: true }).nullable(),
});

const personSchema = z.object({
  name: z.string(),
  side: sideSchema.nullable(),
  zone: z.string(),
});

/** `GET /v1/me/settings`: the person's settings and what the Settings pages show around them. */
export const settingsViewSchema = z.object({
  settings: settingsSchema,
  account: accountDetailsSchema,
  me: personSchema.extend({ avatar: avatarSchema }),
  /** Null until paired. */
  partner: personSchema.nullable(),
});
export type SettingsViewDto = z.infer<typeof settingsViewSchema>;

/** One signed-in device (SET-12). Never a session token, an address or a raw user agent. */
export const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastActive: z.iso.datetime({ offset: true }),
  current: z.boolean(),
});
export const devicesSchema = z.object({ devices: z.array(deviceSchema) });
export type DeviceDto = z.infer<typeof deviceSchema>;

const methodSchema = z.object({
  /** The server is set up for it. */
  available: z.boolean(),
  /** It is a way into this account. */
  connected: z.boolean(),
});

/** `GET /v1/me/sign-in-methods`: the ways into this account (P-79). */
export const accountMethodsSchema = z.object({
  password: z.boolean(),
  google: methodSchema,
  apple: methodSchema,
});
export type AccountMethodsDto = z.infer<typeof accountMethodsSchema>;

/** `DELETE /v1/me/sign-in-methods/:provider`: never the last way in (P-80). */
export const disconnectResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), reason: z.literal("last-one") }),
]);

/** `PATCH /v1/me/account`: a new birthday, still 16 and over (P-79). */
export const updateAccountSchema = z.object({ birthDate: isoDateSchema }).strict();
