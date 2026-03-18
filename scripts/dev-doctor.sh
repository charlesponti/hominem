#!/usr/bin/env bash
set -euo pipefail

PASS="✅"; WARN="⚠️ "; FAIL="❌"
failures=0; warnings=0

check() {
  local name="$1" required="$2"; shift 2
  local out
  if out=$("$@" 2>&1); then
    local detail
    detail=$(echo "$out" | head -1)
    echo "$PASS $name ($([ "$required" = "1" ] && echo required || echo recommended))"
    echo "   $detail"
  else
    if [ "$required" = "1" ]; then
      echo "$FAIL $name (required)"
      failures=$((failures + 1))
    else
      echo "$WARN $name (recommended)"
      warnings=$((warnings + 1))
    fi
    echo "   command not found or failed"
  fi
}

read_pinned_version() {
  local tool="$1"
  if [ -f ".tool-versions" ]; then
    grep "^${tool} " .tool-versions | awk '{print $2}' | head -1
  fi
}

normalize_version() {
  echo "${1#v}"
}

check_pinned() {
  local name="$1" runtime="$2" pinned="$3"
  if [ -z "$pinned" ]; then
    echo "$FAIL $name (required)"
    echo "   pinned version not found in .tool-versions/.node-version"
    failures=$((failures + 1))
    return
  fi
  local r p
  r=$(normalize_version "$runtime")
  p=$(normalize_version "$pinned")
  if [ "$r" = "$p" ] || [[ "$r" == "$p".* ]]; then
    echo "$PASS $name (required)"
    echo "   runtime $r matches pinned $p"
  else
    echo "$FAIL $name (required)"
    echo "   runtime $r does not match pinned $p"
    failures=$((failures + 1))
  fi
}

echo ""
echo "Hominem Developer Environment Doctor"
echo "-------------------------------------"

bun_version=$(bun --version 2>/dev/null || true)
node_version=$(node --version 2>/dev/null | tr -d 'v' || true)
pinned_bun=$(read_pinned_version bun)
pinned_node=$(read_pinned_version node)
[ -z "$pinned_node" ] && [ -f ".node-version" ] && pinned_node=$(cat .node-version)

check "Bun"            1 bun --version
check "Node.js"        1 node --version
[ -n "$bun_version" ]  && check_pinned "Pinned Bun version"    "$bun_version"  "$pinned_bun"
[ -n "$node_version" ] && check_pinned "Pinned Node.js version" "$node_version" "$pinned_node"
check "Git"            1 git --version
check "TypeScript CLI" 1 bunx tsc --version
check "Watchman"       0 watchman --version

if [[ "$(uname)" == "Darwin" ]] && [ -d "apps/mobile" ]; then
  check "Xcode"                    1 xcodebuild -version
  check "Xcode Command Line Tools" 1 xcode-select -p
  check "CocoaPods"                0 pod --version
  check "Java (Android toolchain)" 0 java -version
  check "ADB"                      0 adb version
fi

echo ""
echo "Result"
echo "------"
if [ "$failures" -gt 0 ]; then
  echo "$FAIL $failures required checks failed"
  exit 1
elif [ "$warnings" -gt 0 ]; then
  echo "$PASS Required checks passed ($warnings recommendations to review)"
else
  echo "$PASS All checks passed"
fi
