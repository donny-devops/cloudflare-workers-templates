# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `GET /health` JSON endpoint (`status`, `service`, `timestamp`)
- Worker `scheduled()` handler plus daily cron trigger `0 0 * * *` in `wrangler.jsonc`
- release-please workflow and `0.1.0` version manifest (`package.json`, `.release-please-manifest.json`)
- Docker multi-stage build (`Dockerfile`) and `.dockerignore`
- GitHub Actions workflow for Docker image build and publish to GHCR (`docker-publish.yml`)
- SLSA provenance attestation for container images
- Issue templates (bug report, feature request) and PR template
- Community health files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `LICENSE`, `CODEOWNERS`

### Security

- Upgraded `vitest` from 4.1.10 to 4.1.11 — fixes path traversal / arbitrary file read via `@vitest/mocker` redirect mock
- Overrode transitive `sharp` dependency from 0.35.2 to 0.35.4 — fixes critical libheif RCE vulnerabilities (CVE-2026-84383, GHSA-2jg2-4ch7-h545)

### Fixed

- Switched Dockerfile base image from `node:20-alpine` to `node:20-slim` for glibc compatibility with `workerd` and `sharp` native binaries
