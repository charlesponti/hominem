EAS := eas
EXPO := expo

# ─── Preflight ────────────────────────────────────────────────────────────────

.PHONY: preflight-dev
preflight-dev:
	bash scripts/validate-eas-profile.sh
	bash scripts/verify-expo-config.sh

.PHONY: preflight-preview
preflight-preview:
	bash scripts/validate-eas-profile.sh
	bash scripts/verify-expo-config.sh
	$(EAS) env:exec preview 'bash scripts/verify-release-env.sh preview'

.PHONY: preflight-production
preflight-production:
	bash scripts/validate-eas-profile.sh
	bash scripts/verify-expo-config.sh
	$(EAS) env:exec production 'bash scripts/verify-release-env.sh production'

# ─── Builds ───────────────────────────────────────────────────────────────────

.PHONY: build-dev
build-dev: preflight-dev
	$(EAS) build --profile development --platform ios --non-interactive

.PHONY: build-e2e
build-e2e: preflight-dev
	$(EAS) build --profile e2e --platform ios --non-interactive

.PHONY: build-preview
build-preview: preflight-preview
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) build --profile preview --platform ios --non-interactive

.PHONY: build-preview-simulator
build-preview-simulator: preflight-preview
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) build --profile preview-simulator --platform ios --non-interactive

.PHONY: build-production
build-production: preflight-production
	APP_VARIANT=production EXPO_NO_DOTENV=1 $(EAS) build --profile production --platform ios --non-interactive

# ─── OTA Updates ──────────────────────────────────────────────────────────────

.PHONY: update-preview
update-preview: preflight-preview
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) update \
		--platform ios --branch preview --clear-cache \
		--environment preview --rollout-percentage 10

.PHONY: update-preview-50
update-preview-50:
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) update \
		--platform ios --branch preview \
		--environment preview --rollout-percentage 50

.PHONY: update-preview-100
update-preview-100:
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) update \
		--platform ios --branch preview \
		--environment preview --rollout-percentage 100

.PHONY: update-preview-rollback
update-preview-rollback:
	APP_VARIANT=preview EXPO_NO_DOTENV=1 $(EAS) update:revert-update-rollout --branch preview

.PHONY: update-production
update-production: preflight-production
	APP_VARIANT=production EXPO_NO_DOTENV=1 $(EAS) update \
		--platform ios --branch production --clear-cache \
		--environment production

# ─── Local Dev ────────────────────────────────────────────────────────────────

.PHONY: prebuild-dev
prebuild-dev:
	bash scripts/ensure-ios-variant.sh dev

.PHONY: prebuild-e2e
prebuild-e2e:
	bash scripts/ensure-ios-variant.sh e2e

.PHONY: ios
ios: prebuild-dev
	bash scripts/run-variant.sh dev $(EXPO) run:ios

# ─── Help ─────────────────────────────────────────────────────────────────────

.PHONY: help
help:
	@echo "Preflight:              preflight-dev | preflight-preview | preflight-production"
	@echo "Builds:                 build-dev | build-e2e | build-preview | build-preview-simulator | build-production"
	@echo "OTA updates (preview):  update-preview | update-preview-50 | update-preview-100 | update-preview-rollback"
	@echo "OTA updates (prod):     update-production"
	@echo "Local dev:              ios | prebuild-dev | prebuild-e2e"
