import { Catch, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { problemBody, problemCodeOf } from "./problem";

/**
 * What may be logged about an unexpected error: its type and, for database errors, the
 * SQLSTATE code. Never the message: Postgres messages can quote row values ("Key (email)=…").
 */
export function safeErrorFields(error: unknown): { error: string; sqlState?: string } {
  const name = error instanceof Error ? error.name : typeof error;
  const sqlState =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? /^[0-9A-Z]{5}$/.test(error.code)
        ? error.code
        : undefined
      : undefined;
  return sqlState === undefined ? { error: name } : { error: name, sqlState };
}

/** Sends any error as an RFC 9457 problem (B-12). */
export function sendProblem(error: unknown, request: FastifyRequest, reply: FastifyReply): void {
  const code = problemCodeOf(error);
  if (code === "internal")
    request.log.error({ requestId: request.id, code, ...safeErrorFields(error) }, "request failed");
  const body = problemBody(code, request.id);
  void reply.status(body.status).header("content-type", "application/problem+json").send(body);
}

/** Every exception Nest sees goes out as a problem: no framework default body ever leaks. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    sendProblem(exception, http.getRequest<FastifyRequest>(), http.getResponse<FastifyReply>());
  }
}
