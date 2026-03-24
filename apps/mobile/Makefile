EAS  := eas
EXPO := bunx expo

# Defaults for parameterized commands
CHANNEL ?= preview
ROLLOUT ?= 10

# ─── Primary Commands ─────────────────────────────────────────────────────────

## Start local iOS dev server
.PHONY: dev
dev: _prebuild-dev
	bash scripts/run-variant.sh dev $(EXPO) run:ios

## Build the iOS app locally (for testing builds without EAS)
.PHONY: build-local
build-local: _prebuild-dev
	xcodebuild -workspace ios/HakumiDev.xcworkspace -scheme HakumiDev -configuration Debug -destination 'generic/platform=iOS Simulator' -quiet build

## Run unit + integration tests
.PHONY: test
test:
	bunx vitest run --config vitest.config.ts \
		tests/auth-state-machine.test.ts \
		tests/auth-provider-utils.test.ts \
		tests/auth-route-guard.test.ts \
		tests/startup-metrics.test.ts \
		tests/auth-validation.test.ts \
		tests/auth-boot.test.ts \
		tests/integration/auth-contract.integration.test.ts \
		tests/integration/auth-flow.integration.test.ts

## Build preview → auto-submit to TestFlight. Use SIM=1 for simulator.
.PHONY: preview
preview: _preflight-preview
ifdef SIM
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) build --profile preview-simulator --platform ios --non-interactive
else
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) build --profile preview --platform ios --non-interactive --auto-submit
endif

.PHONY: preview-interactive
preview-interactive:
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) build --profile preview --platform ios --auto-submit

## Push OTA update. Defaults: CHANNEL=preview ROLLOUT=10
## Examples: make update ROLLOUT=100   make update CHANNEL=production
.PHONY: update
update: _preflight-$(CHANNEL)
	APP_VARIANT=$(CHANNEL) EXPO_NO_DOTENV=1 $(EAS) update \
		--platform ios --branch $(CHANNEL) --clear-cache \
		--environment $(CHANNEL) --rollout-percentage $(ROLLOUT)

## Revert the latest preview OTA update
.PHONY: rollback
rollback:
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) update:revert-update-rollout --branch preview

## Build production → auto-submit to TestFlight
.PHONY: release
release: _preflight-production
	APP_VARIANT=production EXPO_NO_DOTENV=1 $(EAS) build \
		--profile production --platform ios --non-interactive --auto-submit

# ─── Internal / CI ────────────────────────────────────────────────────────────

.PHONY: _prebuild-dev
_prebuild-dev:
	bash scripts/ensure-ios-variant.sh dev

.PHONY: _prebuild-e2e
_prebuild-e2e:
	bash scripts/ensure-ios-variant.sh e2e

.PHONY: _preflight-dev
_preflight-dev:
	bash scripts/preflight.sh dev

.PHONY: _preflight-preview
_preflight-preview:
	bash scripts/preflight.sh preview

.PHONY: _preflight-production
_preflight-production:
	bash scripts/preflight.sh production

## EAS dev client build (CI / device provisioning)
.PHONY: build-dev
build-dev: _preflight-dev
	$(EAS) build --profile development --platform ios --non-interactive

## EAS e2e simulator build (CI)
.PHONY: build-e2e
build-e2e: _preflight-dev
	$(EAS) build --profile e2e --platform ios --non-interactive

# ─── Help ─────────────────────────────────────────────────────────────────────

.PHONY: help
help:
	@echo ""
	@echo "Primary commands:"
	@echo "  make dev                           Start local iOS dev"
	@echo "  make test                          Run unit + integration tests"
	@echo "  make preview                       Build preview → TestFlight"
	@echo "  make preview SIM=1                 Build preview for simulator"
	@echo "  make update                        OTA update (preview, 10% rollout)"
	@echo "  make update ROLLOUT=50             OTA update at 50% rollout"
	@echo "  make update ROLLOUT=100            OTA update at 100% rollout"
	@echo "  make update CHANNEL=production     OTA update to production"
	@echo "  make rollback                      Revert latest preview OTA"
	@echo "  make release                       Build production → TestFlight"
	@echo ""
	@echo "CI / internal:"
	@echo "  make build-dev                     EAS dev client build"
	@echo "  make build-e2e                     EAS e2e simulator build"
	@echo ""
