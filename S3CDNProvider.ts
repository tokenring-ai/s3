import { S3Client } from "bun";
import { CDNProvider } from "@tokenring-ai/cdn";
import type { DeleteResult, UploadOptions, UploadResult } from "@tokenring-ai/cdn/types";
import { z } from "zod";

export const S3CDNProviderOptionsSchema = z.object({
  bucket: z.string(),
  region: z.string().exactOptional(),
  accessKeyId: z.string().exactOptional(),
  secretAccessKey: z.string().exactOptional(),
  baseUrl: z.string().exactOptional(),
});

export type S3CDNProviderOptions = z.infer<typeof S3CDNProviderOptionsSchema>;

export default class S3CDNProvider extends CDNProvider {
  private readonly client: S3Client;
  private readonly baseUrl: string;
  private readonly bucket: string;

  constructor({ bucket, region, baseUrl, secretAccessKey, accessKeyId }: S3CDNProviderOptions) {
    super();
    if (!bucket) throw new Error("S3CDNProvider requires a bucket parameter");
    if (!accessKeyId) throw new Error("S3CDNProvider requires accessKeyId");
    if (!secretAccessKey) throw new Error("S3CDNProvider requires secretAccessKey");
    if (!region) throw new Error("S3CDNProvider requires region");
    this.bucket = bucket;
    this.baseUrl = baseUrl || `https://${bucket}.s3.amazonaws.com`;
    this.client = new S3Client({ bucket, region, accessKeyId, secretAccessKey });
  }

  async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const key = options?.filename || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await this.client.write(key, data, { type: options?.contentType });
    return { url: `${this.baseUrl}/${key}`, id: key, metadata: options?.metadata };
  }

  async delete(url: string): Promise<DeleteResult> {
    try {
      await this.client.delete(this.extractKeyFromUrl(url));
      return { success: true, message: `Successfully deleted ${url}` };
    } catch (error: unknown) {
      return { success: false, message: `Failed to delete: ${Error.isError(error) ? error.message : String(error)}` };
    }
  }

  async exists(url: string): Promise<boolean> {
    return this.client.exists(this.extractKeyFromUrl(url));
  }

  private extractKeyFromUrl(url: string): string {
    if (url.startsWith(this.baseUrl)) return url.slice(this.baseUrl.length + 1);
    const match = url.match(/amazonaws\.com\/(.+)$/);
    return match ? match[1] : url;
  }
}
