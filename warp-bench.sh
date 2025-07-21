#!/bin/bash

# Warp S3 Benchmark Script
# Reads configuration from .env file and runs warp benchmarks

set -euo pipefail

# Load environment variables from .env file
if [[ -f .env ]]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check required environment variables
if [[ -z "${S3_ENDPOINT:-}" || -z "${S3_BUCKET:-}" || -z "${S3_ACCESS_KEY_ID:-}" || -z "${S3_SECRET_ACCESS_KEY:-}" ]]; then
    echo "Error: Missing required environment variables in .env file"
    echo "Required: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
    exit 1
fi

# Extract hostname from endpoint for warp (it doesn't like full URLs)
WARP_HOST="${S3_ENDPOINT#https://}"
WARP_HOST="${WARP_HOST#http://}"
WARP_HOST="${WARP_HOST%%/*}"

# Set default values
DURATION="${WARP_DURATION:-30s}"
CONCURRENT="${WARP_CONCURRENT:-10}"
SIZE="${WARP_SIZE:-1KiB}"

echo "=================================================="
echo "WARP S3 BENCHMARK"
echo "=================================================="
echo "Endpoint: $S3_ENDPOINT"
echo "Warp Host: $WARP_HOST"
echo "Bucket: $S3_BUCKET"
echo "Duration: $DURATION"
echo "Concurrent: $CONCURRENT"
echo "Object Size: $SIZE"
echo "=================================================="
echo

# Function to run a single warp benchmark
run_warp_benchmark() {
    local operation=$1
    echo "Running warp $operation benchmark..."
    
    # Run warp command and capture output
    local output
    if output=$(mise exec -- warp "$operation" \
        --host="$WARP_HOST" \
        --access-key="$S3_ACCESS_KEY_ID" \
        --secret-key="$S3_SECRET_ACCESS_KEY" \
        --bucket="$S3_BUCKET" \
        --duration="$DURATION" \
        --concurrent="$CONCURRENT" \
        --obj.size="$SIZE" \
        --tls \
        --no-color 2>&1); then
        
        echo "✓ $operation benchmark completed"
        echo "$output" > "warp-${operation}-results.txt"
        
        # Extract key metrics
        local throughput=$(echo "$output" | grep -E "Throughput|MB/s" | tail -1 | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "N/A")
        local avg_latency=$(echo "$output" | grep -E "Average.*ms" | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "N/A")
        local p90_latency=$(echo "$output" | grep -E "90th.*ms" | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "N/A")
        local p99_latency=$(echo "$output" | grep -E "99th.*ms" | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "N/A")
        local operations=$(echo "$output" | grep -E "Operations.*[0-9]+" | grep -oE '[0-9,]+' | tr -d ',' || echo "N/A")
        
        echo "  Throughput: ${throughput} MB/s"
        echo "  Average Latency: ${avg_latency} ms"
        echo "  P90 Latency: ${p90_latency} ms"
        echo "  P99 Latency: ${p99_latency} ms"
        echo "  Operations: ${operations}"
        echo
        
        # Store results in variables for later use
        eval "${operation}_throughput=\"$throughput\""
        eval "${operation}_avg_latency=\"$avg_latency\""
        eval "${operation}_p90_latency=\"$p90_latency\""
        eval "${operation}_p99_latency=\"$p99_latency\""
        eval "${operation}_operations=\"$operations\""
        
    else
        echo "✗ $operation benchmark failed"
        echo "$output"
        echo
        
        # Set error values
        eval "${operation}_throughput=\"Error\""
        eval "${operation}_avg_latency=\"Error\""
        eval "${operation}_p90_latency=\"Error\""
        eval "${operation}_p99_latency=\"Error\""
        eval "${operation}_operations=\"0\""
    fi
}

# Run benchmarks for different operations
operations=("put" "get" "list" "delete")

for op in "${operations[@]}"; do
    run_warp_benchmark "$op"
    sleep 2  # Brief pause between operations
done

# Generate summary
echo "=================================================="
echo "BENCHMARK SUMMARY"
echo "=================================================="
printf "%-10s %-12s %-12s %-12s %-12s %-12s\n" "Operation" "Throughput" "Avg (ms)" "P90 (ms)" "P99 (ms)" "Operations"
echo "------------------------------------------------------------------"

for op in "${operations[@]}"; do
    throughput_var="${op}_throughput"
    avg_var="${op}_avg_latency"
    p90_var="${op}_p90_latency"
    p99_var="${op}_p99_latency"
    ops_var="${op}_operations"
    
    printf "%-10s %-12s %-12s %-12s %-12s %-12s\n" \
        "$(echo ${op} | tr '[:lower:]' '[:upper:]')" \
        "${!throughput_var} MB/s" \
        "${!avg_var}" \
        "${!p90_var}" \
        "${!p99_var}" \
        "${!ops_var}"
done

echo
echo "Raw results saved to warp-*-results.txt files"
echo "=================================================="