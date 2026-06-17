import { CDNProvider } from "@tokenring-ai/cdn";
import type { DeleteResult, UploadOptions, UploadResult } from "@tokenring-ai/cdn/types";
import { S3Client } from "bun";
import { z } from "zod";

export const S3CDNProviderOptionsSchema = z.object({
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  publicUrl: z.string(),
  endpoint: z.string(),
  bucket: z.string(),
});

export type S3CDNProviderOptions = z.input<typeof S3CDNProviderOptionsSchema>;
export type ParsedS3CDNProviderOptions = z.output<typeof S3CDNProviderOptionsSchema>;

export default class S3CDNProvider extends CDNProvider {
  private readonly client: S3Client;

  constructor(readonly opts: ParsedS3CDNProviderOptions) {
    super();
    this.client = new S3Client({
      bucket: opts.bucket,
      endpoint: opts.endpoint,
      region: opts.region,
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    });
  }

  async upload(data: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const key = options?.filename || `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await this.client.write(key, data, {
      ...(options?.contentType && { type: options.contentType })
    });
    return { url: `${this.opts.publicUrl}/${key}`, id: key, metadata: options?.metadata };
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
    if (url.startsWith(this.opts.publicUrl)) return url.slice(this.opts.publicUrl.length + 1);
    const match = url.match(/amazonaws\.com\/(.+)$/);
    return match ? match[1] : url;
  }
}
