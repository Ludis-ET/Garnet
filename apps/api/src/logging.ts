import { LogController, type FastifyRequest } from "fastify";
import { safeErrorFields } from "./errors/problem.filter";

/**
 * Fastify's own log lines, reduced to the allow-list (AGENTS.md §6). Its defaults would log
 * URLs (with ids and queries), headers and error messages; here request start and end lines are
 * off (createApp writes one allow-listed line per request instead), and every error path logs
 * only the request id, the error's type and its SQLSTATE.
 */
export class SafeLogController extends LogController {
  constructor() {
    super({ disableRequestLogging: true });
  }

  override incomingRequest(): void {
    // createApp's onResponse hook writes the request line.
  }

  override requestCompleted(): void {
    // As above.
  }

  override routeNotFound(): void {
    // Unknown routes are answered with a 404 problem; the URL itself is never logged.
  }

  override defaultErrorLog(error: Error, request: FastifyRequest): void {
    this.#error("request error", error, request);
  }

  override streamError(error: Error, request: FastifyRequest): void {
    this.#error("stream error", error, request);
  }

  override writeHeadError(error: Error, request: FastifyRequest): void {
    this.#error("write error", error, request);
  }

  override serializerError(error: Error, request: FastifyRequest): void {
    this.#error("serializer error", error, request);
  }

  #error(msg: string, error: Error, request: FastifyRequest): void {
    request.log.error({ requestId: request.id, ...safeErrorFields(error) }, msg);
  }
}
