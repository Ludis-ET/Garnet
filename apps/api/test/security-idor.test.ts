import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEV_PEOPLE, startTestApi } from "./harness";

describe("Security Review & IDOR Suite (B-120, ADR-0004, ADR-0006, §5)", () => {
  it("strictly isolates entities across relationships (IDOR checks)", async () => {
    const api = await startTestApi();
    try {
      const entryId = "0192f0a0-0000-7000-8000-000000001001";
      const mutationId = "0192f0a0-0000-7000-8000-000000002001";

      // Selam (Relationship 1) writes an entry via mutation
      const createEntryRes = await api.call("POST", "/v1/mutations", {
        cookie: api.cookies.selam,
        body: {
          mutations: [
            {
              kind: "create",
              mutationId,
              entryId,
              entryKind: "text",
              body: "Selam's shared day memory",
              visibility: "shared",
              occurredAt: "2026-11-05T12:00:00Z",
              occurredTimeZone: "Europe/London",
              sharedAt: "2026-11-05T12:05:00Z",
            },
          ],
        },
      });
      expect(createEntryRes.statusCode).toBe(200);

      // Stranger (Relationship 2) attempts to read Selam's entry: must 404
      const strangerRead = await api.call("GET", `/v1/entries/${entryId}`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerRead.statusCode).toBe(404);

      // Stranger attempts to delete Selam's entry via mutation
      await api.call("POST", "/v1/mutations", {
        cookie: api.cookies.stranger,
        body: {
          mutations: [
            {
              kind: "delete",
              mutationId: randomUUID(),
              entryId,
            },
          ],
        },
      });

      // Verify Selam's entry is untouched in Relationship 1
      const selamReadAfter = await api.call("GET", `/v1/entries/${entryId}`, {
        cookie: api.cookies.selam,
      });
      expect(selamReadAfter.statusCode).toBe(200);
      const selamEntry = JSON.parse(selamReadAfter.payload) as { body: string };
      expect(selamEntry.body).toBe("Selam's shared day memory");

      // Selam sends a chat message
      const chatRes = await api.call("POST", "/v1/chat/messages", {
        cookie: api.cookies.selam,
        body: {
          clientMessageId: randomUUID(),
          text: "Selam's message to Noah",
        },
      });
      expect(chatRes.statusCode).toBe(200);
      const msg = JSON.parse(chatRes.payload) as { id: string };

      // Stranger attempts to edit, react to, pin, or delete Selam's chat message: all must 404
      const strangerEdit = await api.call("PATCH", `/v1/chat/messages/${msg.id}`, {
        cookie: api.cookies.stranger,
        body: { text: "Tampered by stranger" },
      });
      expect(strangerEdit.statusCode).toBe(404);

      const strangerReact = await api.call("POST", `/v1/chat/messages/${msg.id}/reactions`, {
        cookie: api.cookies.stranger,
        body: { emoji: "❤️" },
      });
      expect(strangerReact.statusCode).toBe(404);

      const strangerPin = await api.call("POST", `/v1/chat/messages/${msg.id}/pin`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerPin.statusCode).toBe(404);

      const strangerDeleteMsg = await api.call("DELETE", `/v1/chat/messages/${msg.id}`, {
        cookie: api.cookies.stranger,
        body: { mode: "for-everyone" },
      });
      expect(strangerDeleteMsg.statusCode).toBe(404);

      // Selam creates a draft letter and seals it
      const draftRes = await api.call("POST", "/v1/letters/draft", {
        cookie: api.cookies.selam,
        body: {
          prompt: "Open When Missing Me",
          body: "Always with you in spirit.",
          paper: { paper: "cream", font: "serif" },
        },
      });
      expect(draftRes.statusCode).toBe(201);
      const draft = JSON.parse(draftRes.payload) as { id: string };

      const sealRes = await api.call("POST", `/v1/letters/${draft.id}/seal`, {
        cookie: api.cookies.selam,
        body: { unlockRule: { type: "manual" } },
      });
      expect(sealRes.statusCode).toBe(201);

      // Stranger attempts to read, open, or delete Selam's sealed letter: all must 404
      const strangerLetter = await api.call("GET", `/v1/letters/${draft.id}`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerLetter.statusCode).toBe(404);

      const strangerOpenLetter = await api.call("POST", `/v1/letters/${draft.id}/open`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerOpenLetter.statusCode).toBe(201);
      expect(strangerOpenLetter.json<{ ok: boolean }>().ok).toBe(false);

      const strangerDeleteLetter = await api.call("DELETE", `/v1/letters/${draft.id}`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerDeleteLetter.statusCode).toBe(404);

      // Noah schedules a surprise
      const surpriseRes = await api.call("POST", "/v1/surprises", {
        cookie: api.cookies.noah,
        body: {
          content: {
            kind: "song",
            textContent: "Our favorite coffee shop track",
            songInfo: { title: "Tizita", artist: "Mahmoud Ahmed" },
          },
          safeTitle: "A morning surprise",
          reveal: { kind: "now" },
        },
      });
      if (surpriseRes.statusCode !== 201) {
        throw new Error(
          `Surprise create failed (${surpriseRes.statusCode}): ${surpriseRes.payload} | Log: ${JSON.stringify(api.logs.at(-1))}`,
        );
      }
      expect(surpriseRes.statusCode).toBe(201);
      const surprise = JSON.parse(surpriseRes.payload) as { id: string };

      // Stranger attempts to read or open Selam's surprise: all must 404
      const strangerSurprise = await api.call("GET", `/v1/surprises/${surprise.id}`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerSurprise.statusCode).toBe(404);

      const strangerOpenSurprise = await api.call("POST", `/v1/surprises/${surprise.id}/open`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerOpenSurprise.statusCode).toBe(404);

      // Selam initiates a media upload
      const mediaRes = await api.call("POST", "/v1/media/upload", {
        cookie: api.cookies.selam,
        body: {
          contentType: "image/jpeg",
          byteSize: 1024,
          sha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          entityType: "chat_message",
          entityId: randomUUID(),
        },
      });
      expect(mediaRes.statusCode).toBe(201);
      const media = JSON.parse(mediaRes.payload) as { id: string };

      // Stranger attempts to commit or read Selam's media: must be rejected / not found
      const strangerMediaRead = await api.call("GET", `/v1/media/${media.id}/url`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerMediaRead.statusCode).toBe(404);

      const strangerMediaCommit = await api.call("POST", `/v1/media/${media.id}/commit`, {
        cookie: api.cookies.stranger,
        body: { entityId: randomUUID() },
      });
      expect(strangerMediaCommit.statusCode).toBe(200);
      expect(JSON.parse(strangerMediaCommit.payload)).toMatchObject({
        status: "rejected",
        reason: "not-found",
      });

      const strangerMediaDelete = await api.call("DELETE", `/v1/media/${media.id}`, {
        cookie: api.cookies.stranger,
      });
      expect(strangerMediaDelete.statusCode).toBe(204);

      // Verify Selam's media was not deleted by stranger
      const selamMediaStillThere = await api.call("GET", `/v1/media/${media.id}/url`, {
        cookie: api.cookies.selam,
      });
      expect(selamMediaStillThere.statusCode).toBe(200);
    } finally {
      await api.close();
    }
  });

  it("enforces partner-private guardrails (§5) inside the relationship", async () => {
    const api = await startTestApi();
    try {
      const privateDraftId = "0192f0a0-0000-7000-8000-000000001002";

      // Selam creates a private draft entry
      const createDraftRes = await api.call("POST", "/v1/mutations", {
        cookie: api.cookies.selam,
        body: {
          mutations: [
            {
              kind: "create",
              mutationId: "0192f0a0-0000-7000-8000-000000002002",
              entryId: privateDraftId,
              entryKind: "text",
              body: "Selam's unshared thoughts",
              visibility: "private",
              occurredAt: "2026-11-05T12:00:00Z",
              occurredTimeZone: "Europe/London",
            },
          ],
        },
      });
      expect(createDraftRes.statusCode).toBe(200);

      // Noah polls changes: private drafts must never appear in Noah's sync feed
      const noahChanges = await api.call("GET", "/v1/changes?since=0", {
        cookie: api.cookies.noah,
      });
      expect(noahChanges.statusCode).toBe(200);
      const changesPayload = JSON.parse(noahChanges.payload) as {
        changes: { type: string; entry?: { id: string; body?: string } }[];
      };
      const leakedDraft = changesPayload.changes.find((c) => c.entry?.id === privateDraftId);
      expect(leakedDraft).toBeUndefined();

      // Selam writes a letter draft and seals it for Noah
      const draftRes = await api.call("POST", "/v1/letters/draft", {
        cookie: api.cookies.selam,
        body: {
          prompt: "Open on Graduation Day",
          body: "Top Secret: You did it!",
          paper: { paper: "cream", font: "serif" },
        },
      });
      expect(draftRes.statusCode).toBe(201);
      const letter = JSON.parse(draftRes.payload) as { id: string };

      // Noah cannot see Selam's unsealed draft (§5)
      const noahDraftRead = await api.call("GET", `/v1/letters/${letter.id}`, {
        cookie: api.cookies.noah,
      });
      expect(noahDraftRead.statusCode).toBe(404);

      // Selam seals the letter
      const sealRes = await api.call("POST", `/v1/letters/${letter.id}/seal`, {
        cookie: api.cookies.selam,
        body: { unlockRule: { type: "manual" } },
      });
      expect(sealRes.statusCode).toBe(201);

      // Noah reads the sealed letter: body must be undefined / withheld
      const noahLetterRead = await api.call("GET", `/v1/letters/${letter.id}`, {
        cookie: api.cookies.noah,
      });
      expect(noahLetterRead.statusCode).toBe(200);
      const letterData = JSON.parse(noahLetterRead.payload) as { body?: string; status: string };
      expect(letterData.status).toBe("sealed");
      expect(letterData.body).toBeUndefined();

      // Selam initiates a data export
      const exportRes = await api.call("POST", "/v1/me/export", {
        cookie: api.cookies.selam,
      });
      expect(exportRes.statusCode).toBe(200);

      // Noah polls export status: must only see Noah's own export (state "none"), never Selam's
      const noahExport = await api.call("GET", "/v1/me/export", {
        cookie: api.cookies.noah,
      });
      expect(noahExport.statusCode).toBe(200);
      const noahExportData = JSON.parse(noahExport.payload) as { state: string };
      expect(noahExportData.state).toBe("none");
    } finally {
      await api.close();
    }
  });

  it("handles session revocation and credential lifecycle (ADR-0006)", async () => {
    const api = await startTestApi();
    try {
      // 1. Explicit sign-out invalidates the cookie immediately
      const session1 = await api.signIn(DEV_PEOPLE.selam.email);
      const testReq1 = await api.call("GET", "/v1/me", { cookie: session1 });
      expect(testReq1.statusCode).toBe(200);

      const signoutRes = await api.call("POST", "/v1/auth/sign-out", {
        cookie: session1,
        body: {},
      });
      expect(signoutRes.statusCode).toBe(200);

      const testReqRevoked = await api.call("GET", "/v1/me", { cookie: session1 });
      expect(testReqRevoked.statusCode).toBe(401);

      // 2. Sign-out-others terminates every other device session
      const deviceA = await api.signIn(DEV_PEOPLE.selam.email);
      const deviceB = await api.signIn(DEV_PEOPLE.selam.email);

      const signoutOthersRes = await api.call("POST", "/v1/me/devices/sign-out-others", {
        cookie: deviceA,
      });
      expect(signoutOthersRes.statusCode).toBe(204);

      // Device A remains signed in
      const testDeviceA = await api.call("GET", "/v1/me", { cookie: deviceA });
      expect(testDeviceA.statusCode).toBe(200);

      // Device B is terminated
      const testDeviceB = await api.call("GET", "/v1/me", { cookie: deviceB });
      expect(testDeviceB.statusCode).toBe(401);

      // 3. Password reset revokes all active sessions for the user
      const person = await api.newAccount("SecurityUser");
      const personSession1 = await api.signIn(person.email);
      const personSession2 = await api.signIn(person.email);

      await api.call("POST", "/v1/auth/request-password-reset", {
        body: { email: person.email, redirectTo: "garnet://reset-password" },
      });
      const resetMail = api.mail.findLast((m) => m.to === person.email && m.kind === "reset");
      expect(resetMail).toBeDefined();

      const newPassword = "a totally new secure password 123";
      const resetConfirmRes = await api.call("POST", "/v1/auth/reset-password", {
        body: { token: resetMail?.token, newPassword },
      });
      expect(resetConfirmRes.statusCode).toBe(200);

      // All previous sessions are now revoked
      const testOld1 = await api.call("GET", "/v1/me", { cookie: personSession1 });
      expect(testOld1.statusCode).toBe(401);
      const testOld2 = await api.call("GET", "/v1/me", { cookie: personSession2 });
      expect(testOld2.statusCode).toBe(401);

      // Can sign in with new password
      const newSession = await api.signIn(person.email, newPassword);
      const testNewSession = await api.call("GET", "/v1/me", { cookie: newSession });
      expect(testNewSession.statusCode).toBe(200);
    } finally {
      await api.close();
    }
  });
});
