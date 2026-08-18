#!/usr/bin/env just --justfile

set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments := true

ROOT_DIR := justfile_directory()

mod db 'just/db.just'
mod career 'just/career.just'
mod mcp 'just/mcp.just'
mod mobile 'just/mobile.just'
mod ui 'just/ui.just'
