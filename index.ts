import {TokenRingPackage} from "@tokenring-ai/agent";
import packageJSON from './package.json' with {type: 'json'};

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description
};

export {default as S3CDNProvider} from "./S3CDNProvider.ts";
export {default as S3FileSystemProvider} from "./S3FileSystemProvider.ts";
export type {S3CDNProviderOptions} from "./S3CDNProvider.ts";