import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ExportDataBundleDto, ExportStatusDto } from "@garnet/contracts";
import { PASSWORD, startTestApi, type TestApi } from "./harness";

describe("Data Rights & Account Lifecycle integration suite (B-100, B-101, B-120, P-37, P-80)", () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  });

  afterAll(async () => {
    await api.close();
  });

  describe("Re-authentication (P-80)", () => {
    it("validates password and updates session freshness", async () => {
      // Wrong password fails validation
      const wrongRes = await api.call("POST", "/v1/me/reauth", {
        cookie: api.cookies.selam,
        body: { password: "incorrect-password" },
      });
      expect(wrongRes.statusCode).toBe(400);

      // Correct password succeeds
      const okRes = await api.call("POST", "/v1/me/reauth", {
        cookie: api.cookies.selam,
        body: { password: PASSWORD },
      });
      expect(okRes.statusCode).toBe(200);
      expect(okRes.json<{ ok: boolean }>().ok).toBe(true);
    });
  });

  describe("Self-Service Data Export (B-100, SET-13, P-37, §5, §11)", () => {
    it("handles export lifecycle and strictly excludes partner's private drafts", async () => {
      // 1. Initial status is none
      const initialRes = await api.call("GET", "/v1/me/export", {
        cookie: api.cookies.selam,
      });
      expect(initialRes.statusCode).toBe(200);
      expect(initialRes.json<ExportStatusDto>().state).toBe("none");

      // 2. Prepare export
      const prepRes = await api.call("POST", "/v1/me/export", {
        cookie: api.cookies.selam,
      });
      expect(prepRes.statusCode).toBe(200);
      const prepData = prepRes.json<ExportStatusDto>();
      expect(prepData.state).toBe("ready");
      expect(prepData.downloadUrl).toBeTruthy();
      expect(prepData.readyAt).toBeTruthy();
      expect(prepData.expiresAt).toBeTruthy();

      // Status endpoint now reflects ready
      const statusRes = await api.call("GET", "/v1/me/export", {
        cookie: api.cookies.selam,
      });
      expect(statusRes.statusCode).toBe(200);
      expect(statusRes.json<ExportStatusDto>().state).toBe("ready");

      // 3. Download export payload via download URL
      const downloadRes = await api.call("GET", prepData.downloadUrl!, {
        cookie: api.cookies.selam,
      });
      expect(downloadRes.statusCode).toBe(200);
      expect(downloadRes.headers["content-type"]).toContain("application/json");

      const bundle = JSON.parse(downloadRes.body) as ExportDataBundleDto;
      expect(bundle.version).toBe(1);
      expect(bundle.user.email).toBe("selam@example.test");
      expect(Array.isArray(bundle.days)).toBe(true);
      expect(Array.isArray(bundle.chat)).toBe(true);
      expect(Array.isArray(bundle.letters)).toBe(true);

      // Guardrail §5: Verify no private draft of Noah exists in Selam's export
      // (Noah is DEV_PEOPLE.noah.id)
      const noahPrivateDraft = bundle.days.find(
        (d) => d["authorId"] !== bundle.user.id && d["visibility"] === "private",
      );
      expect(noahPrivateDraft).toBeUndefined();

      // 4. Expire export
      const expireRes = await api.call("POST", "/v1/me/export/expire", {
        cookie: api.cookies.selam,
      });
      expect(expireRes.statusCode).toBe(204);

      // Status endpoint now reflects expired
      const expiredStatusRes = await api.call("GET", "/v1/me/export", {
        cookie: api.cookies.selam,
      });
      expect(expiredStatusRes.statusCode).toBe(200);
      expect(expiredStatusRes.json<ExportStatusDto>().state).toBe("expired");

      // Download is now 404
      const expiredDownloadRes = await api.call("GET", prepData.downloadUrl!, {
        cookie: api.cookies.selam,
      });
      expect(expiredDownloadRes.statusCode).toBe(404);
    });
  });

  describe("Ending the Space (SET-14, B-101, P-37)", () => {
    it("requires confirmed 'END' word and terminates shared relationship", async () => {
      // Must type END
      const badConfirmRes = await api.call("POST", "/v1/me/end-space", {
        cookie: api.cookies.noah,
        body: { confirmWord: "INVALID" },
      });
      expect(badConfirmRes.statusCode).toBe(400);

      // Correct confirmation ends space
      const endRes = await api.call("POST", "/v1/me/end-space", {
        cookie: api.cookies.noah,
        body: { confirmWord: "END" },
      });
      expect(endRes.statusCode).toBe(204);

      // Relationship is now ended: partnerName is null (unpaired)
      const pairingRes = await api.call("GET", "/v1/pairing", {
        cookie: api.cookies.noah,
      });
      expect(pairingRes.statusCode).toBe(200);
      expect(pairingRes.json<{ partnerName: string | null }>().partnerName).toBeNull();
    });
  });

  describe("Account Deletion (SET-15, B-101, Apple App Review 5.1.1(v))", () => {
    it("requires confirmed 'DELETE' word and purges account data & sessions", async () => {
      // Must type DELETE
      const badConfirmRes = await api.call("DELETE", "/v1/me/account", {
        cookie: api.cookies.selam,
        body: { confirmWord: "CANCEL" },
      });
      expect(badConfirmRes.statusCode).toBe(400);

      // Correct confirmation deletes account
      const delRes = await api.call("DELETE", "/v1/me/account", {
        cookie: api.cookies.selam,
        body: { confirmWord: "DELETE" },
      });
      expect(delRes.statusCode).toBe(204);

      // Subsequent request using Selam's old session cookie is rejected with 401
      const meRes = await api.call("GET", "/v1/me", {
        cookie: api.cookies.selam,
      });
      expect(meRes.statusCode).toBe(401);
    });
  });
});
