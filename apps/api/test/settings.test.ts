/**
 * Settings on the server (B2, SET-01 to SET-17): one private document per person, saved a piece
 * at a time. probes.test.ts checks that nobody else can reach it; this follows the behaviour.
 */
import { defaultSettingsDoc, problemSchema, settingsViewSchema } from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEV_PEOPLE, startTestApi, type TestApi } from "./harness";

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

const view = async (cookie: string) =>
  settingsViewSchema.parse((await api.call("GET", "/v1/me/settings", { cookie })).json());
const save = (cookie: string, body: unknown) =>
  api.call("PATCH", "/v1/me/settings", { cookie, body });

describe("reading settings", () => {
  it("gives a new person the defaults, without writing anything", async () => {
    const person = await api.newAccount("Sol");
    const v = await view(person.cookie);
    expect(v.settings).toEqual(defaultSettingsDoc());
    expect(v.settings.previews).toBe("generic"); // §5, P-17
    expect(v.settings.quiet).toEqual({ on: false, start: null, end: null }); // U-21
    expect(v.settings.reminders).toBeNull(); // P-65
    const rows = await api.db.query("select 1 from user_settings where user_id = $1", [person.id]);
    expect(rows.rows).toEqual([]);
  });

  it("shows the person's own account details and the pair's names", async () => {
    const v = await view(api.cookies.selam);
    expect(v.account).toMatchObject({
      email: DEV_PEOPLE.selam.email,
      birthDate: DEV_PEOPLE.selam.birthDate,
    });
    expect(v.partner?.name).toBe("Noah");
    expect(v.me.name).toBe("Selam");
  });

  it("has no partner before pairing", async () => {
    const person = await api.newAccount("Tem");
    expect((await view(person.cookie)).partner).toBeNull();
  });

  it("survives a stored document from an older version or a bad write", async () => {
    const person = await api.newAccount("Uri");
    await api.db.query(
      "insert into user_settings (user_id, schema_version, doc) values ($1, 0, $2)",
      [person.id, JSON.stringify({ sound: false, previews: "leak", retired: 1 })],
    );
    const v = await view(person.cookie);
    expect(v.settings.sound).toBe(false);
    expect(v.settings.previews).toBe("generic");
    expect(v.settings).not.toHaveProperty("retired");
    // Saving brings the stored document up to date.
    await save(person.cookie, { haptics: false });
    const row = await api.db.query<{ schema_version: number; doc: Record<string, unknown> }>(
      "select schema_version, doc from user_settings where user_id = $1",
      [person.id],
    );
    expect(row.rows[0]?.schema_version).toBe(1);
    expect(row.rows[0]?.doc).not.toHaveProperty("retired");
    expect(row.rows[0]?.doc["previews"]).toBe("generic");
  });
});

describe("saving settings", () => {
  it("changes only what was sent, at any depth", async () => {
    const person = await api.newAccount("Vee");
    const res = await save(person.cookie, {
      notify: { messages: "quiet" },
      home: { cards: { memory: false } },
    });
    expect(res.statusCode).toBe(204);
    const { settings } = await view(person.cookie);
    expect(settings.notify.messages).toBe("quiet");
    expect(settings.notify.signals).toBe("immediate");
    expect(settings.home.cards.memory).toBe(false);
    expect(settings.home.cards.now).toBe(true);
  });

  it("keeps both of two saves from two devices at the same moment", async () => {
    const person = await api.newAccount("Wyn");
    const other = await api.signIn(person.email);
    await Promise.all([
      save(person.cookie, { sound: false }),
      save(other, { vibration: false }),
      save(person.cookie, { quiet: { on: true } }),
      save(other, { quiet: { start: "22:30", end: "06:30" } }),
    ]);
    const { settings } = await view(person.cookie);
    expect(settings).toMatchObject({
      sound: false,
      vibration: false,
      quiet: { on: true, start: "22:30", end: "06:30" },
    });
  });

  it("keeps a chosen quiet window and never invents one (U-21)", async () => {
    const person = await api.newAccount("Xan");
    await save(person.cookie, { quiet: { on: true } });
    expect((await view(person.cookie)).settings.quiet).toEqual({
      on: true,
      start: null,
      end: null,
    });
  });

  it.each([
    ["an unknown setting", { theme: "neon" }],
    ["the export state", { export: { state: "ready", readyAt: null } }],
    ["a bad notification mode", { notify: { messages: "loud" } }],
    ["a time that doesn't exist", { quiet: { start: "24:00" } }],
    ["an over-long nickname", { partnerNickname: "x".repeat(25) }],
  ])("refuses %s, naming only where, and changes nothing", async (_, body) => {
    const person = await api.newAccount("Yas");
    const res = await save(person.cookie, body);
    expect(res.statusCode).toBe(400);
    expect(problemSchema.parse(res.json()).code).toBe("validation_failed");
    expect(res.body).not.toContain("neon");
    expect((await view(person.cookie)).settings).toEqual(defaultSettingsDoc());
  });

  it("logs nothing of what was saved", async () => {
    const person = await api.newAccount("Zia");
    const before = api.logs.length;
    await save(person.cookie, { partnerNickname: "Secret name" });
    const text = JSON.stringify(api.logs.slice(before));
    expect(text).not.toContain("Secret name");
    expect(text).toContain("/v1/me/settings");
  });

  it("goes with the account when it is removed", async () => {
    const person = await api.newAccount("Ash");
    await save(person.cookie, { sound: false });
    await api.db.query("delete from app_user where id = $1", [person.id]);
    const rows = await api.db.query("select 1 from user_settings where user_id = $1", [person.id]);
    expect(rows.rows).toEqual([]);
  });
});
