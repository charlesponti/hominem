SHELL := /bin/bash

.PHONY: help build typecheck codegen goose-up goose-down goose-status goose-v1-up goose-v1-down goose-v1-status

help:
	@echo ""
	@echo "Database:"
	@echo "  make build | typecheck | codegen"
	@echo "  make goose-up | goose-down | goose-status"
	@echo "  make goose-v1-up | goose-v1-down | goose-v1-status"

build:
	bun run build

typecheck:
	bun run typecheck

codegen:
	bun run kysely-codegen

goose-up:
	bun run goose:up

goose-down:
	bun run goose:down

goose-status:
	bun run goose:status

goose-v1-up:
	bun run goose:v1:up

goose-v1-down:
	bun run goose:v1:down

goose-v1-status:
	bun run goose:v1:status
