import { z } from "zod";

export const S3AccountCDNSchema = z.object({
  baseUrl: z.string().exactOptional(),
});

export const S3AccountFilesystemSchema = z.object({});

export const S3AccountSchema = z.object({
  bucket: z.string(),
  region: z.string().exactOptional(),
  accessKeyId: z.string().exactOptional(),
  secretAccessKey: z.string().exactOptional(),
  cdn: S3AccountCDNSchema.exactOptional(),
  filesystem: S3AccountFilesystemSchema.exactOptional(),
});

export const S3ConfigSchema = z.object({
  accounts: z.record(z.string(), S3AccountSchema).default({}),
});

export type S3Config = z.output<typeof S3ConfigSchema>;
export type S3Account = z.output<typeof S3AccountSchema>;
export type S3AccountCDN = z.output<typeof S3AccountCDNSchema>;
export type S3AccountFilesystem = z.output<typeof S3AccountFilesystemSchema>;
