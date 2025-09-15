# S3 Package Documentation

## Overview

The `@tokenring-ai/s3` package provides AWS S3 integrations for the Token Ring AI ecosystem. It implements two main abstractions:

- **FileSystemProvider**: Allows treating S3 buckets as a filesystem, enabling operations like reading, writing, deleting, and listing files/directories.
- **CDNResource**: Provides a CDN-like interface for uploading, deleting, and checking existence of resources in S3, suitable for content delivery.

This package is designed for seamless integration with Token Ring's agent, filesystem, and CDN modules, handling S3-specific details like key normalization, error handling for non-existent objects, and basic directory simulation (S3 uses prefixes for directories).

## Installation/Setup

Install the package via npm:

```bash
npm install @tokenring-ai/s3
```

Ensure peer dependencies are installed:

```bash
npm install @tokenring-ai/cdn @tokenring-ai/filesystem
```

The package requires AWS credentials (e.g., via environment variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`) or explicit configuration in the client options. No additional build steps are needed as it's a TypeScript module.

## Package Structure

- `package.json`: Defines metadata, dependencies, and exports.
- `index.ts`: Main entry point exporting the package info, classes, and types.
- `S3FileSystemProvider.ts`: Implementation of the S3 filesystem provider.
- `S3CDNResource.ts`: Implementation of the S3 CDN resource handler.
- `README.md`: This documentation file.
- `LICENSE`: MIT license.

## Core Components

### S3FileSystemProvider

This class extends `@tokenring-ai/filesystem/FileSystemProvider` to provide S3-backed file operations. It simulates directories using S3 prefixes and handles paths relative to the bucket root.

#### Description
- Initializes with a required `bucketName` and optional AWS `clientConfig`.
- Paths can be relative (e.g., `file.txt`) or absolute (e.g., `s3://bucket/file.txt`).
- Supports core FS operations but throws errors for unsupported features like `chmod`, `watch`, `executeCommand`, `glob`, and `grep`.

#### Key Methods

- **Constructor**: `new S3FileSystemProvider(options: S3FileSystemProviderOptions)`
  - `options.bucketName`: string (required)
  - `options.clientConfig?`: S3ClientConfigType (optional AWS config)

- **writeFile(fsPath: string, content: string | Buffer): Promise<boolean>**
  - Writes content to the specified path in the bucket.
  - Returns `true` on success.

- **readFile(fsPath: string, encoding?: BufferEncoding | "buffer"): Promise<any>**
  - Reads file content. Use `"utf8"` for string or `"buffer"` for Buffer.
  - Throws if file not found.

- **deleteFile(fsPath: string): Promise<boolean>**
  - Deletes the object at the path.
  - Returns `true` on success.

- **exists(fsPath: string): Promise<boolean>**
  - Checks if the path (file or directory prefix) exists.

- **stat(fsPath: string): Promise<StatLike>**
  - Returns file/directory stats. For directories, checks if prefix has contents.

- **getDirectoryTree(fsPath: string, params?: DirectoryTreeOptions): AsyncGenerator<string>**
  - Yields paths under the directory, with optional `ignoreFilter` and `recursive`.

- **createDirectory(fsPath: string, options?: { recursive?: boolean }): Promise<boolean>**
  - Creates a directory prefix (uploads empty object with trailing `/`).

- **copy(sourceFsPath: string, destinationFsPath: string, options?: { overwrite?: boolean }): Promise<boolean>**
  - Copies object within the bucket.

- **rename(oldPath: string, newPath: string): Promise<boolean>**
  - Copies then deletes (move simulation).

#### Interactions
Methods use an internal S3Client for all operations. Path normalization prevents traversal above root and handles Windows paths.

### S3CDNResource

This class extends `@tokenring-ai/cdn/CDNResource` for S3-based content delivery.

#### Description
- Requires explicit credentials and bucket details.
- Generates URLs based on `baseUrl` (defaults to `https://{bucket}.s3.amazonaws.com`).
- Handles uploads with metadata and content types.

#### Key Methods

- **Constructor**: `new S3CDNResource(options: S3CDNResourceOptions)`
  - `options.bucket`: string (required)
  - `options.region`: string (required)
  - `options.accessKeyId`: string (required)
  - `options.secretAccessKey`: string (required)
  - `options.baseUrl?`: string (optional)

- **upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>**
  - Uploads buffer to a generated key (or specified `filename`).
  - Supports `contentType` and `metadata`.
  - Returns `{ url, id, metadata }`.

- **delete(url: string): Promise<DeleteResult>**
  - Deletes the object from the extracted key.
  - Returns `{ success: boolean, message: string }`.

- **exists(url: string): Promise<boolean>**
  - Checks if the object exists via HEAD request.

#### Interactions
Uses S3Client for uploads/deletes. Key extraction from URLs assumes standard S3 format.

## Usage Examples

### Using S3FileSystemProvider

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3';

const provider = new S3FileSystemProvider({
  bucketName: 'my-bucket',
  // clientConfig: { region: 'us-east-1' } // Optional
});

// Write a file
await provider.writeFile('hello.txt', 'Hello, S3!');

// Read it back
const content = await provider.readFile('hello.txt', 'utf8');
console.log(content); // "Hello, S3!"

// List directory
for await (const path of provider.getDirectoryTree('.')) {
  console.log(path);
}

// Create directory
await provider.createDirectory('docs');
```

### Using S3CDNResource

```typescript
import { S3CDNResource } from '@tokenring-ai/s3';

const cdn = new S3CDNResource({
  bucket: 'my-cdn-bucket',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  baseUrl: 'https://my-cdn.example.com' // Optional custom
});

// Upload
const buffer = Buffer.from('Image data...');
const result = await cdn.upload(buffer, {
  filename: 'image.png',
  contentType: 'image/png',
  metadata: { author: 'User' }
});
console.log(result.url); // Access the uploaded resource

// Delete
await cdn.delete(result.url);

// Check existence
const exists = await cdn.exists(result.url);
```

## Configuration Options

- **S3FileSystemProviderOptions**:
  - `bucketName`: Required S3 bucket.
  - `clientConfig`: AWS SDK config (e.g., region, credentials).

- **S3CDNResourceOptions**:
  - `bucket`: Required S3 bucket.
  - `region`: Required AWS region.
  - `accessKeyId` / `secretAccessKey`: Required credentials.
  - `baseUrl`: Optional custom URL base.

Environment variables for AWS credentials are recommended for security.

## API Reference

- **Exports**:
  - `S3FileSystemProvider`: Class for FS operations.
  - `S3CDNResource`: Class for CDN operations.
  - `S3FileSystemProviderOptions`: Type for FS provider config.
  - `S3CDNResourceOptions`: Type for CDN config.
  - `packageInfo`: TokenRingPackage metadata.

- **Methods**: See Core Components for signatures.

## Dependencies

- **Dependencies**:
  - `@tokenring-ai/agent@0.1.0`
  - `@aws-sdk/client-s3@^3.0.0`

- **Peer Dependencies**:
  - `@tokenring-ai/cdn@0.1.0`
  - `@tokenring-ai/filesystem@0.1.0`

## Contributing/Notes

- **Testing**: Unit tests not included; test with AWS credentials in a dev bucket.
- **Building**: TypeScript compiles to ESM; no build step needed for runtime.
- **Limitations**: No real-time watching or shell execution (S3 is object storage). Directories are simulated. Use AWS IAM for least-privilege access. Binary files supported via Buffer.

For contributions, follow Token Ring guidelines. Report issues for S3-specific edge cases.