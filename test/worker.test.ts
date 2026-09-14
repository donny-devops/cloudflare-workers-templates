import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Worker HTTP API", () => {
	it("returns 404 for unknown routes", async () => {
		const response = await SELF.fetch("https://example.com/nope");
		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toMatchObject({ error: "Not Found" });
	});

	it("rejects non-POST methods on start", async () => {
		const response = await SELF.fetch("https://example.com/api/workflow/start");
		expect(response.status).toBe(405);
		expect(response.headers.get("Allow")).toBe("POST");
	});

	it("starts a workflow instance", async () => {
		const response = await SELF.fetch("https://example.com/api/workflow/start", {
			method: "POST",
		});
		expect(response.status).toBe(200);
		const body = (await response.json()) as { instanceId: string };
		expect(body.instanceId).toEqual(expect.any(String));
		expect(body.instanceId.length).toBeGreaterThan(0);
	});

	it("requires a valid instance id for status", async () => {
		const missing = await SELF.fetch("https://example.com/api/workflow/status/");
		expect(missing.status).toBe(400);

		const nested = await SELF.fetch(
			"https://example.com/api/workflow/status/foo/bar",
		);
		expect(nested.status).toBe(400);

		const post = await SELF.fetch(
			"https://example.com/api/workflow/status/abc-123",
			{ method: "POST" },
		);
		expect(post.status).toBe(405);
	});

	it("rejects invalid approval events", async () => {
		const invalidJson = await SELF.fetch(
			"https://example.com/api/workflow/event/abc-123",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "not-json",
			},
		);
		expect(invalidJson.status).toBe(400);

		const missingApproved = await SELF.fetch(
			"https://example.com/api/workflow/event/abc-123",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ comment: "nope" }),
			},
		);
		expect(missingApproved.status).toBe(400);
		await expect(missingApproved.json()).resolves.toMatchObject({
			error: "approved must be a boolean",
		});
	});

	it("requires a valid instanceId before upgrading websockets", async () => {
		const missing = await SELF.fetch("https://example.com/ws");
		expect(missing.status).toBe(400);

		const unsafe = await SELF.fetch(
			"https://example.com/ws?instanceId=../etc/passwd",
		);
		expect(unsafe.status).toBe(400);

		const noUpgrade = await SELF.fetch(
			"https://example.com/ws?instanceId=abc-123",
		);
		expect(noUpgrade.status).toBe(426);
	});
});
