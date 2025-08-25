# @token-ring/s3-cdn

AWS S3 CDN implementation for Token Ring.

## Usage

```typescript
import {S3CDNService} from "@token-ring/s3-cdn";

const s3CDN = new S3CDNService({
  bucket: "my-bucket",
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  baseUrl: "https://cdn.example.com" // Optional custom domain
});

registry.addService(s3CDN);
```

## Configuration

- `bucket`: S3 bucket name (required)
- `region`: AWS region (default: "us-east-1")
- `accessKeyId`: AWS access key (optional, uses default credentials if not provided)
- `secretAccessKey`: AWS secret key (optional, uses default credentials if not provided)
- `baseUrl`: Custom CDN domain (optional, uses S3 URL if not provided)