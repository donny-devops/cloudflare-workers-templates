# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-09-21)


### Features

* add Google Analytics 4 tracking (G-NTNJ73LVX1) ([3b5652d](https://github.com/donny-devops/cloudflare-workers-templates/commit/3b5652db33812ae503bdf6403ec05fb73573e7b2))
* add semantic release, health endpoint, and cron trigger ([97c78df](https://github.com/donny-devops/cloudflare-workers-templates/commit/97c78df5b5a3d1837d537b008f163f0e9716739b))


### Bug Fixes

* **ci:** switch Dockerfile to node:20-slim for glibc compatibility ([0c02f50](https://github.com/donny-devops/cloudflare-workers-templates/commit/0c02f5073409dfbea64a48dcfdb46daa52c6880c))
* **security:** override sharp to 0.35.4 to patch libheif RCE vulnerabilities ([ca96fc5](https://github.com/donny-devops/cloudflare-workers-templates/commit/ca96fc54aa2d66fb4a54bc6d86c799a33962f205))
* **security:** upgrade vitest 4.1.10 -&gt; 4.1.11 to patch path traversal vulnerability ([50b420d](https://github.com/donny-devops/cloudflare-workers-templates/commit/50b420d564d6c8c8355d2acaa09942663358347c))
* surface workflow errors and harden the demo API ([#1](https://github.com/donny-devops/cloudflare-workers-templates/issues/1)) ([0f64a11](https://github.com/donny-devops/cloudflare-workers-templates/commit/0f64a11a08c9b49030031feddce4bc6fa41e19ed))

## [Unreleased]

### Added

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
