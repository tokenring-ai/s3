import {AgentTeam, TokenRingPackage} from "@tokenring-ai/agent";
import {CDNConfigSchema, CDNService} from "@tokenring-ai/cdn";
import {FileSystemConfigSchema} from "@tokenring-ai/filesystem";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import packageJSON from './package.json' with {type: 'json'};
import S3CDNProvider, {S3CDNProviderOptionsSchema} from "./S3CDNProvider.js";
import S3FileSystemProvider, {S3FileSystemProviderOptionsSchema} from "./S3FileSystemProvider.js";

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(agentTeam: AgentTeam) {
    const cdnConfig = agentTeam.getConfigSlice("cdn", CDNConfigSchema);

    if (cdnConfig) {
      agentTeam.services.waitForItemByType(CDNService).then(cdnService => {
        for (const name in cdnConfig.providers) {
          const provider = cdnConfig.providers[name];
          if (provider.type === "s3") {
            cdnService.registerProvider(name, new S3CDNProvider(S3CDNProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }

    const filesystemConfig = agentTeam.getConfigSlice("filesystem", FileSystemConfigSchema);

    if (filesystemConfig) {
      agentTeam.services.waitForItemByType(FileSystemService).then(fileSystemService => {
        for (const name in filesystemConfig.providers) {
          const provider = filesystemConfig.providers[name];
          if (provider.type === "s3") {
            fileSystemService.registerFileSystemProvider(name, new S3FileSystemProvider(S3FileSystemProviderOptionsSchema.parse(provider)));
          }
        }
      });
    }
  },
} as TokenRingPackage;

export {default as S3CDNProvider} from "./S3CDNProvider.ts";
export {default as S3FileSystemProvider} from "./S3FileSystemProvider.ts";
export type {S3CDNProviderOptions} from "./S3CDNProvider.ts";