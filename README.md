# @tokenring-ai/s3

AWS S3 integration package for the Token Ring AI ecosystem, providing both
filesystem and CDN functionality through a unified interface. This package
integrates seamlessly with Token Ring's filesystem and CDN modules, handling
S3-specific details like path normalization, error handling, and directory
simulation using S3 prefixes.

## Overview

The `@tokenring-ai/s3` package provides comprehensive AWS S3 integration for
cloud storage and content delivery in the Token Ring AI system. It implements
both CDN (Content Delivery Network) and File System providers for seamless
cloud storage and content delivery.

### Key Features

- **Filesystem Provider**: Treats S3 buckets as a virtual filesystem with
  read, write, delete, and directory operations
- **CDN Provider**: Upload, manage, and serve content from S3 buckets with CDN
  capabilities
- **Type-Safe APIs**: Strongly-typed interfaces with Zod validation
- **Automatic Configuration**: Integrates with Token Ring's configuration
  system via plugin
- **Path Conversion**: Built-in methods for converting between relative/absolute
  S3 paths and bucket-relative keys
- **Error Handling**: Comprehensive validation and error management
- **Multi-Provider Support**: Works with both standard and custom S3
  implementations via endpoint configuration

## Installation

```bash
bun install @tokenring-ai/s3
```

## Package Structure

```text
pkg/s3/
├── index.ts                    # Main entry point and exports
├── plugin.ts                   # Plugin integration logic
├── schema.ts                   # Zod schema definitions
├── S3CDNProvider.ts            # CDN provider implementation
├── S3FileSystemProvider.ts     # File system provider implementation
├── package.json                # Package configuration and dependencies
└── LICENSE                     # MIT License
```

## Chat Commands

This package does not register any chat commands.

## Tools

This package does not define any tools.

## Core Components

### S3FileSystemProvider

A filesystem provider that maps S3 buckets to a virtual filesystem interface.
Implements the `FileSystemProvider` interface from `@tokenring-ai/filesystem`.

#### S3FileSystemProvider Type Exports

**File:** `pkg/s3/S3FileSystemProvider.ts`

```typescript
// Type definitions (inferred from Zod schema)
type S3FileSystemProviderOptions = {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

// Zod schema for validation
const S3FileSystemProviderOptionsSchema: z.ZodType<S3FileSystemProviderOptions>;

// Exported from package:
// - S3FileSystemProviderOptions (z.infer - input type)
// - S3FileSystemProviderOptionsSchema (validation schema)
// - S3FileSystemProvider (class)
```

#### S3FileSystemProvider Constructor

```typescript
new S3FileSystemProvider(options: ParsedS3FileSystemProviderOptions)
```

**Options:**

- `bucket`: Name of the S3 bucket (required)
- `endpoint`: S3 endpoint URL (required)
- `region`: AWS region (required)
- `accessKeyId`: AWS access key ID (required)
- `secretAccessKey`: AWS secret access key (required)

**Throws:**

- `Error` if `bucket` is not provided with message "S3FileSystem requires a 'bucketName'"

#### S3FileSystemProvider Path Conversion Methods

```typescript
// Convert a path to absolute S3 URI format
const absolutePath = provider.relativeOrAbsolutePathToAbsolutePath('path/to/file.txt')
// Returns: 's3://bucket-name/path/to/file.txt'
```

#### S3FileSystemProvider Key Methods

##### File Operations

```typescript
// Write content to a file
await provider.writeFile('path/to/file.txt', 'content or buffer')
// Returns: true

// Read file content (overloaded)
const content = await provider.readFile('path/to/file.txt', 'utf8')
// Returns: string (with text encoding), Buffer (with 'buffer'),
//   or Buffer | null (with no encoding)

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
// Throws: Error if path exists and is a file

// Get directory tree listing (async generator)
for await (const path of provider.getDirectoryTree('path/to/directory')) {
  console.log(path)
}
// Yields: string (full S3 key path)

// With options
for await (const path of provider.getDirectoryTree(
  'path/to/directory',
  { recursive: false, ignoreFilter: (key) => !key.endsWith('.txt') }
)) {
  console.log(path)
}
// recursive: boolean (default true) - include nested directories
// ignoreFilter: (key: string) => boolean - filter entries by S3 key

// Copy files
await provider.copy('source.txt', 'destination.txt', { overwrite: true })
// Returns: true
// Throws: Error if destination exists and overwrite is false/undefined

// Rename files (implemented as copy + delete)
await provider.rename('old-name.txt', 'new-name.txt')
// Returns: true
```

