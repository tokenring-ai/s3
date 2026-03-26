# @tokenring-ai/s3

AWS S3 integration package for the Token Ring AI ecosystem, providing both filesystem and CDN functionality through a unified interface. This package integrates seamlessly with Token Ring's filesystem and CDN modules, handling S3-specific details like path normalization, error handling, and directory simulation using S3 prefixes.

## Overview

The `@tokenring-ai/s3` package provides comprehensive AWS S3 integration for cloud storage and content delivery in the Token Ring AI system. It implements both CDN (Content Delivery Network) and File System providers for seamless cloud storage and content delivery.

### Key Features

- **Filesystem Provider**: Treats S3 buckets as a virtual filesystem with read, write, delete, and directory operations
- **CDN Provider**: Upload, manage, and serve content from S3 buckets with CDN capabilities
- **Type-Safe APIs**: Strongly-typed interfaces with Zod validation
- **Automatic Configuration**: Integrates with Token Ring's configuration system via plugin
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
├── index.ts                    # Main entry point and exports
├── plugin.ts                   # Plugin integration logic
├── S3CDNProvider.ts            # CDN provider implementation
├── S3FileSystemProvider.ts     # File system provider implementation
├── package.json                # Package configuration and dependencies
└── vitest.config.ts            # Testing configuration
```

## Core Components

### S3FileSystemProvider

A filesystem provider that maps S3 buckets to a virtual filesystem interface. Implements the `FileSystemProvider` interface from `@tokenring-ai/filesystem`.

#### Type Exports

```typescript
// Type definitions
type S3FileSystemProviderOptions = {
  bucketName: string;
  clientConfig?: Record<string, unknown>;
};

// Zod schema for validation
const S3FileSystemProviderOptionsSchema: z.ZodType<S3FileSystemProviderOptions>;
```

#### Constructor

```typescript
new S3FileSystemProvider(options: S3FileSystemProviderOptions)
```

**Options:**
- `bucketName`: Name of the S3 bucket (required)
- `clientConfig`: AWS SDK client configuration object (optional, defaults to `{}`)

**Throws:**
- `Error` if `bucketName` is not provided

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
// Returns: true

// Read file content
const content = await provider.readFile('path/to/file.txt', 'utf8')
// Returns: string or Buffer (if encoding is 'buffer')

// Append to a file (creates file if it doesn't exist)
await provider.appendFile('path/to/file.txt', 'additional content')
// Returns: true

// Delete a file
await provider.deleteFile('path/to/file.txt')
// Returns: true
```

##### File Information

```typescript
// Check if file/directory exists
const exists = await provider.exists('path/to/file.txt')
// Returns: boolean

// Get file/directory statistics
const stats = await provider.stat('path/to/file.txt')
// Returns: StatLike {
//   exists: boolean;
//   path: string;
//   absolutePath: string;
//   isFile: boolean;
//   isDirectory: boolean;
//   isSymbolicLink: boolean;
//   size: number;
//   modified: Date | undefined;
//   created: Date | undefined;
//   accessed: Date | undefined;
// }
```

##### Directory Operations

```typescript
// Create a directory (S3 uses prefixes, so this is virtual)
await provider.createDirectory('path/to/directory')
// Returns: true

// Get directory tree listing (async generator)
for await (const path of provider.getDirectoryTree('path/to/directory')) {
  console.log(path)
}
// Yields: string (full S3 key path)

// Copy files
await provider.copy('source.txt', 'destination.txt', { overwrite: true })
// Returns: true

// Rename files (implemented as copy + delete)
await provider.rename('old-name.txt', 'new-name.txt')
// Returns: true
```

##### Unsupported Methods

The following methods are not supported by S3 and will throw errors:

- `chmod()`: S3 does not support Unix-style file permissions
- `watch()`: S3 does not support file system watching
- `glob()`: S3 only supports prefix-based listing via `getDirectoryTree()`
- `grep()`: S3 does not support content search; use S3 Select or download files for local search

#### Path Handling

- Supports both relative paths (`file.txt`) and absolute S3 paths (`s3://bucket/file.txt`)
- Automatically normalizes paths and prevents directory traversal above bucket root
- Simulates directories using S3 prefixes (objects ending with `/`)
- Handles both forward slashes and backslashes for cross-platform compatibility
- Path traversal with `..` is validated to prevent escaping bucket root

#### Limitations

- S3 is object storage, not a true filesystem, so some filesystem features are limited
- No support for file permissions (`chmod`)
- No support for file system watching (`watch`)
- No support for glob patterns (use prefix-based listing instead)
- No support for content search (use S3 Select or download files)
- Directories are virtual (created as prefixes)

