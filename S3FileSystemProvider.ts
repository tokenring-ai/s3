import type { DirectoryTreeOptions, FileSystemProvider, StatLike } from "@tokenring-ai/filesystem/FileSystemProvider";
import { S3Client } from "bun";
import { z } from "zod";

export const S3FileSystemProviderOptionsSchema = z.object({
  bucket: z.string(),
  endpoint: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
});

export type S3FileSystemProviderOptions = z.infer<typeof S3FileSystemProviderOptionsSchema>;
export type ParsedS3FileSystemProviderOptions = z.output<typeof S3FileSystemProviderOptionsSchema>;

export default class S3FileSystemProvider implements FileSystemProvider {
  private readonly bucketName: string;
  private readonly client: S3Client;

  constructor({ bucket, region, endpoint, accessKeyId, secretAccessKey }: ParsedS3FileSystemProviderOptions) {
    if (!bucket) throw new Error("S3FileSystem requires a 'bucketName'.");
    this.bucketName = bucket;
    this.client = new S3Client({
      bucket: bucket,
      region,
      endpoint,
      accessKeyId,
      secretAccessKey
    });
  }

  relativeOrAbsolutePathToAbsolutePath(p: string): string {
    if (p.startsWith("s3://")) return p;
    return `s3://${this.bucketName}/${this._s3Key(p)}`;
  }

  async writeFile(fsPath: string, content: string | Buffer): Promise<boolean> {
    const key = this._s3Key(fsPath);
    if (!key) throw new Error("Path results in an empty S3 key.");
    await this.client.write(key, content);
    return true;
  }

  async appendFile(filePath: string, content: string | Buffer): Promise<boolean> {
    try {
      if (typeof content === "string") {
        const existing = await this.readFile(filePath, "utf8");
        return this.writeFile(filePath, `${existing ?? ""}${content}`);
      }
      const existing = await this.readFile(filePath, "buffer");
      return this.writeFile(filePath, Buffer.concat([existing ?? Buffer.alloc(0), content]));
    } catch {
      return this.writeFile(filePath, content);
    }
  }

  async readFile(fsPath: string): Promise<Buffer | null>;
  async readFile(fsPath: string, encoding: "buffer"): Promise<Buffer>;
  async readFile(fsPath: string, encoding: BufferEncoding): Promise<string>;
  async readFile(fsPath: string, encoding?: BufferEncoding | "buffer"): Promise<Buffer | string | null> {
    const key = this._s3Key(fsPath);
    if (!key) throw new Error("Path results in an empty S3 key.");
    const file = this.client.file(key);
    if (!encoding || encoding === "buffer") return Buffer.from(await file.arrayBuffer());
    return file.text();
  }

  async deleteFile(fsPath: string): Promise<boolean> {
    const key = this._s3Key(fsPath);
    if (!key) throw new Error("Path results in an empty S3 key for deletion.");
    await this.client.delete(key);
    return true;
  }

  async exists(fsPath: string): Promise<boolean> {
    const key = this._s3Key(fsPath);
    if (!key) return false;
    return this.client.exists(key);
  }

  async stat(fsPath: string): Promise<StatLike> {
    const key = this._s3Key(fsPath);

    if (key) {
      try {
        const s = await this.client.file(key).stat();
        return {
          exists: true,
          path: fsPath,
          absolutePath: this.relativeOrAbsolutePathToAbsolutePath(fsPath),
          isFile: true,
          isDirectory: false,
          isSymbolicLink: false,
          size: s.size,
          modified: s.lastModified,
          created: s.lastModified,
          accessed: s.lastModified,
        };
      } catch {
        // fall through to directory check
      }
    }

    // Directory check via listing
    const prefix = key ? `${key}/` : "";
    const list = await this.client.list({ prefix, maxKeys: 1 });
    if ((list.contents?.length ?? 0) > 0 || !key) {
      return {
        exists: true,
        path: fsPath,
        absolutePath: this.relativeOrAbsolutePathToAbsolutePath(fsPath),
        isFile: false,
        isDirectory: true,
        isSymbolicLink: false,
        size: 0,
      };
    }

    return { exists: false, path: fsPath };
  }

  async copy(sourceFsPath: string, destinationFsPath: string, options: { overwrite?: boolean } = {}): Promise<boolean> {
    const sourceKey = this._s3Key(sourceFsPath);
    const destinationKey = this._s3Key(destinationFsPath);
    if (!sourceKey) throw new Error("Source path results in an empty S3 key.");
    if (!destinationKey) throw new Error("Destination path results in an empty S3 key.");
    if (!options.overwrite && (await this.exists(destinationFsPath))) {
      throw new Error(`Destination already exists: ${destinationFsPath}`);
    }
    const data = await this.client.file(sourceKey).arrayBuffer();
    await this.client.write(destinationKey, data);
    return true;
  }

  async* getDirectoryTree(fsPath: string, params?: DirectoryTreeOptions): AsyncGenerator<string> {
    const { ignoreFilter, recursive = true } = params || {};
    const s3Prefix = this._s3Key(fsPath);
    const prefix = s3Prefix === "" ? "" : s3Prefix.endsWith("/") ? s3Prefix : `${s3Prefix}/`;
    let startAfter: string | undefined;

    do {
      const response = await this.client.list({
        prefix,
        ...(startAfter && { startAfter })
      });
      const contents = response.contents ?? [];

      for (const item of contents) {
        if (!item.key) continue;
        if (item.key === prefix && item.key.endsWith("/")) continue;
        const relativePath = item.key.startsWith(prefix) ? item.key.slice(prefix.length) : item.key;
        if (!recursive && relativePath.includes("/")) continue;
        if (!ignoreFilter?.(item.key)) yield item.key;
      }

      if (!response.isTruncated) break;
      startAfter = contents.at(-1)?.key;
    } while (startAfter);
  }

  async createDirectory(fsPath: string, _options: { recursive?: boolean } = {}): Promise<boolean> {
    const existing = await this.stat(fsPath);
    if (existing.exists) {
      if (existing.isDirectory) return true;
      throw new Error(`Path already exists and is not a directory: ${fsPath}`);
    }
    return true;
  }

  async rename(oldPath: string, newPath: string): Promise<boolean> {
    await this.copy(oldPath, newPath, { overwrite: true });
    await this.deleteFile(oldPath);
    return true;
  }

  private _s3Key(fsPath: string): string {
    const normalizedPath = fsPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const parts = normalizedPath.split("/");
    const result: string[] = [];
    for (const part of parts) {
      if (part === "..") {
        if (result.length === 0) throw new Error(`Invalid path: ${fsPath} attempts to traverse above bucket root.`);
        result.pop();
      } else if (part !== "." && part !== "") {
        result.push(part);
      }
    }
    return result.join("/");
  }
}
