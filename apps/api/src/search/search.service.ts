import { Inject, Injectable } from "@nestjs/common";
import {
  type SearchQueryRequest,
  type SearchQueryResponse,
  type SearchResultItemDto,
} from "@garnet/contracts";
import { sql, type Kysely } from "kysely";
import { asViewer, KYSELY, type Database, type Viewer } from "../db/database";

@Injectable()
export class SearchService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async search(viewer: Viewer, req: SearchQueryRequest): Promise<SearchQueryResponse> {
    return asViewer(this.db, viewer, async (trx) => {
      const q = req.q.trim();
      const likeQ = `%${q}%`;
      const kinds = req.kinds !== undefined && req.kinds.length > 0 ? new Set(req.kinds) : null;
      const who = req.who;
      const limit = Math.min(req.limit, 100);

      const member = await trx
        .selectFrom("relationship_member")
        .select("relationship_id")
        .where("user_id", "=", viewer.userId)
        .where("left_at", "is", null)
        .executeTakeFirst();

      if (!member) {
        return {
          results: [],
          nextCursor: null,
          totalEstimated: 0,
        };
      }
      const relationshipId = member.relationship_id;

      // Get partner display name for nice sender attribution
      let partnerName = "Partner";
      const partnerMember = await trx
        .selectFrom("relationship_member")
        .select("user_id")
        .where("relationship_id", "=", relationshipId)
        .where("user_id", "!=", viewer.userId)
        .where("left_at", "is", null)
        .executeTakeFirst();

      if (partnerMember) {
        const partnerProfile = await trx
          .selectFrom("profile")
          .select("display_name")
          .where("user_id", "=", partnerMember.user_id)
          .executeTakeFirst();
        if (partnerProfile?.display_name) {
          partnerName = partnerProfile.display_name;
        }
      }

      const allItems: SearchResultItemDto[] = [];

      // 1. Chat Messages
      if (!kinds || kinds.has("message")) {
        const msgRows = await sql<{
          id: string;
          sender_id: string;
          text: string;
          created_at: Date;
        }>`
          select m.id, m.sender_id, m.text, m.created_at
          from chat_message m
          left join chat_message_visibility v on v.message_id = m.id and v.user_id = ${viewer.userId}
          where m.relationship_id = ${relationshipId}
            and m.deleted_for_everyone = false
            and coalesce(v.deleted_for_me, false) = false
            and (
              to_tsvector('english', m.text) @@ websearch_to_tsquery('english', ${q})
              or m.text ilike ${likeQ}
            )
            ${who === "me" ? sql`and m.sender_id = ${viewer.userId}` : who === "partner" ? sql`and m.sender_id != ${viewer.userId}` : sql``}
          order by m.created_at desc
          limit ${limit + 1}
        `.execute(trx);

        for (const row of msgRows.rows) {
          const mine = row.sender_id === viewer.userId;
          allItems.push({
            id: row.id,
            kind: "message",
            title: mine ? "You" : partnerName,
            snippet: row.text,
            at: new Date(row.created_at).toISOString(),
            mine,
            sealed: false,
            href: `/chat?messageId=${row.id}`,
          });
        }
      }

      // 2. Moments (Days log entry)
      if (!kinds || kinds.has("moment")) {
        const entryRows = await sql<{
          id: string;
          author_id: string;
          body: string | null;
          activity: string | null;
          place: string | null;
          mood: string | null;
          shared_day: string | null;
          occurred_at: Date;
          created_at: Date;
        }>`
          select e.id, e.author_id, e.body, e.activity, e.place, e.mood, e.shared_day, e.occurred_at, e.created_at
          from entry e
          where e.relationship_id = ${relationshipId}
            and (
              e.visibility = 'shared'
              or (e.visibility = 'after_reveal' and e.revealed_at is not null)
              or e.author_id = ${viewer.userId}
            )
            and (
              to_tsvector('english', coalesce(e.body, '') || ' ' || coalesce(e.activity, '') || ' ' || coalesce(e.place, '') || ' ' || coalesce(e.mood, '')) @@ websearch_to_tsquery('english', ${q})
              or coalesce(e.body, '') ilike ${likeQ}
              or coalesce(e.activity, '') ilike ${likeQ}
              or coalesce(e.place, '') ilike ${likeQ}
              or coalesce(e.mood, '') ilike ${likeQ}
            )
            ${who === "me" ? sql`and e.author_id = ${viewer.userId}` : who === "partner" ? sql`and e.author_id != ${viewer.userId}` : sql``}
          order by e.occurred_at desc
          limit ${limit + 1}
        `.execute(trx);

        for (const row of entryRows.rows) {
          const mine = row.author_id === viewer.userId;
          const atIso = new Date(row.occurred_at).toISOString();
          allItems.push({
            id: row.id,
            kind: "moment",
            title: row.place ?? row.activity ?? row.mood ?? "Day Entry",
            snippet: row.body ?? row.activity ?? null,
            at: atIso,
            mine,
            sealed: false,
            href: `/days?date=${row.shared_day ?? atIso.slice(0, 10)}`,
          });
        }
      }

      // 3. Open When Letters
      if (!kinds || kinds.has("letter")) {
        const letterRows = await sql<{
          id: string;
          author_id: string;
          recipient_id: string;
          prompt: string;
          status: "draft" | "sealed" | "opened";
          created_at: Date;
          body: string | null;
        }>`
          select l.id, l.author_id, l.recipient_id, l.prompt, l.status, l.created_at, c.body
          from open_when_letter l
          left join open_when_letter_content c on c.letter_id = l.id
          where l.relationship_id = ${relationshipId}
            and (
              to_tsvector('english', coalesce(l.prompt, '')) @@ websearch_to_tsquery('english', ${q})
              or l.prompt ilike ${likeQ}
              or (c.body is not null and (
                to_tsvector('english', c.body) @@ websearch_to_tsquery('english', ${q})
                or c.body ilike ${likeQ}
              ))
            )
            ${who === "me" ? sql`and l.author_id = ${viewer.userId}` : who === "partner" ? sql`and l.author_id != ${viewer.userId}` : sql``}
          order by l.created_at desc
          limit ${limit + 1}
        `.execute(trx);

        for (const row of letterRows.rows) {
          const mine = row.author_id === viewer.userId;
          const isSealed = row.status === "sealed";
          allItems.push({
            id: row.id,
            kind: "letter",
            title: row.prompt,
            snippet: isSealed ? "Sealed letter" : (row.body ?? null),
            at: new Date(row.created_at).toISOString(),
            mine,
            sealed: isSealed,
            href: `/moments/letters?letterId=${row.id}`,
          });
        }
      }

      // 4. Memories
      if (!kinds || kinds.has("memory")) {
        const memRows = await sql<{
          id: string;
          author_id: string;
          title: string;
          story: string;
          place: string;
          created_at: Date;
        }>`
          select m.id, m.author_id, m.title, m.story, m.place, m.created_at
          from memory m
          where m.relationship_id = ${relationshipId}
            and (
              to_tsvector('english', coalesce(m.title, '') || ' ' || coalesce(m.story, '') || ' ' || coalesce(m.place, '')) @@ websearch_to_tsquery('english', ${q})
              or m.title ilike ${likeQ}
              or m.story ilike ${likeQ}
              or m.place ilike ${likeQ}
            )
            ${who === "me" ? sql`and m.author_id = ${viewer.userId}` : who === "partner" ? sql`and m.author_id != ${viewer.userId}` : sql``}
          order by m.created_at desc
          limit ${limit + 1}
        `.execute(trx);

        for (const row of memRows.rows) {
          allItems.push({
            id: row.id,
            kind: "memory",
            title: row.title,
            snippet: row.story || row.place || null,
            at: new Date(row.created_at).toISOString(),
            mine: row.author_id === viewer.userId,
            sealed: false,
            href: `/moments/memories?memoryId=${row.id}`,
          });
        }
      }

      // 5. Events & Plans
      if (!kinds || kinds.has("event")) {
        const eventRows = await sql<{
          id: string;
          author_id: string;
          title: string;
          description: string | null;
          created_at: Date;
        }>`
          select e.id, e.author_id, e.title, e.description, e.created_at
          from calendar_event e
          where e.relationship_id = ${relationshipId}
            and (
              to_tsvector('english', coalesce(e.title, '') || ' ' || coalesce(e.description, '')) @@ websearch_to_tsquery('english', ${q})
              or e.title ilike ${likeQ}
              or coalesce(e.description, '') ilike ${likeQ}
            )
            ${who === "me" ? sql`and e.author_id = ${viewer.userId}` : who === "partner" ? sql`and e.author_id != ${viewer.userId}` : sql``}
          order by e.created_at desc
          limit ${limit + 1}
        `.execute(trx);

        for (const row of eventRows.rows) {
          allItems.push({
            id: row.id,
            kind: "event",
            title: row.title,
            snippet: row.description ?? null,
            at: new Date(row.created_at).toISOString(),
            mine: row.author_id === viewer.userId,
            sealed: false,
            href: `/moments/events?eventId=${row.id}`,
          });
        }

        const planRows = await sql<{
          id: string;
          author_id: string;
          title: string;
          note: string;
          place: string;
          created_at: Date;
        }>`
          select p.id, p.author_id, p.title, p.note, p.place, p.created_at
          from together_plan p
          where p.relationship_id = ${relationshipId}
            and (
              to_tsvector('english', coalesce(p.title, '') || ' ' || coalesce(p.note, '') || ' ' || coalesce(p.place, '')) @@ websearch_to_tsquery('english', ${q})
              or p.title ilike ${likeQ}
              or p.note ilike ${likeQ}
              or p.place ilike ${likeQ}
            )
            ${who === "me" ? sql`and p.author_id = ${viewer.userId}` : who === "partner" ? sql`and p.author_id != ${viewer.userId}` : sql``}
          order by p.created_at desc
          limit ${limit + 1}
        `.execute(trx);

        for (const row of planRows.rows) {
          allItems.push({
            id: row.id,
            kind: "event",
            title: row.title,
            snippet: row.note || row.place || null,
            at: new Date(row.created_at).toISOString(),
            mine: row.author_id === viewer.userId,
            sealed: false,
            href: `/moments/together?planId=${row.id}`,
          });
        }
      }

      // Sort all items newest first
      allItems.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      // Handle cursor pagination
      let filtered = allItems;
      if (req.cursor) {
        const cursorTime = new Date(req.cursor).getTime();
        filtered = allItems.filter((item) => new Date(item.at).getTime() < cursorTime);
      }

      const results = filtered.slice(0, limit);
      const nextItem = filtered[limit];
      const nextCursor = nextItem ? nextItem.at : null;

      return {
        results,
        nextCursor,
        totalEstimated: allItems.length,
      };
    });
  }
}
