ROOT := ../..

CHANNEL ?= preview
ROLLOUT ?= 10

.PHONY: dev test build-local preview preview-local-archive preview-auto update rollback release build-dev build-e2e help

dev:
	$(MAKE) -C $(ROOT) mobile-dev

test:
	$(MAKE) -C $(ROOT) mobile-test

build-local:
	$(MAKE) -C $(ROOT) mobile-build-local

preview:
	$(MAKE) -C $(ROOT) mobile-preview

preview-local-archive:
	$(MAKE) -C $(ROOT) mobile-preview-local-archive

preview-auto:
	$(MAKE) -C $(ROOT) mobile-preview-auto SIM=$(SIM)

update:
	$(MAKE) -C $(ROOT) mobile-update CHANNEL=$(CHANNEL) ROLLOUT=$(ROLLOUT)

rollback:
	$(MAKE) -C $(ROOT) mobile-rollback

release:
	$(MAKE) -C $(ROOT) mobile-release

build-dev:
	$(MAKE) -C $(ROOT) mobile-build-dev

build-e2e:
	$(MAKE) -C $(ROOT) mobile-build-e2e

help:
	$(MAKE) -C $(ROOT) mobile-help
