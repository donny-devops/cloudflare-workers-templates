import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { hmacSha256Hex } from "../worker/lib/hmac";
import { scanForSecrets } from "../worker/lib/secrets";

describe("operability endpoints", () => {
	it("returns health with request tracing", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("x-request-id")).toBeTruthy();

		const body = (await response.json()) as {
			status: string;
			service: string;
			checks: Record<string, string>;
		};
		expect(body.status).toBe("ok");
		expect(body.service).toBe("cloudflare-workers-templates");
		expect(body.checks.inbox).toBe("ok");
	});

	it("exposes a status snapshot without secret values", async () => {
		const response = await SELF.fetch("https://example.com/api/status");
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			bindings: Record<string, boolean>;
		};
		expect(body.bindings.inbox).toBe(true);
		expect(JSON.stringify(body)).not.toMatch(/WEBHOOK_SECRET|MAILHOOK_TOKEN/);
	});

	it("rejects unsigned webhooks until signing is configured", async () => {
		const response = await SELF.fetch("https://example.com/webhooks/github", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ ok: true }),
		});
		expect(response.status).toBe(503);
	});

	it("rejects mailhooks without a bearer token", async () => {
		const response = await SELF.fetch("https://example.com/mailhooks", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ from: "ops@example.com", subject: "hello" }),
		});
		expect(response.status).toBe(503);
	});

	it("lists MCP tools over JSON-RPC", async () => {
		const response = await SELF.fetch("https://example.com/mcp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "tools/list",
			}),
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			result: { tools: Array<{ name: string }> };
		};
		const names = body.result.tools.map((tool) => tool.name);
		expect(names).toEqual(
			expect.arrayContaining([
				"status_check",
				"scan_secrets",
				"list_inbox",
				"start_workflow",
			]),
		);
	});
});

describe("secret scanner", () => {
	it("redacts credential-shaped values and ignores normal text", () => {
		const aws = `AKIA${"TESTKEYFAKE00000"}`;
		const github = `ghp_${"x".repeat(36)}`;
		const findings = scanForSecrets(
			`deploy user=${aws} token=${github} hello world`,
		);
		expect(findings.map((finding) => finding.kind)).toEqual([
			"aws-access-key",
			"github-token",
		]);
		expect(findings.every((finding) => finding.redacted.includes("…"))).toBe(
			true,
		);
		expect(scanForSecrets("status check passed")).toEqual([]);
	});
});

describe("hmac helpers", () => {
	it("verifies a sha256 hex digest", async () => {
		const digest = await hmacSha256Hex("unit-test-secret", "{\"ok\":true}");
		expect(digest).toHaveLength(64);
		expect(digest).toMatch(/^[a-f0-9]+$/);
	});
});
