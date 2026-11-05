import "reflect-metadata";
import { randomUUID } from "node:crypto";
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
      ],
      providers: [
        { provide: KYSELY, useValue: options.db },
        { provide: AUTH, useValue: options.auth },
        { provide: POLICY, useValue: options.policy },
        { provide: SOCIAL, useValue: options.social ?? {} },
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
