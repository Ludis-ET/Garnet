import "reflect-metadata";
import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import { Module, type DynamicModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import type { Kysely } from "kysely";
import type { Auth } from "./auth/auth";
import { registerAuthRoutes } from "./auth/bridge";
import { SessionGuard } from "./auth/session.guard";
import type { AuthPolicy, SocialConfig } from "./config";
import { AccountController, DevicesController } from "./account/account.controller";
import { DataRightsController } from "./account/data-rights.controller";
import { DataRightsService } from "./account/data-rights.service";
import { AUTH, KYSELY, POLICY, SOCIAL, type Database } from "./db/database";
import { ProblemFilter } from "./errors/problem.filter";
import { HealthController } from "./health/health.controller";
import { SafeLogController } from "./logging";
import { MeController } from "./me/me.controller";
import { PairingController } from "./pairing/pairing.controller";
import {
  RegistrationController,
  SignInMethodsController,
} from "./registration/registration.controller";
import { SettingsController } from "./settings/settings.controller";
import { SetupController } from "./setup/setup.controller";
import { SyncController } from "./sync/sync.controller";
import { SyncService } from "./sync/sync.service";
import { DaysController } from "./days/days.controller";
import { DaysService } from "./days/days.service";
import { SignalsController } from "./signals/signals.controller";
import { SignalsService } from "./signals/signals.service";
import { ChatController } from "./chat/chat.controller";
import { ChatService } from "./chat/chat.service";
import { ChatEventsService } from "./chat/chat-events.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationsService } from "./notifications/notifications.service";
import { InMemoryPushSender, PUSH_SENDER, type PushSender } from "./notifications/push-sender";
import { MediaController } from "./media/media.controller";
import { MediaService } from "./media/media.service";
import { MediaPurgeService } from "./media/media-purge.service";
import {
  InMemoryObjectStorage,
  OBJECT_STORAGE,
  type ObjectStorage,
} from "./media/storage/object-storage";
import { OpenWhenController } from "./moments/open-when.controller";
import { OpenWhenService } from "./moments/open-when.service";
import { SurprisesController } from "./moments/surprises.controller";
import { SurprisesService } from "./moments/surprises.service";
import { EventsController } from "./moments/events.controller";
import { EventsService } from "./moments/events.service";
import { MemoriesController } from "./moments/memories.controller";
import { MemoriesService } from "./moments/memories.service";
import { TogetherController } from "./moments/together.controller";
import { TogetherService } from "./moments/together.service";
import { SearchController } from "./search/search.controller";
import { SearchService } from "./search/search.service";

/** Bodies above this are refused with 413 before any handler runs. */
export const BODY_LIMIT_BYTES = 64 * 1024;

@Module({})
class AppModule {
  static with(options: AppOptions): DynamicModule {
    return {
      module: AppModule,
      controllers: [
        HealthController,
        SignInMethodsController,
        MeController,
        RegistrationController,
        SetupController,
        PairingController,
        SettingsController,
        AccountController,
        DevicesController,
        SyncController,
        DaysController,
        SignalsController,
        ChatController,
        NotificationsController,
        MediaController,
        OpenWhenController,
        SurprisesController,
        EventsController,
        MemoriesController,
        TogetherController,
        DataRightsController,
        SearchController,
      ],
      providers: [
        SyncService,
        DaysService,
        SignalsService,
        ChatService,
        ChatEventsService,
        NotificationsService,
        MediaService,
        MediaPurgeService,
        OpenWhenService,
        SurprisesService,
        EventsService,
        MemoriesService,
        TogetherService,
        DataRightsService,
        SearchService,
        { provide: KYSELY, useValue: options.db },
        { provide: AUTH, useValue: options.auth },
        { provide: POLICY, useValue: options.policy },
        { provide: SOCIAL, useValue: options.social ?? {} },
        { provide: PUSH_SENDER, useValue: options.pushSender ?? new InMemoryPushSender() },
        { provide: OBJECT_STORAGE, useValue: options.objectStorage ?? new InMemoryObjectStorage() },
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_FILTER, useClass: ProblemFilter },
      ],
    };
  }
}

export interface AppOptions {
  db: Kysely<Database>;
  /** Better Auth (B1, P-77): its routes under /v1/auth, and the session check for the rest. */
  auth: Auth;
  policy: AuthPolicy;
  /** Google and Apple, when configured (P-79); the same object Better Auth was given. */
  social?: SocialConfig;
  /** Optional push sender provider (defaults to InMemoryPushSender). */
  pushSender?: PushSender;
  /** Optional object storage provider (defaults to InMemoryObjectStorage). */
  objectStorage?: ObjectStorage;
  logLevel: string;
  /** Where log lines go (tests capture them); stdout by default. */
  logStream?: { write(line: string): void };
  /** Called on the Fastify instance before routes are added (tests list the routes). */
  beforeRoutes?: (fastify: FastifyInstance) => void;
}

/**
 * The API as an application, ready to listen or to be called in tests (B-12):
 * - request ids are ours (UUIDs), never taken from the caller, and returned as x-request-id;
 * - one log line per request with allow-listed fields only: route pattern, method, status,
 *   latency, request id; never bodies, headers, query strings, ids in paths or tokens (§6);
 * - every error is an RFC 9457 problem; unknown routes are 404 problems;
 * - Fastify's own log lines are reduced to the same allow-list (SafeLogController);
 * - responses are never cached and never sniffed.
 */
export async function createApp(options: AppOptions): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    logController: new SafeLogController(),
    exposeHeadRoutes: false,
    bodyLimit: BODY_LIMIT_BYTES,
    return503OnClosing: true,
    logger: {
      level: options.logLevel,
      ...(options.logStream === undefined ? {} : { stream: options.logStream }),
    },
  });
  const fastify = adapter.getInstance();
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "x-garnet-client",
      "expo-origin",
      "user-agent",
    ],
    exposedHeaders: ["x-request-id", "retry-after", "set-cookie"],
  });
  options.beforeRoutes?.(fastify);
  fastify.addHook("onSend", async (request, reply) => {
    void reply.header("x-request-id", request.id);
    void reply.header("cache-control", "no-store");
    void reply.header("x-content-type-options", "nosniff");
  });
  fastify.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        route: request.routeOptions.url ?? "unmatched",
        status: reply.statusCode,
        latencyMs: Math.round(reply.elapsedTime),
      },
      "request",
    );
  });

  registerAuthRoutes(fastify, options.auth);

  const app = await NestFactory.create<NestFastifyApplication>(AppModule.with(options), adapter, {
    logger: false,
  });
  app.enableShutdownHooks();
  // Nest routes unknown routes and Fastify's own errors (body parsing, size limits) through
  // ProblemFilter, so every error leaves as a problem.
  await app.init();
  await fastify.ready();
  return app;
}
