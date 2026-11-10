/**
 * Real profile pictures (P-98): checked by their bytes, given only to the owner and their
 * partner, removable, and the Google account's picture copied once at setup from Google's
 * picture hosts only.
 */
import { setupStateSchema, uploadAvatarResultSchema } from "@garnet/contracts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchAccountPicture, sniffImage } from "../src/setup/avatar";
import { DEV_PEOPLE, startTestApi, type TestApi } from "./harness";

/** The smallest real JPEG and PNG headers, padded: enough for the byte check. */
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 3),
]);

let api: TestApi;
beforeAll(async () => {
  api = await startTestApi();
});
afterAll(async () => {
  await api.close();
});

const upload = (cookie: string, bytes: Buffer, contentType = "image/jpeg") =>
  api.call("PUT", "/v1/me/avatar", {
    cookie,
    body: { contentType, data: bytes.toString("base64") },
  });

describe("profile pictures (P-98)", () => {
  it("stores a picture, and gives it to its owner and their partner only", async () => {
    const res = await upload(api.cookies.selam, JPEG);
    expect(res.statusCode).toBe(200);
    const { avatar } = uploadAvatarResultSchema.parse(res.json());
    expect(avatar.kind).toBe("image");

    const mine = await api.call("GET", "/v1/me/avatar", { cookie: api.cookies.selam });
    expect(mine.statusCode).toBe(200);
    expect(mine.headers["content-type"]).toBe("image/jpeg");
    expect(mine.headers["cache-control"]).toBe("private, max-age=31536000, immutable");
    expect(mine.rawPayload.equals(JPEG)).toBe(true);

    // The partner sees it, in their setup state and as the file.
    const state = setupStateSchema.parse(
      (await api.call("GET", "/v1/me/setup", { cookie: api.cookies.noah })).json(),
    );
    expect(state.partner?.avatar).toEqual(avatar);
    const theirs = await api.call("GET", "/v1/partner/avatar", { cookie: api.cookies.noah });
    expect(theirs.rawPayload.equals(JPEG)).toBe(true);

    // Someone in another relationship never gets it.
    const stranger = await api.call("GET", "/v1/partner/avatar", {
      cookie: api.cookies.stranger,
    });
    expect(stranger.statusCode).toBe(404);
  });

  it("replaces the old file with the new one", async () => {
    await upload(api.cookies.noah, JPEG);
    const before = await api.objectStorage.listKeys(
      "garnet-media",
      `avatars/${DEV_PEOPLE.noah.id}/`,
    );
    await upload(api.cookies.noah, PNG, "image/png");
    const after = await api.objectStorage.listKeys(
      "garnet-media",
      `avatars/${DEV_PEOPLE.noah.id}/`,
    );
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(1);
    expect(after).not.toEqual(before);
  });

  it("refuses anything that isn't the image it says it is", async () => {
    for (const [bytes, type] of [
      [Buffer.from("<svg onload=alert(1)>".padEnd(40, " ")), "image/png"],
      [PNG, "image/jpeg"],
      [Buffer.alloc(40, 0), "image/webp"],
    ] as const) {
      expect((await upload(api.cookies.selam, bytes, type)).statusCode).toBe(400);
    }
    // Too big for a picture the phone resized.
    expect([400, 413]).toContain(
      (await upload(api.cookies.selam, Buffer.alloc(50_000, 1))).statusCode,
    );
    // And setup can't point at a file directly.
    const direct = await api.call("PATCH", "/v1/me/setup", {
      cookie: api.cookies.selam,
      body: { avatar: { kind: "image", version: "0192f0a0-0000-7000-8000-000000000001" } },
    });
    expect(direct.statusCode).toBe(400);
  });

  it("goes back to initials and removes the file", async () => {
    const { cookie, id } = await api.newAccount("Hanna");
    await upload(cookie, JPEG);
    expect((await api.call("DELETE", "/v1/me/avatar", { cookie })).statusCode).toBe(204);
    expect((await api.call("GET", "/v1/me/avatar", { cookie })).statusCode).toBe(404);
    expect(await api.objectStorage.listKeys("garnet-media", `avatars/${id}/`)).toEqual([]);
  });
});

describe("the Google account's picture (P-98)", () => {
  it("is copied once at setup, without marking the picture step done", async () => {
    const { cookie, id } = await api.newAccount("Iman");
    await api.db.query("update app_user set image = $1 where id = $2", [
      "https://lh3.googleusercontent.com/a/abc=s96-c",
      id,
    ]);
    const fetched: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
      fetched.push(url);
      return Promise.resolve(new Response(new Uint8Array(JPEG), { status: 200 }));
    });
    try {
      const state = setupStateSchema.parse(
        (await api.call("GET", "/v1/me/setup", { cookie })).json(),
      );
      expect(state.profile.avatar.kind).toBe("image");
      expect(state.profile.done).not.toContain("photo");
      await api.call("GET", "/v1/me/setup", { cookie });
      expect(fetched).toEqual(["https://lh3.googleusercontent.com/a/abc=s360-c"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("is fetched only from Google's picture hosts, over https, and only if it is an image", async () => {
    const ok = () => Promise.resolve(new Response(new Uint8Array(JPEG), { status: 200 }));
    for (const url of [
      "http://lh3.googleusercontent.com/a/x",
      "https://evil.example/a.jpg",
      "https://lh3.googleusercontent.com.evil.example/a",
      "https://169.254.169.254/latest/meta-data",
      "not a url",
    ])
      expect(await fetchAccountPicture(url, ok as typeof fetch), url).toBeNull();
    const html = () => Promise.resolve(new Response("<html></html>", { status: 200 }));
    expect(
      await fetchAccountPicture("https://lh3.googleusercontent.com/a/x", html as typeof fetch),
    ).toBeNull();
    expect(
      await fetchAccountPicture("https://lh3.googleusercontent.com/a/x", ok as typeof fetch),
    ).toMatchObject({ type: "image/jpeg" });
  });

  it("knows images by their bytes", () => {
    expect(sniffImage(JPEG)).toBe("image/jpeg");
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(Buffer.concat([Buffer.from("RIFF0000WEBP"), Buffer.alloc(8)]))).toBe(
      "image/webp",
    );
    expect(sniffImage(Buffer.from("GIF89a"))).toBeNull();
  });
});
