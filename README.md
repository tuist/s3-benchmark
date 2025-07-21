# S3 Benchmark Tool

A Deno-based performance benchmarking tool for S3 storage providers that measures latency for common operations.

## Setup

1. Install Mise and activate the project environment:
   ```bash
   mise install
   ```

2. Set up your S3 credentials (choose one method):

   **Option 1: .env file (Recommended)**
   ```bash
   # Copy the example file and edit with your values
   cp .env.example .env
   # Edit .env with your S3 credentials
   ```

   **Option 2: Environment Variables**
   ```bash
   export S3_BUCKET=my-test-bucket
   export S3_ACCESS_KEY_ID=your-access-key
   export S3_SECRET_ACCESS_KEY=your-secret-key
   export S3_ENDPOINT=https://s3.amazonaws.com  # Optional
   export S3_REGION=us-east-1                   # Optional
   ```

   **Option 3: Command Line Arguments**
   ```bash
   deno task start --bucket my-bucket --access-key-id key --secret-access-key secret
   ```

## Usage

### Basic Usage
```bash
deno task start
```

### With Custom Parameters
```bash
deno task start --bucket my-bucket --iterations 20 --object-size 2048
```

### Available Options
- `--endpoint <url>` - S3 endpoint URL (default: https://s3.amazonaws.com)
- `--region <region>` - S3 region (default: us-east-1)
- `--bucket <bucket>` - S3 bucket name (required)
- `--access-key-id <key>` - S3 access key ID (required)
- `--secret-access-key <secret>` - S3 secret access key (required)
- `--iterations <number>` - Number of benchmark iterations (default: 10)
- `--object-size <bytes>` - Size of test objects in bytes (default: 1024)

### Help
```bash
deno task start --help
```

## What It Measures

The benchmark tool measures latency for three key S3 operations:

1. **ListObjects** - Lists objects in the bucket
2. **PutObject** - Uploads a test object
3. **GetObject** - Downloads the uploaded object

For each operation, it reports:
- Average latency
- Median latency
- Minimum latency
- Maximum latency
- Success/failure count


## Benchmark Results

Performance benchmarks across different regions and cloud storage providers. All tests performed with 1024-byte objects over 10 iterations.

### ListObjects Performance

| Source Region | Tigris (Global) | Cloudflare R2 (East Europe) |
|--------------|-----------------|------------------------------|
| Berlin, Germany | Avg: 150ms, P90: 418ms, P99: 418ms | Avg: 174ms, P90: 481ms, P99: 481ms |

### PutObject Performance  

| Source Region | Tigris (Global) | Cloudflare R2 (East Europe) |
|--------------|-----------------|------------------------------|
| Berlin, Germany | Avg: 129ms, P90: 135ms, P99: 135ms | Avg: 294ms, P90: 422ms, P99: 422ms |

### GetObject Performance

| Source Region | Tigris (Global) | Cloudflare R2 (East Europe) |
|--------------|-----------------|------------------------------|
| Berlin, Germany | Avg: 99ms, P90: 112ms, P99: 112ms | Avg: 186ms, P90: 244ms, P99: 244ms |

### DeleteObject Performance

| Source Region | Tigris (Global) | Cloudflare R2 (East Europe) |
|--------------|-----------------|------------------------------|
| Berlin, Germany | Avg: 147ms, P90: 424ms, P99: 424ms | Avg: 180ms, P90: 209ms, P99: 209ms |

### Summary

**Performance Comparison from Berlin, Germany:**

**Tigris Global:**
- **Upload (PutObject)**: Excellent consistency - 129ms avg, 135ms P99
- **Download (GetObject)**: Fastest overall - 99ms avg, 112ms P99
- **List/Delete**: Good baseline but with outliers (P90 jumps to 400ms+)
- **Reliability**: 99% success rate (1 GetObject failure)

**Cloudflare R2 (East Europe Hint):**
- **Upload (PutObject)**: Slower but consistent - 294ms avg, 422ms P99
- **Download (GetObject)**: Good performance - 186ms avg, 244ms P99
- **List/Delete**: More consistent than Tigris - 174ms/180ms avg with lower P99
- **Reliability**: 100% success rate

**Winner by Operation:**
- **Fastest Upload**: Tigris (2.3x faster)
- **Fastest Download**: Tigris (1.9x faster)
- **Most Consistent**: R2 (better P99 performance for List/Delete)
- **Most Reliable**: R2 (no failures)