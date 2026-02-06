#!/bin/bash

# Benchmark Update Script
# Updates benchmarks.json with current metrics

set -e

BENCHMARKS_FILE="benchmarks.json"
TIMESTAMP=$(date -u +"%Y-%m-%d")

echo "=== Collecting Current Metrics ==="
echo ""

# TypeScript compilation benchmarks
echo "Running TypeScript compilation benchmarks..."
echo "- Cold cache run..."
rm -rf node_modules/.cache/tsc/.tsbuildinfo 2>/dev/null || true
COLD_TIME=$( { time npm run typecheck 2>&1 > /dev/null; } 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' )

echo "- Warm cache run 1..."
WARM_TIME_1=$( { time npm run typecheck 2>&1 > /dev/null; } 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' )

echo "- Warm cache run 2..."
WARM_TIME_2=$( { time npm run typecheck 2>&1 > /dev/null; } 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' )

echo "- Warm cache run 3..."
WARM_TIME_3=$( { time npm run typecheck 2>&1 > /dev/null; } 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g' )

WARM_AVG=$(echo "scale=3; ($WARM_TIME_1 + $WARM_TIME_2 + $WARM_TIME_3) / 3" | bc)

echo ""
echo "Compilation times:"
echo "  Cold cache: ${COLD_TIME}s"
echo "  Warm cache: ${WARM_AVG}s (avg of 3 runs)"

# Code metrics
echo ""
echo "Collecting code metrics..."
TYPE_FILES=$(find src/types -name "*.ts" | wc -l | xargs)
TYPE_LINES=$(find src/types -name "*.ts" -exec cat {} + | wc -l | xargs)
TYPE_BYTES=$(find src/types -name "*.ts" -exec cat {} + | wc -c | xargs)
TYPE_DEFS=$(grep -r "^export type " src/types/*.ts 2>/dev/null | wc -l | xargs)
SERIALIZE_FUNCS=$(grep -r "function serialize" src/routes/*.ts 2>/dev/null | wc -l | xargs)
ANY_USAGE=$(grep -rn ": any" src/routes/{chats,messages,events}.ts 2>/dev/null | wc -l | xargs)
DB_IMPORTS=$(grep -r "from '@hominem/db" src/types/*.ts 2>/dev/null | wc -l | xargs)

echo "  Type files: $TYPE_FILES"
echo "  Type lines: $TYPE_LINES"
echo "  Type bytes: $TYPE_BYTES"
echo "  Type definitions: $TYPE_DEFS"
echo "  Serialization functions: $SERIALIZE_FUNCS"
echo "  'any' usage (optimized routes): $ANY_USAGE"
echo "  Database imports: $DB_IMPORTS"

# TypeScript diagnostics
echo ""
echo "Running TypeScript diagnostics..."
TS_DIAGNOSTICS=$(npx tsc --noEmit --extendedDiagnostics 2>&1 | grep -E "Files:|Identifiers:|Symbols:|Types:|Instantiations:")
TS_FILES=$(echo "$TS_DIAGNOSTICS" | grep "Files:" | awk '{print $2}')
TS_IDENTS=$(echo "$TS_DIAGNOSTICS" | grep "Identifiers:" | awk '{print $2}')
TS_SYMBOLS=$(echo "$TS_DIAGNOSTICS" | grep "Symbols:" | awk '{print $2}')
TS_TYPES=$(echo "$TS_DIAGNOSTICS" | grep "Types:" | awk '{print $2}')
TS_INST=$(echo "$TS_DIAGNOSTICS" | grep "Instantiations:" | awk '{print $2}')

echo "  Files: $TS_FILES"
echo "  Identifiers: $TS_IDENTS"
echo "  Symbols: $TS_SYMBOLS"
echo "  Types: $TS_TYPES"
echo "  Instantiations: $TS_INST"

echo ""
echo "=== Metrics Collection Complete ==="
echo ""
echo "To update benchmarks.json, use the collected values above."
echo "Manual update recommended to preserve phase history and context."
