import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const OBJECT_STORAGE = Symbol("object_storage");

export interface PresignPutArgs {
  bucket: string;
  key: string;
  contentType: string;
  byteSize: number;
  expiresIn: number;
}

export interface PresignGetArgs {
  bucket: string;
  key: string;
  expiresIn: number;
}

export interface ObjectStorage {
  presignPut(args: PresignPutArgs): Promise<string>;
  presignGet(args: PresignGetArgs): Promise<string>;
  objectExists(bucket: string, key: string): Promise<boolean>;
  readObject(bucket: string, key: string): Promise<Buffer>;
  putObject(bucket: string, key: string, bytes: Buffer, contentType: string): Promise<void>;
  deleteObject(bucket: string, key: string): Promise<void>;
  listKeys(bucket: string, prefix?: string): Promise<string[]>;
}

/** In-memory storage for test suites and offline local verification (zero external services needed). */
export class InMemoryObjectStorage implements ObjectStorage {
  private readonly store = new Map<string, { bytes: Buffer; contentType: string }>();

  presignPut(args: PresignPutArgs): Promise<string> {
    return Promise.resolve(
      `https://storage.local/${args.bucket}/${args.key}?upload=1&expires=${args.expiresIn}`,
    );
  }

  presignGet(args: PresignGetArgs): Promise<string> {
    return Promise.resolve(
      `https://storage.local/${args.bucket}/${args.key}?expires=${args.expiresIn}`,
    );
  }

  objectExists(bucket: string, key: string): Promise<boolean> {
    return Promise.resolve(this.store.has(`${bucket}/${key}`));
  }

  readObject(bucket: string, key: string): Promise<Buffer> {
    const item = this.store.get(`${bucket}/${key}`);
    if (!item) {
      const err = new Error("NoSuchKey");
      (err as { name?: string }).name = "NoSuchKey";
      return Promise.reject(err);
    }
    return Promise.resolve(item.bytes);
  }

  putObject(bucket: string, key: string, bytes: Buffer, contentType: string): Promise<void> {
    this.store.set(`${bucket}/${key}`, { bytes, contentType });
    return Promise.resolve();
  }

  deleteObject(bucket: string, key: string): Promise<void> {
    this.store.delete(`${bucket}/${key}`);
    return Promise.resolve();
  }

  listKeys(bucket: string, prefix = ""): Promise<string[]> {
    const keys: string[] = [];
    const pfx = `${bucket}/${prefix}`;
    for (const fullKey of this.store.keys()) {
      if (fullKey.startsWith(pfx)) {
        keys.push(fullKey.slice(bucket.length + 1));
      }
    }
    return Promise.resolve(keys);
  }

  clear(): void {
    this.store.clear();
  }
}

/** S3-compatible client for SeaweedFS (local dev, P-76) and S3 hosting (U-07). */
export class S3ObjectStorage implements ObjectStorage {
  private readonly s3: S3Client;
  private readonly timeoutMs: number;

  constructor(options: {
    endpoint: string;
    region?: string;
    accessKeyId: string;
    secretAccessKey: string;
    timeoutMs?: number;
  }) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.s3 = new S3Client({
      endpoint: options.endpoint,
      region: options.region ?? "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      requestHandler: {
        requestTimeout: this.timeoutMs,
        connectionTimeout: 1000,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  /** Hard per-call deadline (F-07 finding 2, P-38). */
  private deadline() {
    return { abortSignal: AbortSignal.timeout(this.timeoutMs) };
  }

  async presignPut(args: PresignPutArgs): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
        ContentType: args.contentType,
        ContentLength: args.byteSize,
      }),
      { expiresIn: args.expiresIn, signableHeaders: new Set(["content-type", "content-length"]) },
    );
  }

  async presignGet(args: PresignGetArgs): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: args.bucket,
        Key: args.key,
      }),
      { expiresIn: args.expiresIn },
    );
  }

  async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), this.deadline());
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  async readObject(bucket: string, key: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      this.deadline(),
    );
    if (!response.Body) throw new Error("Missing response body");
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async putObject(bucket: string, key: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        ContentLength: bytes.length,
      }),
      this.deadline(),
    );
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), this.deadline());
  }

  async listKeys(bucket: string, prefix = ""): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined = undefined;
    do {
      const response: ListObjectsV2CommandOutput = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
        this.deadline(),
      );
      for (const obj of response.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      token = response.NextContinuationToken;
    } while (token !== undefined);
    return keys;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ("name" in error ? (error as { name?: string }).name === "NotFound" : false)
  );
}
