import {S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand} from "@aws-sdk/client-s3";
import CDNService, {type UploadOptions, type UploadResult, type DeleteResult} from "@token-ring/cdn/CDNService";
import type {Registry} from "@token-ring/registry";

export interface S3CDNConfig {
  bucket: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  baseUrl?: string;
}

export default class S3CDNService extends CDNService {
  name = "S3CDN";
  description = "AWS S3 CDN implementation";
  
  private s3Client!: S3Client;
  private config!: S3CDNConfig;

  constructor(config: S3CDNConfig) {
    super();
    this.config = config;
  }

  async start(registry: Registry): Promise<void> {
    await super.start(registry);
    
    this.s3Client = new S3Client({
      region: this.config.region || "us-east-1",
      credentials: this.config.accessKeyId && this.config.secretAccessKey ? {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      } : undefined,
    });
  }

  async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const key = options?.filename || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: data,
      ContentType: options?.contentType,
      Metadata: options?.metadata,
    });

    await this.s3Client.send(command);

    const url = this.config.baseUrl 
      ? `${this.config.baseUrl}/${key}`
      : `https://${this.config.bucket}.s3.amazonaws.com/${key}`;

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
        Bucket: this.config.bucket,
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
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(url: string): Promise<Record<string, any> | null> {
    try {
      const key = this.extractKeyFromUrl(url);
      
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response.Metadata || null;
    } catch {
      return null;
    }
  }

  private extractKeyFromUrl(url: string): string {
    if (this.config.baseUrl && url.startsWith(this.config.baseUrl)) {
      return url.substring(this.config.baseUrl.length + 1);
    }
    
    // Extract from standard S3 URL
    const match = url.match(/amazonaws\.com\/(.+)$/);
    return match ? match[1] : url;
  }
}