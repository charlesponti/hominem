# Expo and React Native Makefile

# Variables
EXPO_CLI := npx expo
EAS_CLI := npx eas

# Expo commands
.PHONY: start
start:
	$(EXPO_CLI) start

.PHONY: ios
ios:
	$(EXPO_CLI) run:ios

.PHONY: android
android:
	$(EXPO_CLI) run:android

.PHONY: web
web:
	$(EXPO_CLI) start --web

# Build commands
.PHONY: build-dev
build-dev:
	$(EAS_CLI) build --profile development

.PHONY: build-preview
build-preview:
	$(EAS_CLI) build --profile preview

.PHONY: build-prod
build-prod:
	$(EAS_CLI) build --profile production

# Development commands
.PHONY: prebuild
prebuild:
	cd ios && pod install && cd ..
	$(EXPO_CLI) prebuild

# Dependency management
.PHONY: install
install:
	npm install

.PHONY: update
update:
	npm update

# Clean
.PHONY: clean
clean:
	rm -rf node_modules
	rm -rf ios/Pods
	rm -rf android/app/build

# Help
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  start         - Start Expo development server"
	@echo "  ios           - Run on iOS simulator"
	@echo "  android       - Run on Android emulator"
	@echo "  web           - Run on web browser"
	@echo "  build-dev     - Build for development"
	@echo "  build-preview - Build for preview"
	@echo "  build-prod    - Build for production"
	@echo "  lint          - Run linter"
	@echo "  format        - Format code"
	@echo "  prebuild      - Run Expo prebuild"
	@echo "  install       - Install dependencies"
	@echo "  update        - Update dependencies"
	@echo "  clean         - Clean build artifacts and dependencies"
	@echo "  help          - Show this help message"
