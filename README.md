# @tokenring-ai/s3

AWS S3 integration package for the Token Ring AI ecosystem, providing both filesystem and CDN functionality through a unified interface. This package integrates seamlessly with Token Ring's filesystem and CDN modules, handling S3-specific details like path normalization, error handling, and directory simulation using S3 prefixes.

## Overview

The `@tokenring-ai/s3` package provides comprehensive AWS S3 integration for cloud storage and content delivery in the Token Ring AI system. It implements both CDN (Content Delivery Network) and File System providers for seamless cloud storage and content delivery.

### Key Features

- **Filesystem Provider**: Treats S3 buckets as a virtual filesystem with read, write, delete, and directory operations
- **CDN Provider**: Upload, manage, and serve content from S3 buckets with CDN capabilities
- **Type-Safe APIs**: Strongly-typed interfaces with Zod validation
- **Automatic Configuration**: Integrates with Token Ring's configuration system
- **Path Conversion**: Built-in methods for converting between relative/absolute S3 paths and bucket-relative keys
- **Error Handling**: Comprehensive validation and error management
- **Multi-Provider Support**: Works with both standard and custom S3 implementations

## Installation

```bash
bun install @tokenring-ai/s3
```

## Package Structure

```
pkg/s3/
├── index.ts              # Main entry point and exports
├── plugin.ts             # Plugin integration logic
├── S3CDNProvider.ts      # CDN provider implementation
├── S3FileSystemProvider.ts # File system provider implementation
├── package.json         # Package configuration and dependencies
└── vitest.config.ts     # Testing configuration
```

## Core Components

### S3FileSystemProvider

A filesystem provider that maps S3 buckets to a virtual filesystem interface.

#### Constructor

```typescript
new S3FileSystemProvider(options: S3FileSystemProviderOptions)
```

**Options:**
- `bucketName`: Name of the S3 bucket (required)
- `clientConfig`: AWS SDK client configuration object (optional)

#### Path Conversion Methods

```typescript
// Convert a path to absolute S3 URI format
const absolutePath = provider.relativeOrAbsolutePathToAbsolutePath('path/to/file.txt')
// Returns: 's3://bucket-name/path/to/file.txt'

// Convert a path to bucket-relative format (without s3:// prefix)
const relativePath = provider.relativeOrAbsolutePathToRelativePath('s3://bucket-name/path/to/file.txt')
// Returns: 'path/to/file.txt'
```

#### Key Methods

##### File Operations

```typescript
// Write content to a file
await provider.writeFile('path/to/file.txt', 'content or buffer')

// Read file content
const content = await provider.readFile('path/to/file.txt', 'utf8')

// Append to a file
await provider.appendFile('path/to/file.txt', 'additional content')

// Delete a file
await provider.deleteFile('path/to/file.txt')
```

##### File Information

```typescript
// Check if file/directory exists
const exists = await provider.exists('path/to/file.txt')

// Get file/directory statistics
const stats = await provider.stat('path/to/file.txt')
// Returns: { path, absolutePath, isFile, isDirectory, isSymbolicLink, size, modified, created, accessed }
```

##### Directory Operations

```typescript
// Create a directory
await provider.createDirectory('path/to/directory')

// Get directory tree listing
for await (const path of provider.getDirectoryTree('path/to/directory')) {
  console.log(path)
}

// Copy files
await provider.copy('source.txt', 'destination.txt', { overwrite: true })

// Rename files (copy + delete)
await provider.rename('old-name.txt', 'new-name.txt')
```

#### Path Handling

- Supports both relative paths (`file.txt`) and absolute S3 paths (`s3://bucket/file.txt`)
- Automatically normalizes paths and prevents directory traversal above bucket root
- Simulates directories using S3 prefixes (objects ending with `/`)
- Handles both forward slashes and backslashes for cross-platform compatibility

#### Limitations

- `chmod()`, `watch()`, `executeCommand()`, `glob()`, and `grep()` are not supported
- S3 is object storage, not a true filesystem, so some filesystem features are limited

### S3CDNProvider

A CDN provider for uploading and managing content in S3 buckets.

#### Constructor

```typescript
new S3CDNProvider(options: S3CDNProviderOptions)
```

**Options:**
- `bucket`: S3 bucket name (required)
- `region`: AWS region (required)
- `accessKeyId`: AWS access key ID (required)
- `secretAccessKey`: AWS secret access key (required)
- `baseUrl`: Custom base URL for CDN (optional, defaults to `https://{bucket}.s3.amazonaws.com`)

#### Key Methods

```typescript
// Upload data with options
const result = await provider.upload(buffer, {
  filename: 'image.png',
  contentType: 'image/png',
  metadata: { author: 'User', category: 'images' }
})
// Returns: { url, id, metadata }

// Delete by URL
const deleteResult = await provider.delete('https://bucket.s3.amazonaws.com/file.txt')
// Returns: { success: boolean, message: string }

// Check if resource exists
const exists = await provider.exists('https://bucket.s3.amazonaws.com/file.txt')
```

## Plugin Configuration

This package provides a Token Ring plugin that automatically registers S3 providers with the CDN and filesystem services.

### Plugin Options Schema

```typescript
interface PackageConfig {
  cdn?: {
    providers: Record<string, {
      type: 's3'
      bucket: string
      region: string
      accessKeyId: string
      secretAccessKey: string
      baseUrl?: string
    }>
  }
  filesystem?: {
    providers: Record<string, {
      type: 's3'
      bucketName: string
      clientConfig?: Record<string, unknown>
    }>
  }
}
```

### Configuration Example

