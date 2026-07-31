#!/usr/bin/env just --justfile

set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments := true

ROOT_DIR := justfile_directory()

mod db 'just/db.just'
mod mcp 'just/mcp.just'
mod mobile 'just/mobile.just'
