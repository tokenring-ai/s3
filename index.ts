import packageJSON from './package.json' with {type: 'json'};

export const name = packageJSON.name;
export const version = packageJSON.version;
export const description = packageJSON.description;

export {default as S3CDNResource} from "./S3CDNResource.ts";
export {default as S3FileSystemProvider} from "./S3FileSystemProvider.ts";
export type {S3CDNResourceOptions} from "./S3CDNResource.ts";