#### Path Handling

- Supports relative paths (`file.txt`) and absolute S3 paths
  (`s3://bucket/file.txt`)
- Automatically normalizes paths and prevents directory traversal above bucket
  root
- Simulates directories using S3 prefixes
- Handles both forward slashes and backslashes for cross-platform compatibility
- Path traversal with `..` is validated to prevent escaping bucket root

#### Limitations

- S3 is object storage, not a true filesystem, so some filesystem features are
  limited
- Directories are virtual (created as prefixes)
- `createDirectory()` only validates that the path does not already exist as a
  file; it does not create an actual directory object. Throws an error if the
  path exists and is a file.

### S3CDNProvider

A CDN provider for uploading and managing content in S3 buckets. Extends the
base `CDNProvider` class from `@tokenring-ai/cdn`.

#### S3CDNProvider Type Exports

**File:** `pkg/s3/S3CDNProvider.ts`

```typescript
// Type definitions (inferred from Zod schema)
type S3CDNProviderOptions = {
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

// Zod schema for validation
const S3CDNProviderOptionsSchema: z.ZodType<S3CDNProviderOptions>;

// Exported from package:
// - S3CDNProviderOptions (z.input - input type)
// - S3CDNProviderOptionsSchema (validation schema)
// - S3CDNProvider (class)
```

#### S3CDNProvider Constructor

```typescript
new S3CDNProvider(options: ParsedS3CDNProviderOptions)
```

**Options:**

- `bucket`: S3 bucket name (required)
- `endpoint`: S3 endpoint URL (required)
- `region`: AWS region (required)
- `accessKeyId`: AWS access key ID (required)
- `secretAccessKey`: AWS secret access key (required)
- `publicUrl`: Public URL base for CDN content (required)

#### S3CDNProvider Key Methods

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
// Note: If filename is not provided, a key is auto-generated using
//   Date.now() and a random string

// Delete by URL
const deleteResult = await provider.delete('https://cdn.example.com/file.txt')
// Returns: DeleteResult {
//   success: boolean;
//   message: string; // On failure: "Failed to delete: <error message>"
// }

// Check if resource exists
const exists = await provider.exists('https://cdn.example.com/file.txt')
// Returns: boolean
```

#### URL Handling

- Automatically extracts S3 keys from various URL formats
- Supports custom `publicUrl` for CDN domains
- Falls back to AWS S3 URL format parsing if URL does not match `publicUrl`

## Services

### CDN Service

The package registers `S3CDNProvider` instances with `CDNService` from
`@tokenring-ai/cdn`.

**Registration:**

- Automatically registers with CDNService when CDN configuration is provided
  via plugin
- Uses `S3ConfigSchema` for configuration validation
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

The package registers `S3FileSystemProvider` instances with `FileSystemService`
from `@tokenring-ai/filesystem`.

**Registration:**

- Automatically registers with FileSystemService when filesystem configuration
  is provided via plugin
- Uses `S3ConfigSchema` for configuration validation
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
  createDirectory(fsPath: string, options?: { recursive?: boolean }):
    Promise<boolean>;
  getDirectoryTree(fsPath: string, params?: DirectoryTreeOptions):
    AsyncGenerator<string>;
  copy(sourceFsPath: string, destinationFsPath: string,
    options?: { overwrite?: boolean }): Promise<boolean>;
  rename(oldPath: string, newPath: string): Promise<boolean>;
  relativeOrAbsolutePathToAbsolutePath(p: string): string;
}
```

## Plugin Documentation

This package provides a Token Ring plugin that automatically registers S3
providers with the CDN and filesystem services.

### Plugin Name

`@tokenring-ai/s3`

### Plugin Options Schema

Configuration is organized under `s3.accounts`, where each account can
optionally expose CDN and/or filesystem providers:

