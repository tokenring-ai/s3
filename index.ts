import {TokenRingPackage} from "@tokenring-ai/agent";
import packageJSON from './package.json' with {type: 'json'};

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description
};

export {default as S3CDNResource} from "./S3CDNResource.ts";
export {default as S3FileSystemProvider} from "./S3FileSystemProvider.ts";
export type {S3CDNResourceOptions} from "./S3CDNResource.ts";