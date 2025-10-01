import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ClientConfigType,
} from "@aws-sdk/client-s3";

import FileSystemProvider, {
  DirectoryTreeOptions,
  ExecuteCommandOptions,
  ExecuteCommandResult,
  GlobOptions,
  GrepOptions,
  GrepResult,
  StatLike,
  WatchOptions
} from "@tokenring-ai/filesystem/FileSystemProvider";

export interface S3FileSystemProviderOptions {
  bucketName: string;
  clientConfig?: S3ClientConfigType;
}

export default class S3FileSystemProvider implements FileSystemProvider {
  private readonly bucketName: string;
  private s3Client!: S3Client;

  constructor({bucketName, clientConfig}: S3FileSystemProviderOptions) {
    if (!bucketName) {
      throw new Error("S3FileSystem requires a 'bucketName'.");
    }
    this.bucketName = bucketName;

    this.s3Client = new S3Client(clientConfig || {});
  }

  getBaseDirectory(): string {
    return `s3://${this.bucketName}/`;
  }

  relativeOrAbsolutePathToAbsolutePath(p: string): string {
    if (p.startsWith('s3://')) {
      return p;
    }
    const s3Key = this._s3Key(p);
    return `s3://${this.bucketName}/${s3Key}`;
  }

  relativeOrAbsolutePathToRelativePath(p: string): string {
    if (p.startsWith(`s3://${this.bucketName}/`)) {
      return p.replace(`s3://${this.bucketName}/`, '');
    }
    return this._s3Key(p);
  }