```typescript
interface PackageConfig {
  s3: {
    accounts: Record<string, {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      endpoint: string;
      cdn?: {
        publicUrl: string;
      };
      filesystem?: {};
    }>;
  };
}
```

### Environment Variable Configuration

The plugin supports loading S3 accounts from environment variables. The
following pattern is used (where `N` is an optional numeric suffix, defaulting
to empty string):

| Variable | Description |
|---|---|
| `S3_BUCKET` / `S3_BUCKET1` / `S3_BUCKET2` | Bucket name (required) |
| `S3_REGION` / `S3_REGION1` / `S3_REGION2` | AWS region (required) |
| `S3_ACCESS_KEY_ID` / `S3_ACCESS_KEY_ID1` | Access key ID (required) |
| `S3_SECRET_ACCESS_KEY` / `S3_SECRET_ACCESS_KEY1` | Secret access key (required) |
| `S3_ACCOUNT_NAME` / `S3_ACCOUNT_NAME1` | Account name (defaults to `S3` or `S3 N`) |
| `S3_CDN_BASE_URL` / `S3_CDN_BASE_URL1` | Enables CDN for the account when set |
| `S3_CDN_PUBLIC_URL` / `S3_CDN_PUBLIC_URL1` | CDN public URL (required if CDN enabled) |
| `S3_FILESYSTEM` / `S3_FILESYSTEM1` | Enables filesystem for the account when set |

**Note:** The `endpoint` field is required for each S3 account but is not loaded
from environment variables. It must be provided in the configuration object
directly.

### Plugin Registration

```typescript
import TokenRingApp from '@tokenring-ai/app'
import s3Plugin from '@tokenring-ai/s3/plugin'

const app = new TokenRingApp({
  config: {
    s3: {
      accounts: {
        main: {
          bucket: 'my-bucket',
          region: 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          endpoint: 'https://s3.amazonaws.com',
          cdn: {
            publicUrl: 'https://cdn.example.com'
          },
          filesystem: {}
        }
      }
    }
  }
})

app.registerPlugin(s3Plugin)
await app.start()
```

**Note:** The plugin uses `waitForService` to ensure services are available
before registering providers. Providers are only registered if their respective
configuration sections (`cdn` or `filesystem`) are present on the account. If
no accounts are configured (from either config or environment variables), the
plugin returns without registering anything. When loading accounts from
environment variables, missing required values (`S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`) will throw an error.

## Schema Documentation

### S3ConfigSchema

Top-level configuration schema for the S3 plugin.

```typescript
const S3ConfigSchema = z.object({
  accounts: z.record(z.string(), S3AccountSchema).default({}),
});
```

### S3AccountSchema

Defines a single S3 account with optional CDN and filesystem capabilities.

```typescript
const S3AccountSchema = z.object({
  bucket: z.string(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  endpoint: z.string(),
  cdn: S3AccountCDNSchema.exactOptional(),
  filesystem: S3AccountFilesystemSchema.exactOptional(),
});
```

**Core identification fields:**

- `bucket`: S3 bucket name
- `region`: AWS region
- `endpoint`: S3 endpoint URL

**Credential fields:**

- `accessKeyId`: AWS access key ID
- `secretAccessKey`: AWS secret access key

**Optional capability fields:**

- `cdn`: CDN configuration (enables CDN provider registration)
- `filesystem`: Filesystem configuration (enables filesystem provider
  registration)

### S3AccountCDNSchema

CDN-specific configuration for an S3 account.

```typescript
const S3AccountCDNSchema = z.object({
  publicUrl: z.string(),
});
```

### S3AccountFilesystemSchema

Filesystem-specific configuration for an S3 account (currently empty schema).

```typescript
const S3AccountFilesystemSchema = z.object({});
```

### Exported Schema Types

The following types are exported from the package schema:

- `S3Config`: The parsed configuration type (`z.output<typeof S3ConfigSchema>`)
- `S3Account`: A single S3 account configuration (`z.output<typeof S3AccountSchema>`)
- `S3AccountCDN`: CDN configuration for an S3 account (`z.output<typeof S3AccountCDNSchema>`)
- `S3AccountFilesystem`: Filesystem configuration for an S3 account
  (`z.output<typeof S3AccountFilesystemSchema>`)

