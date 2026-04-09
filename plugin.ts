import {TokenRingPlugin} from "@tokenring-ai/app";
import {CDNService} from "@tokenring-ai/cdn";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import {z} from "zod";
import packageJSON from "./package.json" with {type: "json"};
import S3CDNProvider from "./S3CDNProvider.ts";
import S3FileSystemProvider from "./S3FileSystemProvider.ts";
import {type S3Account, S3ConfigSchema} from "./schema.ts";

const packageConfigSchema = z.object({
  s3: S3ConfigSchema.prefault({accounts: {}}),
});

function addAccountsFromEnv(accounts: Record<string, Partial<S3Account>>) {
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(/^S3_BUCKET(\d*)$/);
    if (!match || !value) continue;
    const n = match[1];
    const name = process.env[`S3_ACCOUNT_NAME${n}`] ?? `S3${n ? ` ${n}` : ""}`;
    accounts[name] = {
      bucket: value,
      region: process.env[`S3_REGION${n}`],
      accessKeyId: process.env[`S3_ACCESS_KEY_ID${n}`],
      secretAccessKey: process.env[`S3_SECRET_ACCESS_KEY${n}`],
      cdn: process.env[`S3_CDN${n}`] ? {baseUrl: process.env[`S3_CDN_BASE_URL${n}`]} : undefined,
      filesystem: process.env[`S3_FILESYSTEM${n}`] ? {} : undefined,
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
      if (account.cdn) {
        app.waitForService(CDNService, cdnService => {
          cdnService.registerProvider(name, new S3CDNProvider({
            bucket: account.bucket,
            region: account.region,
            accessKeyId: account.accessKeyId,
            secretAccessKey: account.secretAccessKey,
            baseUrl: account.cdn!.baseUrl,
          }));
        });
      }

      if (account.filesystem) {
        app.waitForService(FileSystemService, fileSystemService => {
          fileSystemService.registerFileSystemProvider(name, new S3FileSystemProvider({
            bucketName: account.bucket,
            clientConfig: account.filesystem!.clientConfig ?? {
              region: account.region,
              ...(account.accessKeyId && account.secretAccessKey ? {
                credentials: {accessKeyId: account.accessKeyId, secretAccessKey: account.secretAccessKey},
              } : {}),
            },
          }));
        });
      }
    }
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
