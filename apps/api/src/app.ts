import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { Module, type DynamicModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import type { Kysely } from "kysely";
import { SessionGuard } from "./auth/session.guard";
import { KYSELY, type Database } from "./db/database";
import { ProblemFilter } from "./errors/problem.filter";
import { HealthController } from "./health/health.controller";
import { SafeLogController } from "./logging";
import { MeController } from "./me/me.controller";

/** Bodies above this are refused with 413 before any handler runs. */
export const BODY_LIMIT_BYTES = 64 * 1024;

@Module({})
class AppModule {
  static with(db: Kysely<Database>): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, MeController],
      providers: [
        { provide: KYSELY, useValue: db },
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_FILTER, useClass: ProblemFilter },
      ],
    };
  }
}

export interface AppOptions {
  db: Kysely<Database>;
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

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.with(options.db),
    adapter,
    {
      logger: false,
    },
  );
  app.enableShutdownHooks();
  // Nest routes unknown routes and Fastify's own errors (body parsing, size limits) through
  // ProblemFilter, so every error leaves as a problem.
  await app.init();
  await fastify.ready();
  return app;
}