## Usage Examples

### Basic Filesystem Usage

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3'

const provider = new S3FileSystemProvider({
  bucket: 'my-bucket',
  region: 'us-east-1',
  endpoint: 'https://s3.amazonaws.com',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
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
await provider.appendFile('greeting.txt', '\nAppended content')
```

### CDN Usage

```typescript
import { S3CDNProvider } from '@tokenring-ai/s3'

const cdn = new S3CDNProvider({
  bucket: 'my-cdn-bucket',
  region: 'us-east-1',
  endpoint: 'https://s3.amazonaws.com',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  publicUrl: 'https://cdn.example.com'
})

// Upload an image
const imageBuffer = Buffer.from('image data...')
const uploadResult = await cdn.upload(imageBuffer, {
  filename: 'profile.png',
  contentType: 'image/png',
  metadata: {
    author: 'John Doe',
    category: 'avatar'
  }
})

console.log(`Uploaded to: ${uploadResult.url}`)
console.log(`File ID: ${uploadResult.id}`)

// Check if file exists
const fileExists = await cdn.exists(uploadResult.url)
console.log(`File exists: ${fileExists}`)

// Delete the file
const deleteResult = await cdn.delete(uploadResult.url)
console.log(`Delete success: ${deleteResult.success}`)
console.log(`Message: ${deleteResult.message}`)
```

### Plugin-Based Configuration

```typescript
import TokenRingApp from '@tokenring-ai/app'
import s3Plugin from '@tokenring-ai/s3/plugin'
import { CDNService } from '@tokenring-ai/cdn'
import FileSystemService from '@tokenring-ai/filesystem/FileSystemService'

const app = new TokenRingApp({
  config: {
    s3: {
      accounts: {
        storage: {
          bucket: 'my-bucket',
          region: 'us-west-2',
          endpoint: 'https://s3.amazonaws.com',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          cdn: {
            publicUrl: 'https://cdn.example.com'
          },
          filesystem: {}
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
const cdnProvider = cdnService.getProvider('storage')

const fileSystemService = await app.getService(FileSystemService)
const fsProvider = fileSystemService.getFileSystemProvider('storage')
```

### Error Handling Examples

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3'

const provider = new S3FileSystemProvider({
  bucket: 'my-bucket',
  region: 'us-east-1',
  endpoint: 'https://s3.amazonaws.com',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
})

// Check existence before operations
if (await provider.exists('file.txt')) {
  const content = await provider.readFile('file.txt', 'utf8')
}
```

### Path Handling Examples

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3'

const provider = new S3FileSystemProvider({
  bucket: 'my-bucket',
  region: 'us-east-1',
  endpoint: 'https://s3.amazonaws.com',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
})

// Convert relative to absolute
const absolute = provider.relativeOrAbsolutePathToAbsolutePath('docs/readme.md')
console.log(absolute) // s3://my-bucket/docs/readme.md

// Path normalization
const normalized = provider.relativeOrAbsolutePathToAbsolutePath('path/../file.txt')
console.log(normalized) // s3://my-bucket/file.txt

// Attempting to traverse above bucket root will throw
try {
  provider.relativeOrAbsolutePathToAbsolutePath('../../file.txt')
} catch (error) {
  console.error(error.message)
  // "Invalid path: ../../file.txt attempts to traverse above bucket root."
}
```

## Configuration

### Configuration Environment Variables

The plugin supports loading S3 accounts from environment variables using the
following pattern (where `N` is an optional numeric suffix):

| Variable | Description |
|----------|-------------|
| `S3_BUCKET` / `S3_BUCKET1` / `S3_BUCKET2` | Bucket name (triggers account creation) |
| `S3_REGION` / `S3_REGION1` | AWS region (required when bucket is set) |
| `S3_ACCESS_KEY_ID` / `S3_ACCESS_KEY_ID1` | Access key ID (required when bucket is set) |
| `S3_SECRET_ACCESS_KEY` / `S3_SECRET_ACCESS_KEY1` | Secret access key (required when bucket is set) |
| `S3_ACCOUNT_NAME` / `S3_ACCOUNT_NAME1` | Account name (defaults to `S3` or `S3 N`) |
| `S3_CDN_BASE_URL` / `S3_CDN_BASE_URL1` | Enables CDN for the account when set |
| `S3_CDN_PUBLIC_URL` / `S3_CDN_PUBLIC_URL1` | CDN public URL (required when CDN is enabled) |
| `S3_FILESYSTEM` / `S3_FILESYSTEM1` | Enables filesystem for the account when set |

**Note:** When configuring CDN via environment variables, both `S3_CDN_BASE_URL{N}` and `S3_CDN_PUBLIC_URL{N}` must be set.

**Important:** The `endpoint` field is required for each S3 account but is not currently loaded from environment variables. It must be provided in the configuration object directly.

### Configuration Example

```yaml
s3:
  accounts:
    main:
      bucket: "my-bucket"
      region: "us-east-1"
      accessKeyId: "AKIAIOSFODNN7EXAMPLE"
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      endpoint: "https://s3.amazonaws.com"
      cdn:
        publicUrl: "https://cdn.example.com"
      filesystem: {}
```

### S3FileSystemProviderOptions

```typescript
interface S3FileSystemProviderOptions {
  bucket: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}
```

**Example:**

```typescript
{
  bucket: 'my-bucket',
  endpoint: 'https://s3.amazonaws.com',
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
}
```

**Type Notes:**

- `S3FileSystemProviderOptions`: Input type for configuration (z.infer), exported
  from the package
- `ParsedS3FileSystemProviderOptions`: Internal output type after Zod validation
  (z.output), used by the constructor but not exported

### S3CDNProviderOptions

```typescript
interface S3CDNProviderOptions {
  bucket: string
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
}
```

**Example:**

```typescript
{
  bucket: 'my-cdn-bucket',
  endpoint: 'https://s3.amazonaws.com',
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  publicUrl: 'https://cdn.example.com'
}
```

**Type Notes:**

- `S3CDNProviderOptions`: Input type for configuration (z.input), exported from
  the package
- `ParsedS3CDNProviderOptions`: Internal output type after Zod validation
  (z.output), used by the constructor but not exported

## Integration

### With CDN Service

The package integrates with `@tokenring-ai/cdn` by providing an implementation
of the `CDNProvider` interface. When configured via the plugin, S3CDNProvider
instances are automatically registered with the CDNService.

**Registration Flow:**

1. Plugin receives configuration with `s3.accounts` section
2. For each account with `cdn` configured, creates `S3CDNProvider` instance
3. Registers provider with CDNService using the account name

### With File System Service

The package integrates with `@tokenring-ai/filesystem` by implementing the
`FileSystemProvider` interface. When configured via the plugin,
S3FileSystemProvider instances are automatically registered with the
FileSystemService.

**Registration Flow:**

1. Plugin receives configuration with `s3.accounts` section
2. For each account with `filesystem` configured, creates
   `S3FileSystemProvider` instance
3. Registers provider with FileSystemService using the account name

### Plugin Installation

1. Install the package: `bun install @tokenring-ai/s3`
2. Import the plugin: `import s3Plugin from '@tokenring-ai/s3/plugin'`
3. Configure S3 accounts in your app configuration under `s3.accounts`
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
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Type check
bun run build
```

### Development

1. Clone the repository
2. Install dependencies: `bun install`
3. Make changes to the source files
4. Run tests: `bun run test`
5. Type check: `bun run build`

## Package Dependencies

### Peer Dependencies

- `@tokenring-ai/cdn: workspace:*`
- `@tokenring-ai/filesystem: workspace:*`

### Runtime Dependencies

- `@tokenring-ai/app: workspace:*`
- `zod: ^4.4.3`

The S3 client is provided by Bun's built-in `S3Client` (from `bun`), so no
separate AWS SDK dependency is required.

### Dev Dependencies

- `typescript: ^6.0.2`
- `vitest: ^4.1.1`

## Related Components

- `@tokenring-ai/cdn` - Core CDN service and provider interface
- `@tokenring-ai/filesystem` - Core filesystem service and provider interface
- `@tokenring-ai/app` - Base application framework with plugin system

## License

MIT License - see LICENSE file for details.
