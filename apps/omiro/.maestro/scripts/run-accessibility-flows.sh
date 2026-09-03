#!/usr/bin/env bash
# Toggles iOS Simulator accessibility settings around the two accessibility
# Maestro flows, then restores the previous state. Reduce Motion and
# Dynamic Type aren't Maestro flow commands -- Maestro drives the app's UI,
# not the simulator's system settings -- so they have to be set via
# `simctl` before the app launches.
#
# `content_size` is a documented `simctl ui` subcommand (Xcode 14+).
# ReduceMotionEnabled is not: it's a `defaults write` on the simulator's
# preference domain, which is a commonly used but Apple-undocumented
# technique -- if it stops working on a future Xcode/simulator runtime,
# verify Reduce Motion actually took effect (e.g. via the Settings app)
# before trusting chat-reduce-motion.yaml's result.
#
# Usage: ./run-accessibility-flows.sh [device-udid-or-booted]
set -euo pipefail

# Maestro CLI + the Java 17 it needs are not on a default PATH.
export PATH="$HOME/.maestro/bin:/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export MAESTRO_CLI_NO_ANALYTICS=true
export MAESTRO_DISABLE_UPDATE_CHECK=true

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DEVICE="${1:-booted}"

echo "== Reduce Motion: chat-reduce-motion.yaml =="
xcrun simctl spawn "$DEVICE" defaults write com.apple.Accessibility ReduceMotionEnabled -bool true
trap 'xcrun simctl spawn "$DEVICE" defaults write com.apple.Accessibility ReduceMotionEnabled -bool false' EXIT
maestro test chat-reduce-motion.yaml
xcrun simctl spawn "$DEVICE" defaults write com.apple.Accessibility ReduceMotionEnabled -bool false
trap - EXIT

echo "== Dynamic Type (accessibility XXXL): chat-dynamic-type.yaml =="
xcrun simctl ui "$DEVICE" content_size extra-extra-extra-large
trap 'xcrun simctl ui "$DEVICE" content_size large' EXIT
maestro test chat-dynamic-type.yaml
xcrun simctl ui "$DEVICE" content_size large
trap - EXIT
