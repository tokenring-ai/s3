import {DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {CDNProvider} from "@tokenring-ai/cdn";
import {type DeleteResult, type UploadOptions, type UploadResult} from "@tokenring-ai/cdn/CDNService";

export interface S3CDNProviderOptions {
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  baseUrl?: string;
}

export default class S3CDNProvider extends CDNProvider {
  private s3Client!: S3Client;
  private readonly baseUrl!: string;
  private readonly bucket!: string;

  constructor({bucket, region, baseUrl, secretAccessKey, accessKeyId}: S3CDNProviderOptions) {
    super();
    if (!bucket) {
      throw new Error("S3CDNProvider requires a bucket parameter");
    }
    if (!accessKeyId) {
      throw new Error("S3CDNProvider requires accessKeyId");
    }
    if (!secretAccessKey) {
      throw new Error("S3CDNProvider requires secretAccessKey");
    }
    if (!region) {
      throw new Error("S3CDNProvider requires region");
    }
    if (!baseUrl) {
      baseUrl = `https://${bucket}.s3.amazonaws.com`;
    }

    this.bucket = bucket;
    this.baseUrl = baseUrl;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const key = options?.filename || `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
    });

    await this.s3Client.send(command);

    const url = `${this.baseUrl}/${key}`;

    return {
      url,
      id: key,
      metadata: options?.metadata,
    };
  }

  async delete(url: string): Promise<DeleteResult> {
    try {
      const key = this.extractKeyFromUrl(url);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      return {
        success: true,
        message: `Successfully deleted ${key}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async exists(url: string): Promise<boolean> {
    try {
      const key = this.extractKeyFromUrl(url);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  private extractKeyFromUrl(url: string): string {
    if (url.startsWith(this.baseUrl)) {
      return url.substring(this.baseUrl.length + 1);
    }

    // Extract from standard S3 URL
    const match = url.match(/amazonaws\.com\/(.+)$/);
    return match ? match[1] : url;
  }
}