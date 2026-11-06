import type { CreateLetterInput, OpenWhenRepository } from "@/data/repositories/types";
import { DEFAULT_LETTER_STYLE, type OpenResult, type OpenWhenView } from "@/domain/openWhen";
import type { LetterStyle, PaperFont, PaperTone, UnlockRule } from "@/domain/models";
import {
  openLetterResponseSchema,
  openWhenListSchema,
  openWhenViewSchema,
  type OpenWhenViewDto,
  type UnlockRuleDto,
} from "@garnet/contracts";
import type { SqliteStore } from "../sqlite/sqliteStore";
import type { ApiClient } from "./client";

function toDomainUnlock(dtoRule?: UnlockRuleDto): UnlockRule {
  if (!dtoRule || dtoRule.type === "manual") {
    return { type: "manual" };
  }
  if (dtoRule.type === "date") {
    return { type: "date", at: dtoRule.date };
  }
  return { type: "event", eventId: dtoRule.eventName };
}

function toContractUnlock(rule?: UnlockRule): UnlockRuleDto | undefined {
  if (!rule) return undefined;
  if (rule.type === "manual") return { type: "manual" };
  if (rule.type === "date") return { type: "date", date: rule.at };
  return { type: "event", eventName: rule.eventId };
}

function toLetterStyle(paper?: { paper: string; font: string }): LetterStyle {
  if (!paper) return DEFAULT_LETTER_STYLE;
  return {
    tone: paper.paper as PaperTone,
    font: paper.font as PaperFont,
  };
}

function toOpenWhenView(dto: OpenWhenViewDto, currentUserId?: string): OpenWhenView {
  const viewerIsRecipient = currentUserId ? dto.recipientId === currentUserId : false;

  if (dto.status === "draft") {
    return {
      kind: "draft",
      id: dto.id,
      safePrompt: dto.prompt,
      authorId: dto.authorId,
      recipientId: dto.recipientId,
      viewerIsRecipient: false,
      body: dto.body,
      paper: toLetterStyle(dto.paper),
      mediaRefs: dto.mediaRefs ?? [],
      unlock: { type: "manual" },
    };
  }

  if (dto.status === "sealed") {
    return {
      kind: "sealed",
      id: dto.id,
      safePrompt: dto.prompt,
      authorId: dto.authorId,
      recipientId: dto.recipientId,
      sealedAt: dto.sealedAt,
      unlock: toDomainUnlock(dto.unlockRule),
      viewerIsRecipient,
      eligible: true,
    };
  }

  return {
    kind: "opened",
    id: dto.id,
    paper: toLetterStyle(dto.paper),
    safePrompt: dto.prompt,
    authorId: dto.authorId,
    recipientId: dto.recipientId,
    viewerIsRecipient,
    sealedAt: dto.sealedAt,
    openedAt: dto.openedAt,
    unlock: toDomainUnlock(dto.unlockRule),
    body: dto.body,
    mediaRefs: dto.mediaRefs ?? [],
  };
}

export function createHttpOpenWhen(
  api: ApiClient,
  getCurrentUserId?: () => string | undefined,
  sqlite?: SqliteStore,
): OpenWhenRepository {
  return {
    async list(): Promise<OpenWhenView[]> {
      const currentUserId = getCurrentUserId?.();
      try {
        const dtos = await api.get("/v1/letters", openWhenListSchema);
        if (sqlite) {
          for (const d of dtos) {
            await sqlite.saveConfirmedLetter({
              id: d.id,
              relationshipId: "default",
              authorId: d.authorId,
              recipientId: d.recipientId,
              prompt: d.prompt,
              body: d.status === "sealed" ? null : ((d as { body?: string }).body ?? null),
              status: d.status,
              openedAt: d.status === "opened" ? d.openedAt : null,
              createdAt: d.createdAt,
            });
          }
        }
        return dtos.map((d) => toOpenWhenView(d, currentUserId));
      } catch (err) {
        if (sqlite) {
          const cached = await sqlite.getConfirmedLetters("default");
          if (cached.length > 0) {
            return cached.map(
              (c) =>
                ({
                  kind:
                    c.status === "opened" ? "opened" : c.status === "draft" ? "draft" : "sealed",
                  id: c.id,
                  safePrompt: c.prompt,
                  authorId: c.authorId,
                  recipientId: c.recipientId,
                  viewerIsRecipient: currentUserId ? c.recipientId === currentUserId : false,
                  body: c.body ?? "",
                  paper: DEFAULT_LETTER_STYLE,
                  unlock: { type: "manual" },
                  mediaRefs: [],
                }) as OpenWhenView,
            );
          }
        }
        throw err;
      }
    },

    async get(id: string): Promise<OpenWhenView> {
      const dto = await api.get(`/v1/letters/${id}`, openWhenViewSchema);
      return toOpenWhenView(dto, getCurrentUserId?.());
    },

    async open(
      id: string,
    ): Promise<Exclude<OpenResult, { ok: true }> | { ok: true; view: OpenWhenView }> {
      const res = await api.post(`/v1/letters/${id}/open`, openLetterResponseSchema, {});
      if (!res.ok || !res.view) {
        return { ok: false, reason: "not-eligible" };
      }
      return { ok: true, view: toOpenWhenView(res.view, getCurrentUserId?.()) };
    },

    async createDraft(input: CreateLetterInput): Promise<OpenWhenView> {
      const dto = await api.post("/v1/letters/draft", openWhenViewSchema, {
        prompt: input.safePrompt,
        body: input.body,
        paper: input.paper ? { paper: input.paper.tone, font: input.paper.font } : undefined,
        mediaRefs: input.mediaRefs ? [...input.mediaRefs] : undefined,
        unlockRule: toContractUnlock(input.unlock),
      });
      return toOpenWhenView(dto, getCurrentUserId?.());
    },

    async saveDraft(id: string, patch: Partial<CreateLetterInput>): Promise<OpenWhenView> {
      const dto = await api.patchWith(`/v1/letters/${id}`, openWhenViewSchema, {
        prompt: patch.safePrompt,
        body: patch.body,
        paper: patch.paper ? { paper: patch.paper.tone, font: patch.paper.font } : undefined,
        mediaRefs: patch.mediaRefs ? [...patch.mediaRefs] : undefined,
        unlockRule: toContractUnlock(patch.unlock),
      });
      return toOpenWhenView(dto, getCurrentUserId?.());
    },

    async seal(id: string, unlock: UnlockRule): Promise<OpenWhenView> {
      const dto = await api.post(`/v1/letters/${id}/seal`, openWhenViewSchema, {
        unlockRule: toContractUnlock(unlock),
      });
      return toOpenWhenView(dto, getCurrentUserId?.());
    },

    async deleteLetter(id: string): Promise<{ ok: boolean }> {
      await api.delete(`/v1/letters/${id}`);
      return { ok: true };
    },
  };
}
