# Security Policy

## Supported Versions

We actively maintain and provide security patches for the versions listed below. If you are running an unsupported version, please upgrade to the latest release before reporting an issue.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

We take the security of our templates and infrastructure code seriously. If you identify a security vulnerability or sensitive information exposure, please report it responsibly.

### How to Report
- **Do not** file a public GitHub issue, discussion, or pull request.
- Submit a private report via **[GitHub Private Vulnerability Reporting](https://github.com/donny-devops/cloudflare-workers-templates/security/advisories/new)** (preferred).
- Alternatively, email vulnerability details directly to **security@pipefish.io** with the subject line `[SECURITY] Cloudflare Workers Templates Vulnerability`.

### What to Include
To help us triage and validate your finding quickly, please include:
- A clear description of the vulnerability and its potential impact.
- Affected template(s), file paths, or deployment targets.
- Step-by-step reproduction steps or a minimal proof-of-concept (PoC).
- Any proposed remediation, patch, or mitigation steps.

---

## Response Timeline & Expectations

* **Initial Response:** Within 48 hours acknowledging receipt of the report.
* **Triage & Assessment:** Within 5 business days detailing reproduction status and severity classification.
* **Resolution & Disclosure:** We aim to release a patched version within 14 days of triage. Coordinated public disclosure will be arranged once fixes are published.

---

## Scope & Guidelines

* **In Scope:**
  * Secrets or API key leakage in template defaults or CI/CD pipelines.
  * Insecure header configurations, permissive CORS policies, or missing authentication middleware in templates.
  * Insecure bindings (KV, D1, R2, Queues, Vectorize) vulnerable to injection or unauthorized access.

* **Out of Scope:**
  * Theoretical attacks without a viable exploit path.
  * Issues stemming from third-party Cloudflare platform outages or zero-days beyond worker script control.
  * Automated scanner dumps without manual verification.
