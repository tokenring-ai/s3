# @tokenring-ai/s3

AWS S3 integration package for the Token Ring AI ecosystem, providing both filesystem and CDN functionality.

## Overview

The `@tokenring-ai/s3` package implements two main abstractions for AWS S3 integration:

- **S3FileSystemProvider**: Treats S3 buckets as a virtual filesystem, supporting file operations like read, write, delete, and directory traversal
- **S3CDNProvider**: Provides CDN-like functionality for uploading, managing, and serving content from S3 buckets

This package is designed to integrate seamlessly with Token Ring's filesystem and CDN modules, handling S3-specific details like path normalization, error handling, and directory simulation using S3 prefixes.

## Installation

```bash
npm install @tokenring-ai/s3
```

### Required Peer Dependencies

```bash
npm install @tokenring-ai/cdn @tokenring-ai/filesystem
```

### AWS Configuration

The package requires AWS credentials. You can configure them in several ways:

1. **Environment variables** (recommended):
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=your-region
   ```

2. **Explicit configuration** in provider options
3. **AWS credentials file** (~/.aws/credentials)
4. **IAM roles** (when running on AWS infrastructure)

## Package Structure

```
pkg/s3/
├── index.ts              # Main entry point and plugin registration
├── S3FileSystemProvider.ts # S3 filesystem implementation
├── S3CDNProvider.ts      # S3 CDN provider implementation
├── package.json          # Package metadata and dependencies
├── README.md             # This documentation
└── LICENSE               # MIT license
```

## Core Components

### S3FileSystemProvider

A filesystem provider that maps S3 buckets to a virtual filesystem interface.

#### Constructor

```typescript
new S3FileSystemProvider(options: S3FileSystemProviderOptions)
```

**Options:**
- `bucketName` (string, required): Name of the S3 bucket
- `clientConfig` (object, optional): AWS SDK client configuration

#### Key Methods

##### File Operations

```typescript
// Write content to a file
await provider.writeFile('path/to/file.txt', 'content or buffer')

// Read file content
const content = await provider.readFile('path/to/file.txt', 'utf8') // or 'buffer'

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
// Returns: { path, absolutePath, isFile, isDirectory, size, modified, created, accessed }
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
- `bucket` (string, required): S3 bucket name
- `region` (string, required): AWS region
- `accessKeyId` (string, required): AWS access key ID
- `secretAccessKey` (string, required): AWS secret access key
- `baseUrl` (string, optional): Custom base URL for CDN (defaults to `https://{bucket}.s3.amazonaws.com`)

#### Key Methods

##### Upload Operations

```typescript
// Upload data with options
const result = await provider.upload(buffer, {
  filename: 'image.png',
  contentType: 'image/png',
  metadata: { author: 'User', category: 'images' }
})
// Returns: { url, id, metadata }
```

##### Delete Operations

```typescript
// Delete by URL
const deleteResult = await provider.delete('https://bucket.s3.amazonaws.com/file.txt')
// Returns: { success: boolean, message: string }
```

##### Existence Check

```typescript
// Check if resource exists
const exists = await provider.exists('https://bucket.s3.amazonaws.com/file.txt')
```

## Usage Examples

### Basic Filesystem Usage

```typescript
import { S3FileSystemProvider } from '@tokenring-ai/s3'

const provider = new S3FileSystemProvider({
  bucketName: 'my-bucket',
  clientConfig: {
    region: 'us-east-1'
  }
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
  baseUrl: 'https://cdn.example.com' // Optional custom domain
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

### Integration with Token Ring App

The package can be used as a Token Ring plugin:

```typescript
import TokenRingApp from '@tokenring-ai/app'
import s3Plugin from '@tokenring-ai/s3'

