import {TokenRingPlugin} from "@tokenring-ai/app";
import {CDNConfigSchema, CDNService} from "@tokenring-ai/cdn";
import {FileSystemConfigSchema} from "@tokenring-ai/filesystem";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import {z} from "zod";
import packageJSON from './package.json' with {type: 'json'};
import S3CDNProvider, {S3CDNProviderOptionsSchema} from "./S3CDNProvider.js";
import S3FileSystemProvider, {S3FileSystemProviderOptionsSchema} from "./S3FileSystemProvider.js";

const packageConfigSchema = z.object({
  cdn: CDNConfigSchema.optional(),
  filesystem: FileSystemConfigSchema.optional()
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.cdn) {
      app.waitForService(CDNService, cdnService => {
        for (const name in config.cdn!.providers) {
          const provider = config.cdn!.providers[name];
          if (provider.type === "s3") {
            cdnService.registerProvider(name, new S3CDNProvider(S3CDNProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }

    if (config.filesystem) {
      app.waitForService(FileSystemService, fileSystemService => {
        for (const name in config.filesystem!.providers) {
          const provider = config.filesystem!.providers[name];
          if (provider.type === "s3") {
            fileSystemService.registerFileSystemProvider(name, new S3FileSystemProvider(S3FileSystemProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