### S3CDNProvider

A CDN provider for uploading and managing content in S3 buckets. Extends the base `CDNProvider` class from `@tokenring-ai/cdn`.

#### Type Exports

```typescript
// Type definitions
type S3CDNProviderOptions = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  baseUrl?: string;
};

// Zod schema for validation
const S3CDNProviderOptionsSchema: z.ZodType<S3CDNProviderOptions>;
```

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

**Throws:**
- `Error` if `bucket` is not provided
- `Error` if `region` is not provided
- `Error` if `accessKeyId` is not provided
- `Error` if `secretAccessKey` is not provided

**Note:** While the Zod schema marks `region`, `accessKeyId`, `secretAccessKey`, and `baseUrl` as optional, the constructor validates that all required parameters are provided and throws errors if they are missing.

#### Key Methods

```typescript
// Upload data with options
const result = await provider.upload(buffer, {
  filename: 'image.png',
  contentType: 'image/png',
  metadata: { author: 'User', category: 'images' }
})
// Returns: UploadResult {
//   url: string;
//   id: string;
//   metadata?: Record<string, string>;
// }

// Delete by URL
const deleteResult = await provider.delete('https://bucket.s3.amazonaws.com/file.txt')
// Returns: DeleteResult {
//   success: boolean;
//   message: string;
// }

// Check if resource exists
const exists = await provider.exists('https://bucket.s3.amazonaws.com/file.txt')
// Returns: boolean
```

#### URL Handling

- Automatically extracts S3 keys from various URL formats
- Supports custom `baseUrl` for CDN domains
- Falls back to standard S3 URL format if no custom base is provided

## Services

### CDN Service

The package registers `S3CDNProvider` instances with `CDNService` from `@tokenring-ai/cdn`.

**Registration:**
- Automatically registers with CDNService when CDN configuration is provided via plugin
- Uses `CDNConfigSchema` for configuration validation
- Providers are registered with the name specified in the configuration

**Provider Interface:**
```typescript
interface CDNProvider {
  upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>;
  delete(url: string): Promise<DeleteResult>;
  exists(url: string): Promise<boolean>;
}
```

### File System Service

The package registers `S3FileSystemProvider` instances with `FileSystemService` from `@tokenring-ai/filesystem`.

**Registration:**
- Automatically registers with FileSystemService when filesystem configuration is provided via plugin
- Uses `FileSystemConfigSchema` for configuration validation
- Providers are registered with the name specified in the configuration

**Provider Interface:**
```typescript
interface FileSystemProvider {
  writeFile(fsPath: string, content: string | Buffer): Promise<boolean>;
  appendFile(filePath: string, content: string | Buffer): Promise<boolean>;
  readFile(fsPath: string, encoding?: BufferEncoding | "buffer"): Promise<any>;
  deleteFile(fsPath: string): Promise<boolean>;
  exists(fsPath: string): Promise<boolean>;
  stat(fsPath: string): Promise<StatLike>;
  createDirectory(fsPath: string, options?: { recursive?: boolean }): Promise<boolean>;
  getDirectoryTree(fsPath: string, params?: DirectoryTreeOptions): AsyncGenerator<string>;
  copy(sourceFsPath: string, destinationFsPath: string, options?: { overwrite?: boolean }): Promise<boolean>;
  rename(oldPath: string, newPath: string): Promise<boolean>;
  relativeOrAbsolutePathToAbsolutePath(p: string): string;
  relativeOrAbsolutePathToRelativePath(p: string): string;
}
```

## Plugin Documentation

This package provides a Token Ring plugin that automatically registers S3 providers with the CDN and filesystem services.

### Plugin Name

`@tokenring-ai/s3`

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

### Plugin Registration

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

**Note:** The plugin uses `waitForService` to ensure services are available before registering providers. Providers are only registered if their respective configuration sections (`cdn` or `filesystem`) are present.

## Provider Documentation

### S3CDNProvider

AWS S3 integration for CDN services, providing content delivery capabilities.

**Configuration Schema:** `S3CDNProviderOptionsSchema`
```typescript
const S3CDNProviderOptionsSchema = z.object({
  bucket: z.string(),
  region: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  baseUrl: z.string().optional(),
});
```

**Note:** While the schema marks `region`, `accessKeyId`, `secretAccessKey`, and `baseUrl` as optional, the constructor validates that `bucket`, `region`, `accessKeyId`, and `secretAccessKey` are provided and throws errors if they are missing.

