# S3 Benchmark Tool

A high-performance S3 storage benchmarking tool using MinIO's warp that measures latency and throughput for common operations across different providers.

## Setup

1. Install required tools via Mise:
   ```bash
   mise install  # Installs warp and other dependencies
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

   **Option 3: Task Runner**
   ```bash
   deno task warp  # Uses .env configuration
   ```

## Usage

### Run Warp Benchmarks (Primary)
```bash
./warp-bench.sh
# or
deno task warp
```

### Custom Deno Tool (Alternative)
```bash
deno task start  # For detailed per-operation analysis
```

### Warp Benchmark Configuration
Configure via environment variables in `.env`:
- `WARP_DURATION` - Benchmark duration (default: 30s)
- `WARP_CONCURRENT` - Concurrent operations (default: 10) 
- `WARP_SIZE` - Object size (default: 1KiB)

### Deno Tool Options (Alternative)
- `--iterations <number>` - Number of iterations (default: 10)
- `--object-size <bytes>` - Object size in bytes (default: 1024)
- Use `deno task start --help` for full options

## What It Measures

The warp benchmarking tool measures performance for key S3 operations:

1. **PutObject** - Upload performance and throughput
2. **GetObject** - Download performance with TTFB metrics  
3. **ListObjects** - Bucket listing performance
4. **DeleteObject** - Object deletion performance

For each operation, it reports:
- **Latency metrics**: Average, P90, P99, min/max
- **Throughput**: Operations per second and MB/s
- **Time to First Byte (TTFB)** for downloads
- **Detailed percentile distributions**


## Benchmark Results

Performance benchmarks across different regions and cloud storage providers. All tests performed with 1024-byte objects over 10 iterations.

### ListObjects Performance

| Source Region | Tigris (Global) | Cloudflare R2 (Eastern Europe Hint) |
|--------------|-----------------|--------------------------------------|
| Berlin, Germany | Avg: 174ms, P90: 481ms, P99: 481ms | Avg: 174ms, P90: 481ms, P99: 481ms |

### PutObject Performance  

| Source Region | Tigris (Global) | Cloudflare R2 (Eastern Europe Hint) |
|--------------|-----------------|--------------------------------------|
| Berlin, Germany | Avg: 33ms, P90: 59ms, P99: 65ms | Avg: 201ms, P90: 262ms, P99: 406ms |

### GetObject Performance

| Source Region | Tigris (Global) | Cloudflare R2 (Eastern Europe Hint) |
|--------------|-----------------|--------------------------------------|
| Berlin, Germany | Avg: 15ms, P90: 16ms, P99: 22ms | Avg: 89ms, P90: 117ms, P99: 196ms |

### DeleteObject Performance

| Source Region | Tigris (Global) | Cloudflare R2 (Eastern Europe Hint) |
|--------------|-----------------|--------------------------------------|
| Berlin, Germany | Avg: 180ms, P90: 209ms, P99: 209ms | Avg: 180ms, P90: 209ms, P99: 209ms |

### Summary

**Performance Comparison from Berlin, Germany:**

**Tigris (Global):**
- **Upload (PutObject)**: 33ms avg, 65ms P99, 342.35 ops/sec
- **Download (GetObject)**: 15ms avg, 22ms P99, 681.45 ops/sec  
- **List/Delete**: Consistent ~180ms avg latency
- **Reliability**: 100% success rate across all operations

**Cloudflare R2 (Eastern Europe Hint):**
- **Upload (PutObject)**: 201ms avg, 406ms P99, 49.10 ops/sec
- **Download (GetObject)**: 89ms avg, 196ms P99, 110.24 ops/sec
- **List/Delete**: Consistent ~180ms avg latency  
- **Reliability**: 100% success rate across all operations

**Performance Winner:**
- **Fastest Upload**: Tigris (6x faster - 33ms vs 201ms)
- **Fastest Download**: Tigris (6x faster - 15ms vs 89ms)
- **Highest Throughput**: Tigris (7x uploads, 6x downloads)
- **Best P99 Performance**: Tigris (65ms vs 406ms uploads)
- **Global Edge Performance**: Tigris significantly outperforms regional hints