  async writeFile(fsPath: string, content: string | Buffer): Promise<boolean> {
    const s3Key = this._s3Key(fsPath);
    if (!s3Key) throw new Error("Path results in an empty S3 key.");

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: content,
    });
    await this.s3Client.send(command);
    return true;
  }

  async appendFile(filePath: string, content: string | Buffer): Promise<boolean> {
    try {
      const existingContent = await this.readFile(filePath, "utf8");
      const newContent = existingContent + content;
      return await this.writeFile(filePath, newContent);
    } catch (error) {
      // If file doesn't exist, create it with the new content
      return await this.writeFile(filePath, content);
    }
  }

  async readFile(fsPath: string, encoding?: BufferEncoding | "buffer"): Promise<any> {
    const s3Key = this._s3Key(fsPath);
    if (!s3Key) throw new Error("Path results in an empty S3 key.");

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    const response: any = await this.s3Client.send(command);

    if (encoding === "buffer") {
      return Buffer.from(await response.Body.transformToByteArray());
    }

    return response.Body.transformToString(encoding);
  }

  async deleteFile(fsPath: string): Promise<boolean> {
    const s3Key = this._s3Key(fsPath);
    if (!s3Key) throw new Error("Path results in an empty S3 key for deletion.");

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    await this.s3Client.send(command);
    return true;
  }

  async exists(fsPath: string): Promise<boolean> {
    const s3Key = this._s3Key(fsPath);

    if (!s3Key) {
      return false;
    }

    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });
    try {
      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async stat(fsPath: string): Promise<StatLike> {
    const originalS3Key = this._s3Key(fsPath);
    const s3Key = originalS3Key || "";

    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      if (!s3Key) {
        throw {name: "NoSuchKey", $metadata: {httpStatusCode: 404}} as any;
      }
      const response: any = await this.s3Client.send(command);
      return {
        path: fsPath,
        absolutePath: this.relativeOrAbsolutePathToAbsolutePath(fsPath),
        isFile: true,
        isDirectory: false,
        isSymbolicLink: false,
        size: response.ContentLength,
        modified: response.LastModified,
        created: response.LastModified, // S3 doesn't track creation time separately
        accessed: response.LastModified, // S3 doesn't track access time
      };
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        const prefixToCheck = originalS3Key ? originalS3Key + "/" : "";
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefixToCheck,
          MaxKeys: 1,
        });
        const listResponse: any = await this.s3Client.send(listCommand);
        if (
          (listResponse.KeyCount && listResponse.KeyCount > 0) ||
          (listResponse.CommonPrefixes && listResponse.CommonPrefixes.length > 0) ||
          originalS3Key === ""
        ) {
          return {
            path: fsPath,
            absolutePath: this.relativeOrAbsolutePathToAbsolutePath(fsPath),
            isFile: false,
            isDirectory: true,
            isSymbolicLink: false,
            size: 0,
            modified: undefined,
            created: undefined,
            accessed: undefined,
          };
        }
        throw new Error(`Path not found: ${fsPath}`);
      }
      throw error;
    }
  }

  async copy(sourceFsPath: string, destinationFsPath: string, options: { overwrite?: boolean } = {}): Promise<boolean> {
    const sourceKey = this._s3Key(sourceFsPath);
    const destinationKey = this._s3Key(destinationFsPath);

    if (!sourceKey) throw new Error("Source path results in an empty S3 key.");
    if (!destinationKey) throw new Error("Destination path results in an empty S3 key.");

    // Check if destination exists and overwrite is false
    if (!options.overwrite && await this.exists(destinationFsPath)) {
      throw new Error(`Destination already exists: ${destinationFsPath}`);
    }

    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
    });
    await this.s3Client.send(command);
    return true;
  }

  async* getDirectoryTree(fsPath: string, params?: DirectoryTreeOptions): AsyncGenerator<string> {
    const {ignoreFilter, recursive = true} = params || {};
    const s3Prefix = this._s3Key(fsPath);
    const normalizedPrefix = s3Prefix === "" ? "" : s3Prefix.endsWith("/") ? s3Prefix : s3Prefix + "/";
    let continuationToken: string | undefined = undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: normalizedPrefix,
        ContinuationToken: continuationToken,
      });
      const response: any = await this.s3Client.send(command);

      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key === normalizedPrefix && item.Key.endsWith("/")) {
            continue;
          }

          const relativePath = item.Key.startsWith(normalizedPrefix)
            ? item.Key.substring(normalizedPrefix.length)
            : item.Key;

          if (!recursive && relativePath.includes('/')) {
            continue;
          }

          if (!ignoreFilter || !ignoreFilter(item.Key)) {
            yield item.Key;
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
  }

  async createDirectory(fsPath: string, options: { recursive?: boolean } = {}): Promise<boolean> {

    let s3Key = this._s3Key(fsPath);
    if (s3Key === "") {
      return true;
    }
    if (!s3Key.endsWith("/")) {
      s3Key += "/";
    }

    try {
      const existingStat = await this.stat(s3Key);
      if (existingStat.isDirectory) {
        return true;
      }
    } catch (error: any) {
      if (!error.message?.startsWith("Path not found:")) {
        throw error;
      }
    }
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: "",
    });
    await this.s3Client.send(command);
    return true;
  }

  async chmod(_path: string, _mode: number): Promise<boolean> {
    throw new Error("Method chmod is not supported by S3FileSystem.");
  }

  async rename(oldPath: string, newPath: string): Promise<boolean> {
    await this.copy(oldPath, newPath, {overwrite: true});
    await this.deleteFile(oldPath);
    return true;
  }

  async watch(_dir: string, _options?: WatchOptions): Promise<any> {
    throw new Error("Method watch is not supported by S3FileSystem.");
  }

  async executeCommand(_command: string | string[], _options?: ExecuteCommandOptions): Promise<ExecuteCommandResult> {
    throw new Error("Method executeCommand is not supported by S3FileSystem.");
  }

  async glob(_pattern: string, _options?: GlobOptions): Promise<string[]> {
    throw new Error("Method glob is not fully supported by S3FileSystem. Only prefix-based listing is available via getDirectoryTree.");
  }

  async grep(_searchString: string | string[], _options?: GrepOptions): Promise<GrepResult[]> {
    throw new Error("Method grep is not supported by S3FileSystem. Consider using S3 Select for specific use cases or downloading files for local search.");
  }

  private _s3Key(fsPath: string): string {
    const normalizedPath = fsPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const parts = normalizedPath.split("/");
    const resultParts: string[] = [];
    for (const part of parts) {
      if (part === "..") {
        if (resultParts.length === 0) {
          throw new Error(`Invalid path: ${fsPath} attempts to traverse above bucket root.`);
        }
        resultParts.pop();
      } else if (part !== "." && part !== "") {
        resultParts.push(part);
      }
    }
    return resultParts.join("/");
  }
}