**Provider Interface:**
```typescript
interface S3CDNProviderOptions {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  baseUrl?: string;
}
```

**Key Methods:**
- `upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>` - Upload data to S3
  - `options.filename`: Optional filename (defaults to timestamp-random string)
  - `options.contentType`: Optional MIME type
  - `options.metadata`: Optional metadata object
- `delete(url: string): Promise<DeleteResult>` - Delete an object by URL
  - Returns `{ success: boolean, message: string }`
- `exists(url: string): Promise<boolean>` - Check if an object exists

### S3FileSystemProvider

S3-backed file system provider with complete file operations.

**Configuration Schema:** `S3FileSystemProviderOptionsSchema`
```typescript
const S3FileSystemProviderOptionsSchema = z.object({
  bucketName: z.string(),
  clientConfig: z.any().optional(),
});
```

**Provider Interface:**
```typescript
interface S3FileSystemProviderOptions {
  bucketName: string;
  clientConfig?: Record<string, unknown>;
}
```

**Key Methods:**
- `writeFile(fsPath: string, content: string | Buffer): Promise<boolean>` - Write file content
- `readFile(fsPath: string, encoding?: BufferEncoding | "buffer"): Promise<any>` - Read file content
- `deleteFile(fsPath: string): Promise<boolean>` - Delete a file
- `exists(fsPath: string): Promise<boolean>` - Check if file/directory exists
- `stat(fsPath: string): Promise<StatLike>` - Get file/directory statistics
- `createDirectory(fsPath: string, options?: { recursive?: boolean }): Promise<boolean>` - Create directory
- `getDirectoryTree(fsPath: string, params?: DirectoryTreeOptions): AsyncGenerator<string>` - List directory contents
- `copy(sourceFsPath: string, destinationFsPath: string, options?: { overwrite?: boolean }): Promise<boolean>` - Copy files
- `rename(oldPath: string, newPath: string): Promise<boolean>` - Rename files
- `appendFile(filePath: string, content: string | Buffer): Promise<boolean>` - Append to file
- `relativeOrAbsolutePathToAbsolutePath(p: string): string` - Convert path to absolute S3 URI
- `relativeOrAbsolutePathToRelativePath(p: string): string` - Convert path to relative format

## RPC Endpoints

This package does not define any RPC endpoints.

## Chat Commands

This package does not register any chat commands.

## State Management

This package does not manage state directly. It relies on the Token Ring state management system through services.

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

// Append to file
await provider.appendFile('hello.txt', '\nAppended content')
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
console.log(`Message: ${deleteResult.message}`)
```

### Plugin-Based Configuration

```typescript
import TokenRingApp from '@tokenring-ai/app'
import s3Plugin from '@tokenring-ai/s3'
import { CDNService } from '@tokenring-ai/cdn'
import FileSystemService from '@tokenring-ai/filesystem/FileSystemService'

