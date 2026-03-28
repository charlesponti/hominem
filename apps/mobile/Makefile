SHELL := /bin/bash

.PHONY: help dev lint format test typecheck check-config verify-eas-preview verify-eas-production

help:
	@echo ""
	@echo "Mobile:"
	@echo "  make dev | lint | format | test | typecheck"
	@echo "  make check-config | verify-eas-preview | verify-eas-production"

dev:
	bun run start

lint:
	bun run lint

format:
	bun run format

test:
	bun run test

typecheck:
	bun run typecheck

check-config:
	bun run check:expo-config

verify-eas-preview:
	bun run verify:eas-env:preview

verify-eas-production:
	bun run verify:eas-env:production
