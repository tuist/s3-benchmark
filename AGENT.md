# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Deno 2.4.2-based S3 performance benchmarking tool that measures latency for S3 storage operations (ListObjects, PutObject, GetObject, DeleteObject) across different providers. The tool works with empty buckets by creating, downloading, and cleaning up test objects during each benchmark iteration.

## Development Commands

### Setup
```bash
# Install Deno 2.4.2 via mise
mise install

# Setup configuration from template
cp .env.example .env
# Edit .env with your S3 credentials
```

### Running
```bash
# Development with hot reload
deno task dev

# Production run
deno task start

# With custom parameters  
deno task start --bucket my-bucket --iterations 20 --object-size 2048

# Help
deno task start --help
```

### Direct Deno Commands
```bash
# Run with all required permissions
deno run --allow-net --allow-env --allow-read src/main.ts

# Check dependencies
deno info src/main.ts
```

## Architecture

### Core Structure
- **Single-class design**: `S3Benchmark` class encapsulates all benchmarking logic
- **Configuration system**: Multi-source config loading (.env file → environment variables → CLI args)
- **Object-oriented async operations**: Each S3 operation has its own benchmark method
- **Complete lifecycle testing**: Creates, downloads, and deletes objects in each iteration

### Key Files
- `src/main.ts`: Main application (337 lines) - contains S3Benchmark class and configuration loading
- `deno.json`: Project configuration with tasks and dependencies
- `mise.toml`: Specifies Deno 2.4.2 for consistent development environment
- `.env.example`: Configuration template for S3 credentials

### Dependencies
- `@aws-sdk/client-s3@^3.0.0`: AWS SDK for S3 operations
- `@std/cli@^1.0.0`: Argument parsing
- `@std/dotenv@^0.225.0`: Environment file loading

### Configuration Precedence
1. Command line arguments (highest priority)
2. Environment variables  
3. .env file values (lowest priority)

Required: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
Optional: `S3_ENDPOINT` (defaults to AWS), `S3_REGION` (defaults to us-east-1)

## Benchmarking Operations

The tool runs four operations per iteration:
1. **ListObjects**: Tests bucket listing (works with empty buckets)
2. **PutObject**: Uploads random test data of configurable size  
3. **GetObject**: Downloads and processes the uploaded object
4. **DeleteObject**: Cleans up test objects

Each operation measures latency and reports success/failure with detailed statistics (average, median, min, max latencies).

## Working with S3 Providers

The tool is provider-agnostic - change `S3_ENDPOINT` to benchmark different S3-compatible services:
- AWS S3: `https://s3.amazonaws.com` (default)
- MinIO: `http://localhost:9000`  
- DigitalOcean Spaces: `https://nyc3.digitaloceanspaces.com`

Credentials must have permissions for list, get, put, and delete operations on the target bucket.

## Documentation Maintenance

When making changes to the project, ensure that README.md is kept up to date with any architectural changes, new features, or configuration updates.