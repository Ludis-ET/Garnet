import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { execFileSync } from "node:child_process";
import { request } from "node:http";

/** Random local-only identity generated per run by scripts/local-credentials.mjs; never committed. */
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) throw new Error(`${name} not set: run \`pnpm spike:media\``);
  return value;
}
export const CONTAINER = "garnet-f07-s3";

export function endpoint(): string {
  const value = process.env["F07_S3_ENDPOINT"];
  if (value === undefined) throw new Error("F07_S3_ENDPOINT not set: run `pnpm spike:media`");
  return value;
}

/**
 * Hard per-call deadline. F-07 finding: the SDK's handler timeouts did not bound a call to a
 * frozen backend (Docker's port forwarder still accepts the TCP connection), so every storage
 * call carries an AbortSignal deadline instead.
 */
const deadlines = new WeakMap<S3Client, number>();
const deadline = (s3: S3Client) => ({
  abortSignal: AbortSignal.timeout(deadlines.get(s3) ?? 5000),
});

export function createS3Client(
  options: { timeoutMs?: number; maxAttempts?: number } = {},
): S3Client {
  const client = new S3Client({
    endpoint: endpoint(),
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv("F07_S3_ACCESS_KEY"),
      secretAccessKey: requiredEnv("F07_S3_SECRET_KEY"),
    },
    maxAttempts: options.maxAttempts ?? 2,
    requestHandler: { requestTimeout: options.timeoutMs ?? 3000, connectionTimeout: 1000 },
    // Presigned URLs must not demand SDK-computed checksum headers the phone won't send.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  deadlines.set(client, options.timeoutMs ?? 5000);
  return client;
}

/** Waits until the storage answers HTTP at all (403 counts: auth is on). */
export async function waitForStorage(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await fetch(endpoint(), { signal: AbortSignal.timeout(1000) });
      return;
    } catch {
      if (Date.now() > deadline) throw new Error("S3 storage did not become reachable");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export async function createBucket(s3: S3Client, bucket: string): Promise<void> {
  await s3.send(new CreateBucketCommand({ Bucket: bucket }), deadline(s3));
}

export async function presignPut(
  s3: S3Client,
  args: { bucket: string; key: string; contentType: string; byteSize: number; expiresIn: number },
): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
      ContentType: args.contentType,
      ContentLength: args.byteSize,
    }),
    { expiresIn: args.expiresIn, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

export async function objectExists(s3: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), deadline(s3));
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function readObject(s3: S3Client, bucket: string, key: string): Promise<Buffer> {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }), deadline(s3));
  if (response.Body === undefined) throw new Error("empty body");
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteObject(s3: S3Client, bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), deadline(s3));
}

export async function listKeys(s3: S3Client, bucket: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
      deadline(s3),
    );
    for (const item of page.Contents ?? []) if (item.Key !== undefined) keys.push(item.Key);
    token = page.NextContinuationToken;
  } while (token !== undefined);
  return keys;
}

export function isNotFound(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e.name === "NotFound" || e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404;
}

export interface PutOutcome {
  /** HTTP status, or "aborted" / "timeout" / "network-error" when no response arrived. */
  readonly status: number | "aborted" | "timeout" | "network-error";
}

/**
 * Uploads like a phone would: a raw HTTP PUT to the presigned URL. Can simulate an interrupted
 * upload (send part of the body, then drop the connection) and a client-side timeout.
 */
export function rawPut(
  url: string,
  body: Buffer,
  options: {
    contentType: string;
    contentLength?: number;
    abortAfterBytes?: number;
    timeoutMs?: number;
  },
): Promise<PutOutcome> {
  return new Promise((resolve) => {
    const req = request(url, {
      method: "PUT",
      headers: {
        "content-type": options.contentType,
        "content-length": String(options.contentLength ?? body.length),
      },
    });
    let settled = false;
    const finish = (outcome: PutOutcome) => {
      if (!settled) {
        settled = true;
        resolve(outcome);
      }
    };
    req.setTimeout(options.timeoutMs ?? 5000, () => {
      finish({ status: "timeout" });
      req.destroy();
    });
    req.on("response", (res) => {
      res.resume();
      res.on("end", () => {
        finish({ status: res.statusCode ?? 0 });
      });
    });
    req.on("error", () => {
      finish({ status: settled ? "aborted" : "network-error" });
    });
    if (options.abortAfterBytes !== undefined) {
      req.write(body.subarray(0, options.abortAfterBytes), () => {
        finish({ status: "aborted" });
        req.destroy();
      });
    } else {
      req.end(body);
    }
  });
}

/** Simulates a transient storage outage (container frozen, sockets hang). */
export function pauseStorage(): void {
  execFileSync("docker", ["pause", CONTAINER]);
}

export function unpauseStorage(): void {
  execFileSync("docker", ["unpause", CONTAINER]);
}
