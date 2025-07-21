#!/usr/bin/env deno run --allow-net --allow-env

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { parseArgs } from "@std/cli";
import { load } from "@std/dotenv";

interface BenchmarkConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  iterations: number;
  objectSize: number;
}

interface BenchmarkResult {
  operation: string;
  latencyMs: number;
  success: boolean;
  error?: string;
  objectKey?: string;
}

class S3Benchmark {
  private client: S3Client;
  private config: BenchmarkConfig;

  constructor(config: BenchmarkConfig) {
    this.config = config;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async benchmarkListObjects(): Promise<BenchmarkResult> {
    const start = performance.now();
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        MaxKeys: 10,
      });
      await this.client.send(command);
      const end = performance.now();
      return {
        operation: "ListObjects",
        latencyMs: end - start,
        success: true,
      };
    } catch (error) {
      const end = performance.now();
      return {
        operation: "ListObjects",
        latencyMs: end - start,
        success: false,
        error: error.message,
      };
    }
  }

  async benchmarkPutObject(): Promise<BenchmarkResult> {
    const testData = new Uint8Array(this.config.objectSize);
    crypto.getRandomValues(testData);
    const key = `benchmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const start = performance.now();
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: testData,
      });
      await this.client.send(command);
      const end = performance.now();
      return {
        operation: "PutObject",
        latencyMs: end - start,
        success: true,
        objectKey: key,
      };
    } catch (error) {
      const end = performance.now();
      return {
        operation: "PutObject",
        latencyMs: end - start,
        success: false,
        error: error.message,
      };
    }
  }

  async benchmarkGetObject(key: string): Promise<BenchmarkResult> {
    const start = performance.now();
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      await response.Body?.transformToByteArray();
      const end = performance.now();
      return {
        operation: "GetObject",
        latencyMs: end - start,
        success: true,
      };
    } catch (error) {
      const end = performance.now();
      return {
        operation: "GetObject",
        latencyMs: end - start,
        success: false,
        error: error.message,
      };
    }
  }

  async benchmarkDeleteObject(key: string): Promise<BenchmarkResult> {
    const start = performance.now();
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      await this.client.send(command);
      const end = performance.now();
      return {
        operation: "DeleteObject",
        latencyMs: end - start,
        success: true,
      };
    } catch (error) {
      const end = performance.now();
      return {
        operation: "DeleteObject",
        latencyMs: end - start,
        success: false,
        error: error.message,
      };
    }
  }

  async runBenchmark(): Promise<void> {
    console.log(`Starting S3 benchmark with ${this.config.iterations} iterations`);
    console.log(`Endpoint: ${this.config.endpoint}`);
    console.log(`Bucket: ${this.config.bucket}`);
    console.log(`Object size: ${this.config.objectSize} bytes`);
    console.log("=".repeat(50));

    const results: BenchmarkResult[] = [];
    const createdKeys: string[] = [];

    for (let i = 0; i < this.config.iterations; i++) {
      console.log(`Iteration ${i + 1}/${this.config.iterations}`);

      // Benchmark ListObjects (works even with empty bucket)
      const listResult = await this.benchmarkListObjects();
      results.push(listResult);
      console.log(`  ListObjects: ${listResult.latencyMs.toFixed(2)}ms ${listResult.success ? "✓" : "✗"}`);

      // Benchmark PutObject (upload)
      const putResult = await this.benchmarkPutObject();
      results.push(putResult);
      console.log(`  PutObject: ${putResult.latencyMs.toFixed(2)}ms ${putResult.success ? "✓" : "✗"}`);

      if (putResult.success && putResult.objectKey) {
        createdKeys.push(putResult.objectKey);

        // Benchmark GetObject (download) using the just-uploaded object
        const getResult = await this.benchmarkGetObject(putResult.objectKey);
        results.push(getResult);
        console.log(`  GetObject: ${getResult.latencyMs.toFixed(2)}ms ${getResult.success ? "✓" : "✗"}`);

        // Benchmark DeleteObject (cleanup)
        const deleteResult = await this.benchmarkDeleteObject(putResult.objectKey);
        results.push(deleteResult);
        console.log(`  DeleteObject: ${deleteResult.latencyMs.toFixed(2)}ms ${deleteResult.success ? "✓" : "✗"}`);
      }

      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.printSummary(results);
    
    // Cleanup any remaining objects
    if (createdKeys.length > 0) {
      console.log("\nCleaning up remaining test objects...");
      for (const key of createdKeys) {
        try {
          await this.benchmarkDeleteObject(key);
        } catch (error) {
          console.warn(`Failed to cleanup object ${key}: ${error.message}`);
        }
      }
    }
  }

  private printSummary(results: BenchmarkResult[]): void {
    console.log("\n" + "=".repeat(50));
    console.log("BENCHMARK SUMMARY");
    console.log("=".repeat(50));

    const operations = ["ListObjects", "PutObject", "GetObject", "DeleteObject"];

    for (const operation of operations) {
      const operationResults = results.filter(r => r.operation === operation && r.success);
      if (operationResults.length === 0) continue;

      const latencies = operationResults.map(r => r.latencyMs).sort((a, b) => a - b);
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const min = Math.min(...latencies);
      const max = Math.max(...latencies);
      const median = latencies[Math.floor(latencies.length / 2)];
      const p90 = latencies[Math.floor(latencies.length * 0.9)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      console.log(`\n${operation}:`);
      console.log(`  Successful operations: ${operationResults.length}`);
      console.log(`  Average latency: ${avg.toFixed(2)}ms`);
      console.log(`  Median latency: ${median.toFixed(2)}ms`);
      console.log(`  P90 latency: ${p90.toFixed(2)}ms`);
      console.log(`  P99 latency: ${p99.toFixed(2)}ms`);
      console.log(`  Min latency: ${min.toFixed(2)}ms`);
      console.log(`  Max latency: ${max.toFixed(2)}ms`);
    }

    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log(`\nFailures: ${failures.length}`);
      failures.forEach(f => console.log(`  ${f.operation}: ${f.error}`));
    }
  }
}

async function loadConfig(): Promise<BenchmarkConfig> {
  // Load .env file if it exists
  try {
    await load({ export: true });
  } catch {
    // .env file doesn't exist or can't be read, continue with environment variables
  }

  const args = parseArgs(Deno.args, {
    string: ["endpoint", "region", "bucket", "access-key-id", "secret-access-key"],
    default: {
      endpoint: Deno.env.get("S3_ENDPOINT") || "https://s3.amazonaws.com",
      region: Deno.env.get("S3_REGION") || "us-east-1",
      bucket: Deno.env.get("S3_BUCKET"),
      "access-key-id": Deno.env.get("S3_ACCESS_KEY_ID"),
      "secret-access-key": Deno.env.get("S3_SECRET_ACCESS_KEY"),
      iterations: 10,
      "object-size": 1024,
    },
  });

  if (!args.bucket) {
    console.error("Error: S3 bucket name is required. Set S3_BUCKET env var or use --bucket flag.");
    Deno.exit(1);
  }

  if (!args["access-key-id"] || !args["secret-access-key"]) {
    console.error("Error: S3 credentials are required. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY env vars or use --access-key-id and --secret-access-key flags.");
    Deno.exit(1);
  }

  return {
    endpoint: args.endpoint,
    region: args.region,
    bucket: args.bucket,
    accessKeyId: args["access-key-id"],
    secretAccessKey: args["secret-access-key"],
    iterations: args.iterations,
    objectSize: args["object-size"],
  };
}

function printUsage(): void {
  console.log(`
S3 Benchmark Tool

Usage:
  deno run --allow-net --allow-env src/main.ts [OPTIONS]

Options:
  --endpoint <url>              S3 endpoint URL (default: https://s3.amazonaws.com)
  --region <region>             S3 region (default: us-east-1)
  --bucket <bucket>             S3 bucket name (required)
  --access-key-id <key>         S3 access key ID (required)
  --secret-access-key <secret>  S3 secret access key (required)
  --iterations <number>         Number of benchmark iterations (default: 10)
  --object-size <bytes>         Size of test objects in bytes (default: 1024)

Environment Variables:
  S3_ENDPOINT          S3 endpoint URL
  S3_REGION            S3 region
  S3_BUCKET            S3 bucket name
  S3_ACCESS_KEY_ID     S3 access key ID
  S3_SECRET_ACCESS_KEY S3 secret access key

Examples:
  # Using environment variables
  export S3_BUCKET=my-test-bucket
  export S3_ACCESS_KEY_ID=your-access-key
  export S3_SECRET_ACCESS_KEY=your-secret-key
  deno run --allow-net --allow-env src/main.ts

  # Using command line arguments
  deno run --allow-net --allow-env src/main.ts \\
    --bucket my-test-bucket \\
    --access-key-id your-access-key \\
    --secret-access-key your-secret-key \\
    --iterations 20 \\
    --object-size 2048
`);
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "h"],
  });

  if (args.help || args.h) {
    printUsage();
    Deno.exit(0);
  }

  try {
    const config = await loadConfig();
    const benchmark = new S3Benchmark(config);
    await benchmark.runBenchmark();
  } catch (error) {
    console.error("Error:", error.message);
    Deno.exit(1);
  }
}