import type { TokenRingPlugin } from "@tokenring-ai/app";
import { CDNService } from "@tokenring-ai/cdn";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { z } from "zod";
import packageJSON from "./package.json" with { type: "json" };
import S3CDNProvider from "./S3CDNProvider.ts";
import S3FileSystemProvider from "./S3FileSystemProvider.ts";
import { type S3Account, S3ConfigSchema } from "./schema.ts";

const packageConfigSchema = z.object({
  s3: S3ConfigSchema.prefault({ accounts: {} }),
});

function addAccountsFromEnv(accounts: Record<string, Partial<S3Account>>) {
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(/^S3_BUCKET(\d*)$/) as [string, string] | undefined;
    if (!match || !value) continue;
    const n = match[1];
    const name = process.env[`S3_ACCOUNT_NAME${n}`] ?? `S3${n ? ` ${n}` : ""}`;
    const region = process.env[`S3_REGION${n}`];
    if (!region) throw new Error(`Missing ENV S3_REGION${n}`);
    const accessKeyId = process.env[`S3_ACCESS_KEY_ID${n}`];
    if (!accessKeyId) throw new Error(`Missing ENV S3_ACCESS_KEY_ID${n}`);
    const secretAccessKey = process.env[`S3_SECRET_ACCESS_KEY${n}`];
    if (!secretAccessKey) throw new Error(`Missing ENV S3_SECRET_ACCESS_KEY${n}`);

    accounts[name] = {
      bucket: value,
      region,
      accessKeyId,
      secretAccessKey,
      ...(process.env[`S3_CDN_BASE_URL${n}`] && {
        cdn: {
          publicUrl: process.env[`S3_CDN_PUBLIC_URL${n}`]!,
        },
      }),
      ...(process.env[`S3_FILESYSTEM${n}`] && {}),
    };
  }
}

export default {
  name: packageJSON.name,
  displayName: "AWS S3 Storage",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    addAccountsFromEnv(config.s3.accounts);
    if (Object.keys(config.s3.accounts).length === 0) return;

    for (const [name, account] of Object.entries(config.s3.accounts)) {
      const { cdn, filesystem } = account;
      if (cdn) {
        app.waitForService(CDNService, cdnService => {
          cdnService.registerProvider(
            name,
            new S3CDNProvider({
              bucket: account.bucket,
              region: account.region,
              accessKeyId: account.accessKeyId,
              secretAccessKey: account.secretAccessKey,
              endpoint: account.endpoint,
              publicUrl: cdn.publicUrl,
            }),
          );
        });
      }

      if (filesystem) {
        app.waitForService(FileSystemService, fileSystemService => {
          fileSystemService.registerFileSystemProvider(
            name,
            new S3FileSystemProvider({
              bucket: account.bucket,
              region: account.region,
              accessKeyId: account.accessKeyId,
              secretAccessKey: account.secretAccessKey,
              endpoint: account.endpoint,
            }),
          );
        });
      }
    }
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
