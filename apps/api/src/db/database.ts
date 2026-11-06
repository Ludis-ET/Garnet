import { sql, type Kysely, type Transaction } from "kysely";

/**
 * The tables the API reads, as Kysely types. Only what the code uses is described; each phase
 * adds its own. The source of truth is packages/db/migrations.
 */
export interface Database {
  app_user: {
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
    image: string | null;
    birth_date: string | null;
    terms_version: string | null;
    terms_accepted_at: Date | null;
    deletion_requested_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  relationship: {
    id: string;
    reference_time_zone: string;
    day_cutoff: string | null;
    created_at: Date;
    ended_at: Date | null;
    ended_by_user_id: string | null;
    ended_reason: string | null;
  };
  session: {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
    updated_at: Date;
  };
  account: {
    id: string;
    user_id: string;
    account_id: string;
    provider_id: string;
    password: string | null;
    access_token: string | null;
    refresh_token: string | null;
    id_token: string | null;
    created_at: Date;
    updated_at: Date;
  };
  user_settings: {
    user_id: string;
    schema_version: number;
    doc: unknown;
    updated_at: Date;
  };
  relationship_member: {
    relationship_id: string;
    user_id: string;
    joined_at: Date;
    left_at: Date | null;
  };
  profile: {
    user_id: string;
    display_name: string;
    nickname: string;
    side: "ruby" | "sapphire" | null;
    avatar: unknown;
    time_zone: string | null;
    home_city: string | null;
    appearance: "system" | "light" | "dark";
    accent: "subtle" | "rich";
    notifications: unknown;
    done: string[];
    complete: boolean;
    updated_at: Date;
  };
  entry: {
    id: string;
    relationship_id: string;
    author_id: string;
    kind: string;
    body: string | null;
    emoji: string | null;
    mood: string | null;
    activity: string | null;
    place: string | null;
    visibility: string;
    occurred_at: Date;
    occurred_time_zone: string;
    received_at: Date;
    shared_at: Date | null;
    shared_day: string | null;
    version: number;
    revealed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  tombstone: {
    entity_type: string;
    entity_id: string;
    relationship_id: string;
    deleted_at: Date;
  };
  change_log: {
    seq: string | number;
    relationship_id: string;
    entity_type: string;
    entity_id: string;
    op: "upsert" | "delete";
    mutation_id: string | null;
    visible_to: string | null;
    created_at: Date;
  };
  processed_mutation: {
    mutation_id: string;
    user_id: string;
    request_fingerprint: Buffer;
    outcome: string;
    created_at: Date;
  };
  day_readiness: {
    relationship_id: string;
    user_id: string;
    day: string;
    ready_at: Date;
  };
  signal: {
    id: string;
    relationship_id: string;
    sender_id: string;
    signal_type: string;
    level: string;
    payload: unknown;
    sent_at: Date;
    expires_at: Date | null;
    created_at: Date;
  };
  signal_response: {
    id: string;
    signal_id: string;
    responder_id: string;
    preset: string | null;
    body: string | null;
    sent_at: Date;
  };
  user_coarse_location: {
    user_id: string;
    lat: number;
    lon: number;
    updated_at: Date;
  };
  chat_message: {
    id: string;
    relationship_id: string;
    sender_id: string;
    text: string;
    media: unknown;
    sticker: unknown;
    reply_to_id: string | null;
    created_at: Date;
    edited_at: Date | null;
    deleted_for_everyone: boolean;
    deleted_for_everyone_at: Date | null;
  };
  chat_message_visibility: {
    message_id: string;
    user_id: string;
    deleted_for_me: boolean;
    saved_as_memory: boolean;
  };
  chat_reaction: {
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: Date;
  };
  chat_pin: {
    relationship_id: string;
    message_id: string;
    pinned_by: string;
    pinned_at: Date;
  };
  chat_participant_state: {
    relationship_id: string;
    user_id: string;
    read_receipts: boolean | null;
    typing_indicators: boolean;
    read_up_to: Date | null;
    typing_until: Date | null;
    in_chat_until: Date | null;
    updated_at: Date;
  };
  notification: {
    id: string;
    relationship_id: string;
    user_id: string;
    sender_id: string | null;
    category: string;
    group_name: "messages" | "signals" | "days" | "letters" | "events" | "account" | "reminders";
    title: string;
    body: string;
    href: string;
    metadata: unknown;
    read_at: Date | null;
    created_at: Date;
  };
  push_device: {
    id: string;
    user_id: string;
    session_id: string;
    token: string;
    platform: "ios" | "android" | "web";
    created_at: Date;
    updated_at: Date;
  };
  media: {
    id: string;
    entry_id: string | null;
    chat_message_id: string | null;
    relationship_id: string;
    uploader_id: string;
    object_key: string;
    content_type: string;
    byte_size: number | string;
    sha256: Buffer | Uint8Array;
    status: "pending_upload" | "ready" | "rejected";
    entity_type: string;
    entity_id: string | null;
    width: number | null;
    height: number | null;
    duration_seconds: number | null;
    created_at: Date;
    updated_at: Date;
  };
  media_purge_queue: {
    object_key: string;
    enqueued_at: Date;
    attempts: number;
  };
  open_when_letter: {
    id: string;
    relationship_id: string;
    author_id: string;
    recipient_id: string;
    prompt: string;
    status: "draft" | "sealed" | "opened";
    sealed_at: Date | null;
    opened_at: Date | null;
    unlock_rule: unknown;
    created_at: Date;
  };
  open_when_letter_content: {
    letter_id: string;
    body: string;
    paper: unknown;
    media_refs: unknown;
  };
  surprise: {
    id: string;
    relationship_id: string;
    author_id: string;
    recipient_id: string;
    safe_title: string | null;
    state: "scheduled" | "opened" | "cancelled";
    reveal: unknown;
    opened_at: Date | null;
    created_at: Date;
  };
  surprise_content: {
    surprise_id: string;
    kind: string;
    text_content: string | null;
    media_ref: unknown;
    song_info: unknown;
    paper: unknown;
  };
  calendar_event: {
    id: string;
    relationship_id: string;
    author_id: string;
    title: string;
    kind: string;
    first_date: string;
    event_time: string | null;
    time_zone: string | null;
    repeats: string;
    whose: string | null;
    description: string | null;
    reminders: unknown;
    art: string | null;
    created_at: Date;
    updated_at: Date;
  };
  chapter_reflection: {
    relationship_id: string;
    user_id: string;
    month: string;
    prompt_id: string;
    reflection: string;
    created_at: Date;
    updated_at: Date;
  };
  chapter_title: {
    relationship_id: string;
    month: string;
    title: string;
    renamed_by: string;
    created_at: Date;
    updated_at: Date;
  };
  memory: {
    id: string;
    relationship_id: string;
    author_id: string;
    title: string;
    story: string;
    memory_date: string;
    place: string;
    kind: string;
    media_ref: unknown;
    tags: string[];
    created_at: Date;
    updated_at: Date;
  };
  memory_collection: {
    id: string;
    relationship_id: string;
    author_id: string;
    title: string;
    description: string;
    art: string;
    created_at: Date;
  };
  memory_collection_item: {
    memory_id: string;
    collection_id: string;
  };
  together_plan: {
    id: string;
    relationship_id: string;
    author_id: string;
    title: string;
    note: string;
    theme: string;
    art: string | null;
    place: string;
    when_data: unknown;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
  };
  together_place: {
    id: string;
    relationship_id: string;
    author_id: string;
    name: string;
    note: string;
    art: string | null;
    created_at: Date;
  };
  together_song: {
    id: string;
    relationship_id: string;
    author_id: string;
    title: string;
    artist: string;
    link: string;
    note: string;
    created_at: Date;
  };
  export_job: {
    id: string;
    user_id: string;
    relationship_id: string | null;
    state: "none" | "preparing" | "ready" | "expired" | "failed";
    download_token: string | null;
    ready_at: Date | null;
    expires_at: Date | null;
    file_size_bytes: number | null;
    payload_json: string | null;
    created_at: Date;
    updated_at: Date;
  };
}

/** The Nest injection token for the shared Kysely instance. */
export const KYSELY = Symbol("kysely");

/** Who a request is for, from the session only (ADR-0004). */
export interface Viewer {
  userId: string;
  sessionId: string;
  /** The account's name (Better Auth's user.name): the first display name in setup. */
  name: string;
}

/** The Nest injection tokens for Better Auth and the auth policy (B1). */
export const AUTH = Symbol("auth");
export const POLICY = Symbol("policy");
/** Google and Apple sign-in, when configured (P-79). */
export const SOCIAL = Symbol("social");

/**
 * Runs `fn` the way every authenticated request touches data (ADR-0004): one transaction, as the
 * unprivileged garnet_app role, with the viewer bound to it, so row-level security applies on top
 * of the API's own checks. The user id is a bound parameter, never spliced into SQL.
 */
export function asViewer<T>(
  db: Kysely<Database>,
  viewer: Viewer,
  fn: (trx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.user_id', ${viewer.userId}, true)`.execute(trx);
    if (process.env["GARNET_DISABLE_ROLE_SWITCH"] !== "true") {
      await sql`set local role garnet_app`.execute(trx);
    }
    return fn(trx);
  });
}