const app = new TokenRingApp({
  config: {
    cdn: {
      providers: {
        s3: {
          type: 's3',
          bucket: 'my-cdn-bucket',
          region: 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
      }
    },
    filesystem: {
      providers: {
        s3: {
          type: 's3',
          bucketName: 'my-files-bucket'
        }
      }
    }
  }
})

app.registerPlugin(s3Plugin)
await app.start()
```

## Configuration Options

### S3FileSystemProviderOptions

```typescript
interface S3FileSystemProviderOptions {
  bucketName: string        // Required: S3 bucket name
  clientConfig?: object     // Optional: AWS SDK client configuration
}
```

### S3CDNProviderOptions

```typescript
interface S3CDNProviderOptions {
  bucket: string           // Required: S3 bucket name
  region: string           // Required: AWS region
  accessKeyId: string      // Required: AWS access key ID
  secretAccessKey: string  // Required: AWS secret access key
  baseUrl?: string         // Optional: Custom base URL
}
```

## API Reference

### Exports

```typescript
// Main plugin export
export default s3Plugin

// Individual classes
export { S3FileSystemProvider }
export { S3CDNProvider }

// Type exports
export type { S3FileSystemProviderOptions }
export type { S3CDNProviderOptions }
```

### Method Signatures

#### S3FileSystemProvider

- `writeFile(fsPath: string, content: string | Buffer): Promise<boolean>`
- `appendFile(filePath: string, content: string | Buffer): Promise<boolean>`
- `readFile(fsPath: string, encoding?: BufferEncoding | "buffer"): Promise<any>`
- `deleteFile(fsPath: string): Promise<boolean>`
- `exists(fsPath: string): Promise<boolean>`
- `stat(fsPath: string): Promise<StatLike>`
- `copy(sourceFsPath: string, destinationFsPath: string, options?: { overwrite?: boolean }): Promise<boolean>`
- `rename(oldPath: string, newPath: string): Promise<boolean>`
- `createDirectory(fsPath: string, options?: { recursive?: boolean }): Promise<boolean>`
- `getDirectoryTree(fsPath: string, params?: DirectoryTreeOptions): AsyncGenerator<string>`

#### S3CDNProvider

- `upload(data: Buffer, options?: UploadOptions): Promise<UploadResult>`
- `delete(url: string): Promise<DeleteResult>`
- `exists(url: string): Promise<boolean>`

## Dependencies

### Direct Dependencies

- `@tokenring-ai/agent: ^0.1.0`
- `@aws-sdk/client-s3: ^3.937.0`

### Peer Dependencies

- `@tokenring-ai/cdn: ^0.1.0`
- `@tokenring-ai/filesystem: ^0.1.0`

## Error Handling

The package provides comprehensive error handling:

- **File not found**: Returns `false` for `exists()` or throws descriptive errors for other operations
- **Invalid paths**: Prevents directory traversal above bucket root
- **AWS errors**: Propagates AWS SDK errors with descriptive messages
- **Configuration errors**: Validates required options and throws clear error messages

## Security Considerations

- Use IAM roles with least-privilege access when possible
- Store credentials securely (environment variables or AWS Secrets Manager)
- Enable S3 bucket policies for proper access control
- Consider using signed URLs for temporary access when appropriate
- Enable S3 server-side encryption for sensitive data

## Limitations

- **Filesystem**: No real-time file watching, shell execution, or advanced filesystem features
- **CDN**: No automatic URL signing or CDN-specific caching controls
- **Performance**: S3 operations have network latency; consider batch operations for large files
- **Directories**: S3 directories are simulated using prefixes; true directory operations are limited

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all existing tests pass
5. Submit a pull request

### Testing

Before committing, run tests with AWS credentials configured for a test bucket:

```bash
# Set up test environment
export AWS_ACCESS_KEY_ID=test-key
export AWS_SECRET_ACCESS_KEY=test-secret
export AWS_REGION=us-east-1
export TEST_BUCKET=test-bucket-name

# Run tests (assuming test framework is set up)
npm test
```

## License

MIT License - see LICENSE file for details.