```typescript
import TokenRingApp from '@tokenring-ai/app'
import s3Plugin from '@tokenring-ai/s3'

const app = new TokenRingApp({
  config: {
    cdn: {
      providers: {
        mainCDN: {
          type: 's3',
          bucket: 'my-cdn-bucket',
          region: 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          baseUrl: 'https://cdn.example.com'
        }
      }
    },
    filesystem: {
      providers: {
        s3Storage: {
          type: 's3',
          bucketName: 'my-files-bucket',
          clientConfig: { region: 'us-east-1' }
        }
      }
    }
  }
})

app.registerPlugin(s3Plugin)
await app.start()
```

## API Reference

### S3FileSystemProvider

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `writeFile` | `(fsPath: string, content: string \| Buffer): Promise<boolean>` | Write content to a file |
| `appendFile` | `(filePath: string, content: string \| Buffer): Promise<boolean>` | Append content to an existing file or create if not exists |
| `readFile` | `(fsPath: string, encoding?: BufferEncoding \| "buffer"): Promise<any>` | Read file content with optional encoding |
| `deleteFile` | `(fsPath: string): Promise<boolean>` | Delete a file |
| `exists` | `(fsPath: string): Promise<boolean>` | Check if file or directory exists |
| `stat` | `(fsPath: string): Promise<StatLike>` | Get file/directory statistics |
| `copy` | `(sourceFsPath: string, destinationFsPath: string, options?: { overwrite?: boolean }): Promise<boolean>` | Copy a file |
| `rename` | `(oldPath: string, newPath: string): Promise<boolean>` | Rename a file |
| `createDirectory` | `(fsPath: string, options?: { recursive?: boolean }): Promise<boolean>` | Create a directory |
| `getDirectoryTree` | `(fsPath: string, params?: DirectoryTreeOptions): AsyncGenerator<string>` | Iterate directory contents |
| `relativeOrAbsolutePathToAbsolutePath` | `(p: string): string` | Convert path to absolute S3 URI |
| `relativeOrAbsolutePathToRelativePath` | `(p: string): string` | Convert path to bucket-relative format |

#### Not Supported

- `chmod()`, `watch()`, `executeCommand()`, `glob()`, `grep()`

### S3CDNProvider

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `upload` | `(data: Buffer, options?: UploadOptions): Promise<UploadResult>` | Upload data with optional metadata |
| `delete` | `(url: string): Promise<DeleteResult>` | Delete a resource by URL |
| `exists` | `(url: string): Promise<boolean>` | Check if resource exists |

## Usage Examples

### Basic Filesystem Usage

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3'

const provider = new S3FileSystemProvider({
  bucketName: 'my-bucket',
  clientConfig: { region: 'us-east-1' }
})

// Write a file
await provider.writeFile('hello.txt', 'Hello, S3!')

// Read it back
const content = await provider.readFile('hello.txt', 'utf8')
console.log(content) // "Hello, S3!"

// Check if file exists
const exists = await provider.exists('hello.txt')
console.log(exists) // true

// Get file statistics
const stats = await provider.stat('hello.txt')
console.log(`Size: ${stats.size} bytes`)
console.log(`Modified: ${stats.modified}`)

// List directory contents
console.log('Directory contents:')
for await (const path of provider.getDirectoryTree('.')) {
  console.log(path)
}

// Path conversion
const absolute = provider.relativeOrAbsolutePathToAbsolutePath('docs/readme.md')
console.log(absolute) // s3://my-bucket/docs/readme.md

// Create directory
await provider.createDirectory('docs')

// Copy file
await provider.copy('hello.txt', 'docs/hello-copy.txt')

// Rename file
await provider.rename('hello.txt', 'greeting.txt')
```

### CDN Usage

```typescript
import { S3CDNProvider } from '@tokenring-ai/s3'

const cdn = new S3CDNProvider({
  bucket: 'my-cdn-bucket',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  baseUrl: 'https://cdn.example.com'
})

// Upload an image
const imageBuffer = Buffer.from('image data...')
const uploadResult = await cdn.upload(imageBuffer, {
  filename: 'profile.png',
  contentType: 'image/png',
  metadata: {
    author: 'John Doe',
    tags: ['avatar', 'profile']
  }
})

console.log(`Uploaded to: ${uploadResult.url}`)
console.log(`File ID: ${uploadResult.id}`)

// Check if file exists
const exists = await cdn.exists(uploadResult.url)
console.log(`File exists: ${exists}`)

// Delete the file
const deleteResult = await cdn.delete(uploadResult.url)
console.log(`Delete success: ${deleteResult.success}`)
```

## Configuration

### S3FileSystemProviderOptions

```typescript
interface S3FileSystemProviderOptions {
  bucketName: string
  clientConfig?: Record<string, unknown>
}
```

### S3CDNProviderOptions

```typescript
interface S3CDNProviderOptions {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  baseUrl?: string
}
```

### Peer Dependencies

- `@tokenring-ai/cdn: 0.2.0`
- `@tokenring-ai/filesystem: 0.2.0`

## Security Considerations

- Use IAM roles with least-privilege access when possible
- Store credentials securely (environment variables or AWS Secrets Manager)
- Enable S3 bucket policies for proper access control
- Consider using signed URLs for temporary access when appropriate
- Enable S3 server-side encryption for sensitive data
- Never expose credentials in client-side code

## Limitations

- **Filesystem**: No real-time file watching, shell execution, or advanced filesystem features
- **CDN**: No automatic URL signing or CDN-specific caching controls
- **Performance**: S3 operations have network latency; consider batch operations for large files
- **Directories**: S3 directories are simulated using prefixes; true directory operations are limited
- **Consistency**: S3 offers eventual consistency for some operations

## License

MIT License - see [LICENSE](./LICENSE) file for details.
