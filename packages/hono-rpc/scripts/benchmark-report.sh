#!/bin/bash

# Benchmark Report Script
# Displays progress from benchmarks.json in a readable format

BENCHMARKS_FILE="benchmarks.json"

if [ ! -f "$BENCHMARKS_FILE" ]; then
    echo "Error: $BENCHMARKS_FILE not found"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Type Optimization Progress Report                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Extract data using simple grep/sed (avoiding jq dependency)
CURRENT_PHASE=$(grep -A 1 '"currentPhase"' "$BENCHMARKS_FILE" | tail -1 | sed 's/.*"\(.*\)".*/\1/')
MODULES_DONE=$(grep -A 3 '"progress"' "$BENCHMARKS_FILE" | grep modulesOptimized | sed 's/[^0-9]//g')
MODULES_TOTAL=$(grep -A 3 '"progress"' "$BENCHMARKS_FILE" | grep totalModules | sed 's/[^0-9]//g')
PERCENT_COMPLETE=$(grep -A 3 '"progress"' "$BENCHMARKS_FILE" | grep percentComplete | sed 's/[^0-9]//g')

echo "📊 Overall Progress"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Current Phase:    $CURRENT_PHASE"
echo "Modules Complete: $MODULES_DONE / $MODULES_TOTAL ($PERCENT_COMPLETE%)"
echo ""

echo "🚀 Current Achievements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract current achievements
COMPILE_SPEED=$(grep -A 6 '"achievements"' "$BENCHMARKS_FILE" | grep compilationSpeedImprovement | sed 's/[^0-9]//g')
LINES_ELIM=$(grep -A 6 '"achievements"' "$BENCHMARKS_FILE" | grep linesEliminated | sed 's/[^0-9]//g')
FUNCS_REMOVED=$(grep -A 6 '"achievements"' "$BENCHMARKS_FILE" | grep serializationFunctionsRemoved | sed 's/[^0-9]//g')
ANY_REDUCED=$(grep -A 6 '"achievements"' "$BENCHMARKS_FILE" | grep anyUsageReduced | sed 's/[^0-9]//g')

echo "✅ Compilation Speed:  +${COMPILE_SPEED}% faster"
echo "✅ Lines Eliminated:   ${LINES_ELIM} lines removed"
echo "✅ Serialization Funcs: ${FUNCS_REMOVED} functions removed"
echo "✅ 'any' Usage:        ${ANY_REDUCED} instances reduced"
echo ""

echo "🎯 Projected Final Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract projections
PROJ_COMPILE=$(grep -A 6 '"projectedFinalResults"' "$BENCHMARKS_FILE" | grep compilationSpeedImprovement | sed 's/[^0-9]//g')
PROJ_LINES=$(grep -A 6 '"projectedFinalResults"' "$BENCHMARKS_FILE" | grep linesEliminated | sed 's/[^0-9]//g')
PROJ_FUNCS=$(grep -A 6 '"projectedFinalResults"' "$BENCHMARKS_FILE" | grep serializationFunctionsRemoved | sed 's/[^0-9]//g')

echo "🎯 Compilation Speed:  +${PROJ_COMPILE}% faster (projected)"
echo "🎯 Lines Eliminated:   ${PROJ_LINES} lines (projected)"
echo "🎯 Serialization Funcs: ${PROJ_FUNCS} functions (projected)"
echo ""

echo "📈 Phase Details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Current phase details
WARM_CACHE=$(grep -A 5 '"phase1_partial"' "$BENCHMARKS_FILE" | grep warmCacheSeconds | head -1 | sed 's/[^0-9.]//g')
TYPE_DEFS=$(grep -A 10 '"phase1_partial"' "$BENCHMARKS_FILE" | grep '"typeDefinitions"' | head -1 | sed 's/[^0-9]//g')
SERIALIZE_REMAIN=$(grep -A 10 '"phase1_partial"' "$BENCHMARKS_FILE" | grep '"serializationFunctions"' | head -1 | sed 's/[^0-9]//g')

echo "Phase 1 (Partial - 2/5 modules):"
echo "  ⏱️  Warm cache typecheck: ${WARM_CACHE}s"
echo "  📝 Type definitions:     ${TYPE_DEFS}"
echo "  🔧 Serialization funcs:  ${SERIALIZE_REMAIN} remaining"
echo ""

echo "📚 Optimized Modules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Chats   - 54 lines removed (39% reduction)"
echo "✅ Events  - 32 lines removed (24% reduction)"
echo "⏳ Notes   - Pending"
echo "⏳ Finance - Pending"
echo "⏳ Goals   - Pending"
echo ""

echo "💡 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Complete Notes module (~15 min, ~40-50 lines)"
echo "2. Complete Finance module (~30 min, ~80-100 lines)"
echo "3. Complete Goals module (~10 min, ~30-40 lines)"
echo "4. Re-run benchmarks and update benchmarks.json"
echo ""

echo "📄 Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Benchmark data: $BENCHMARKS_FILE"
echo "Update script:  scripts/benchmark-update.sh"
echo "Full report:    scratchpad/performance-benchmarks.md"
echo ""
