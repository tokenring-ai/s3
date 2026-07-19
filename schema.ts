import { z } from "zod";

export const S3AccountCDNSchema = z.object({
  publicUrl: z.string(),
});

export const S3AccountFilesystemSchema = z.object({});

export const S3AccountSchema = z.object({
  bucket: z.string().meta({ description: "S3 bucket name" }),
  region: z.string().meta({ description: "AWS region the bucket lives in" }),
  accessKeyId: z.string().meta({ description: "AWS access key ID" }),
  secretAccessKey: z.string().meta({ sensitive: true, description: "AWS secret access key" }),
  endpoint: z.string().meta({ description: "S3-compatible endpoint URL" }),
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