const app = new TokenRingApp({
  config: {
    cdn: {
      providers: {
        s3CDN: {
          type: 's3',
          bucket: 'cdn-bucket',
          region: 'us-west-2',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
      }
    },
    filesystem: {
      providers: {
        s3Files: {
          type: 's3',
          bucketName: 'files-bucket',
          clientConfig: { region: 'us-west-2' }
        }
      }
    }
  }
})

// Register the plugin
app.registerPlugin(s3Plugin)

await app.start()

// Access the registered providers
const cdnService = await app.getService(CDNService)
const cdnProvider = cdnService.getProvider('s3CDN')

const fileSystemService = await app.getService(FileSystemService)
const fsProvider = fileSystemService.getFileSystemProvider('s3Files')
```

### Error Handling

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3'

const provider = new S3FileSystemProvider({
  bucketName: 'my-bucket',
  clientConfig: { region: 'us-east-1' }
})

try {
  // This will throw if file doesn't exist
  const content = await provider.readFile('nonexistent.txt', 'utf8')
} catch (error: any) {
  if (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
    console.log('File not found')
  } else {
    console.error('S3 error:', error.message)
  }
}

// Check existence before operations
if (await provider.exists('file.txt')) {
  const content = await provider.readFile('file.txt', 'utf8')
}
```

### Path Handling Examples

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3'

const provider = new S3FileSystemProvider({
  bucketName: 'my-bucket',
  clientConfig: { region: 'us-east-1' }
})

// Convert relative to absolute
const absolute = provider.relativeOrAbsolutePathToAbsolutePath('docs/readme.md')
console.log(absolute) // s3://my-bucket/docs/readme.md

// Convert absolute to relative
const relative = provider.relativeOrAbsolutePathToRelativePath('s3://my-bucket/docs/readme.md')
console.log(relative) // docs/readme.md

// Path normalization
const normalized = provider.relativeOrAbsolutePathToAbsolutePath('path/../file.txt')
console.log(normalized) // s3://my-bucket/file.txt

// Attempting to traverse above bucket root will throw
try {
  provider.relativeOrAbsolutePathToAbsolutePath('../../file.txt')
} catch (error) {
  console.error(error.message) // Invalid path attempts to traverse above bucket root
}
```

## Configuration

### S3FileSystemProviderOptions

```typescript
interface S3FileSystemProviderOptions {
  bucketName: string
  clientConfig?: Record<string, unknown>
}
```

**Example:**
```typescript
{
  bucketName: 'my-bucket',
  clientConfig: {
    region: 'us-east-1',
    // Other AWS SDK client options
  }
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

**Example:**
```typescript
{
  bucket: 'my-cdn-bucket',
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  baseUrl: 'https://cdn.example.com' // Optional
}
```

## Integration

### With CDN Service

The package integrates with `@tokenring-ai/cdn` by providing an implementation of the `CDNProvider` interface. When configured via the plugin, S3CDNProvider instances are automatically registered with the CDNService.

**Registration Flow:**
1. Plugin receives configuration with `cdn.providers` section
2. For each provider with `type: 's3'`, creates `S3CDNProvider` instance
3. Registers provider with CDNService using the provider name

### With File System Service

The package integrates with `@tokenring-ai/filesystem` by implementing the `FileSystemProvider` interface. When configured via the plugin, S3FileSystemProvider instances are automatically registered with the FileSystemService.

**Registration Flow:**
1. Plugin receives configuration with `filesystem.providers` section
2. For each provider with `type: 's3'`, creates `S3FileSystemProvider` instance
3. Registers provider with FileSystemService using the provider name

### Plugin Installation

1. Install the package: `bun install @tokenring-ai/s3`
2. Import the plugin: `import s3Plugin from '@tokenring-ai/s3'`
3. Configure S3 providers in your app configuration
4. Register the plugin: `app.registerPlugin(s3Plugin)`
5. Start the app: `await app.start()`

## Best Practices

### Security

- Use IAM roles with least-privilege access when possible
- Store credentials securely (environment variables or AWS Secrets Manager)
- Enable S3 bucket policies for proper access control
- Consider using signed URLs for temporary access when appropriate
- Enable S3 server-side encryption for sensitive data
- Never expose credentials in client-side code
- Rotate access keys regularly

### Performance

- Consider batch operations for large file transfers
- Use appropriate content types for better CDN caching
- Implement retry logic for transient network errors
- Use S3 Transfer Acceleration for geographically distributed access
- Use multipart uploads for large files (>100MB)
- Enable CloudFront in front of S3 for better CDN performance

### Error Handling

- Always wrap S3 operations in try-catch blocks
- Handle specific S3 error codes (NoSuchKey, AccessDenied, etc.)
- Implement exponential backoff for rate limiting
- Log errors for debugging and monitoring
- Check file existence before operations when appropriate

### Path Management

- Use consistent path separators (forward slashes recommended)
- Validate paths before operations to prevent traversal attacks
- Use the provided path conversion methods for consistency
- Be aware that S3 directories are virtual (prefixes)

## Testing and Development

### Testing Setup

This package uses `vitest` for unit testing.

```bash
# Run tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Type check
bun build
```

### Development

1. Clone the repository
2. Install dependencies: `bun install`
3. Make changes to the source files
4. Run tests: `bun test`
5. Type check: `bun build`

## Dependencies

### Peer Dependencies

- `@tokenring-ai/cdn: 0.2.0`
- `@tokenring-ai/filesystem: 0.2.0`

### Dependencies

- `@aws-sdk/client-s3: ^3.1017.0`
- `@tokenring-ai/agent: 0.2.0`
- `@tokenring-ai/app: 0.2.0`
- `zod: ^4.3.6`

### Dev Dependencies

- `typescript: ^6.0.2`
- `vitest: ^4.1.1`

## Related Components

- `@tokenring-ai/cdn` - Core CDN service and provider interface
- `@tokenring-ai/filesystem` - Core filesystem service and provider interface
- `@tokenring-ai/app` - Base application framework with plugin system
- `@tokenring-ai/agent` - Agent orchestration system

## License

MIT License - see [LICENSE](./LICENSE) file for details.
