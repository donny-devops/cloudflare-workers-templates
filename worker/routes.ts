import type { WorkerEnv } from "./bindings";
import { json } from "./lib/json";
import { hmacSha256Hex, readWebhookSignature, timingSafeEqualHex } from "./lib/hmac";
import {
	MAX_INGRESS_BYTES,
	MAX_SCAN_BYTES,
} from "./lib/constants";
import { handleMcp } from "./lib/mcp";
import {
	healthResponse,
	inboxStub,
	recordInboxEvent,
	serviceName,
	serviceVersion,
} from "./lib/ops";
import { scanForSecrets, summarizeFindings } from "./lib/secrets";

const SOURCE_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export async function handleRequest(
	request: Request,
	env: WorkerEnv,
	_ctx: ExecutionContext,
	requestId: string,
): Promise<Response> {
	const url = new URL(request.url);

	if (url.pathname === "/health") {
		return health(env, requestId);
	}

	if (url.pathname === "/api/status" && request.method === "GET") {
		return status(env, requestId);
	}

	if (url.pathname === "/api/events" && request.method === "GET") {
		return events(env, url);
	}

	if (url.pathname === "/api/scan" && request.method === "POST") {
		return scan(request, env);
	}

	if (url.pathname === "/mcp" || url.pathname === "/.well-known/mcp.json") {
		if (url.pathname === "/.well-known/mcp.json" && request.method === "GET") {
			return json({
				name: serviceName(env),
				version: serviceVersion(env),
				endpoint: "/mcp",
				transport: "json-rpc",
			});
		}
		return handleMcp(request, env, requestId);
	}

	if (url.pathname === "/webhooks" && request.method === "GET") {
		return json({
			message: "POST a HMAC-SHA256 signed payload to /webhooks/:source",
			headers: ["X-Webhook-Signature: sha256=<hex>", "X-Hub-Signature-256"],
		});
	}

	if (url.pathname.startsWith("/webhooks/") && request.method === "POST") {
		return webhook(request, env, url.pathname.slice("/webhooks/".length));
	}

	if (url.pathname === "/mailhooks" && request.method === "POST") {
		return mailhook(request, env);
	}

	if (url.pathname === "/api/workflow/start" && request.method === "POST") {
		return startWorkflow(env);
	}

	if (url.pathname.startsWith("/api/workflow/status/")) {
		return workflowStatus(env, url.pathname.split("/").pop());
	}

	if (
		url.pathname.startsWith("/api/workflow/event/") &&
		request.method === "POST"
	) {
		return workflowEvent(request, env, url.pathname.split("/").pop());
	}

	if (url.pathname === "/ws") {
		return websocket(request, env, url);
	}

	return json({ error: "Not Found", requestId }, 404);
}

async function health(env: WorkerEnv, requestId: string): Promise<Response> {
	try {
		await inboxStub(env).stats();
		return healthResponse(env, requestId, true);
	} catch {
		return healthResponse(env, requestId, false);
	}
}

async function status(env: WorkerEnv, requestId: string): Promise<Response> {
	let inbox = null;
	try {
		inbox = await inboxStub(env).stats();
	} catch {
		inbox = { error: "unavailable" };
	}

	return json({
		service: serviceName(env),
		version: serviceVersion(env),
		requestId,
		time: new Date().toISOString(),
		bindings: {
			workflow: Boolean(env.MY_WORKFLOW),
			workflowStatus: Boolean(env.WORKFLOW_STATUS),
			inbox: Boolean(env.INBOX),
			webhookSigning: Boolean(env.WEBHOOK_SECRET),
			mailhookAuth: Boolean(env.MAILHOOK_TOKEN),
		},
		inbox,
	});
}

async function events(env: WorkerEnv, url: URL): Promise<Response> {
	const limit = Number(url.searchParams.get("limit") ?? "25");
	try {
		return json({ events: await inboxStub(env).list(Number.isFinite(limit) ? limit : 25) });
	} catch {
		return json({ error: "Inbox unavailable" }, 503);
	}
}

async function scan(request: Request, env: WorkerEnv): Promise<Response> {
	const raw = await readLimitedBody(request, MAX_SCAN_BYTES);
	if (raw === null) {
		return json({ error: "Payload too large" }, 413);
	}

	let text = raw;
	try {
		const parsed = JSON.parse(raw) as { text?: unknown };
		if (typeof parsed.text === "string") {
			text = parsed.text;
		}
	} catch {
		// Treat as raw text.
	}

	const findings = scanForSecrets(text);
	await recordInboxEvent(env, {
		kind: "scan",
		source: "api",
		bytes: text.length,
		secretFindings: findings.length,
		secretKinds: summarizeFindings(findings).kinds,
		redactedPreview: findings
			.map((finding) => `${finding.label}:${finding.redacted}`)
			.join(", ")
			.slice(0, 180),
	});

	return json({
		findings,
		count: findings.length,
		stored: false,
		note: "Raw input is scanned in memory and never persisted.",
	});
}

async function webhook(
	request: Request,
	env: WorkerEnv,
	source: string,
): Promise<Response> {
	if (!SOURCE_PATTERN.test(source)) {
		return json({ error: "Invalid webhook source" }, 400);
	}

	const secret = env.WEBHOOK_SECRET;
	if (!secret) {
		return json(
			{ error: "Webhook signing is not configured", hint: "Set WEBHOOK_SECRET" },
			503,
		);
	}

	const raw = await readLimitedBody(request, MAX_INGRESS_BYTES);
	if (raw === null) {
		return json({ error: "Payload too large" }, 413);
	}

	const provided = readWebhookSignature(request);
	if (!provided) {
		return json({ error: "Missing webhook signature" }, 401);
	}

	const expected = await hmacSha256Hex(secret, raw);
	if (!timingSafeEqualHex(provided, expected)) {
		return json({ error: "Invalid webhook signature" }, 401);
	}

	if (!(await inboxStub(env).allow(`webhook:${source}`))) {
		return json({ error: "Rate limit exceeded" }, 429);
	}

	const findings = scanForSecrets(raw);
	const event = await recordInboxEvent(env, {
		kind: "webhook",
		source,
		bytes: raw.length,
		secretFindings: findings.length,
		secretKinds: summarizeFindings(findings).kinds,
		redactedPreview: redactPreview(raw, findings.length),
	});

	return json({
		accepted: true,
		id: event.id,
		secretFindings: findings.length,
		blocked: findings.length > 0,
	}, findings.length > 0 ? 202 : 200);
}

async function mailhook(request: Request, env: WorkerEnv): Promise<Response> {
	const token = env.MAILHOOK_TOKEN;
	if (!token) {
		return json(
			{ error: "Mailhook auth is not configured", hint: "Set MAILHOOK_TOKEN" },
			503,
		);
	}

	const provided =
		bearerToken(request.headers.get("authorization")) ??
		request.headers.get("x-mailhook-token");
	const providedHex = provided ? await sha256Hex(provided) : "";
	const expectedHex = await sha256Hex(token);
	if (!provided || !timingSafeEqualHex(providedHex, expectedHex)) {
		return json({ error: "Invalid mailhook token" }, 401);
	}

	const raw = await readLimitedBody(request, MAX_INGRESS_BYTES);
	if (raw === null) {
		return json({ error: "Payload too large" }, 413);
	}

	if (!(await inboxStub(env).allow("mailhook:http"))) {
		return json({ error: "Rate limit exceeded" }, 429);
	}

	let from = "unknown";
	let subject = "";
	try {
		const parsed = JSON.parse(raw) as { from?: unknown; subject?: unknown };
		if (typeof parsed.from === "string") from = parsed.from;
		if (typeof parsed.subject === "string") subject = parsed.subject;
	} catch {
		// Keep defaults for non-JSON payloads.
	}

	const findings = scanForSecrets(raw);
	const event = await recordInboxEvent(env, {
		kind: "mailhook",
		source: from,
		bytes: raw.length,
		secretFindings: findings.length,
		secretKinds: summarizeFindings(findings).kinds,
		redactedPreview: redactPreview(subject || raw, findings.length),
	});

	return json({
		accepted: true,
		id: event.id,
		secretFindings: findings.length,
	});
}

async function startWorkflow(env: WorkerEnv): Promise<Response> {
	try {
		const instance = await env.MY_WORKFLOW.create({
			params: { timestamp: Date.now() },
		});
		return json({
			instanceId: instance.id,
			message: "Workflow started successfully",
		});
	} catch {
		return json({ error: "Failed to start workflow" }, 500);
	}
}

async function workflowStatus(
	env: WorkerEnv,
	instanceId: string | undefined,
): Promise<Response> {
	if (!instanceId) {
		return json({ error: "Instance ID required" }, 400);
	}

	try {
		const instance = await env.MY_WORKFLOW.get(instanceId);
		return json(await instance.status());
	} catch {
		return json({ error: "Failed to get workflow status" }, 500);
	}
}

async function workflowEvent(
	request: Request,
	env: WorkerEnv,
	instanceId: string | undefined,
): Promise<Response> {
	if (!instanceId) {
		return json({ error: "Instance ID required" }, 400);
	}

	try {
		const body = (await request.json()) as {
			approved: boolean;
			comment?: string;
		};
		const instance = await env.MY_WORKFLOW.get(instanceId);
		await instance.sendEvent({
			type: "user-approval",
			payload: body,
		});
		return json({ success: true, message: "Event sent successfully" });
	} catch {
		return json({ error: "Failed to send event" }, 500);
	}
}

async function websocket(
	request: Request,
	env: WorkerEnv,
	url: URL,
): Promise<Response> {
	const instanceId = url.searchParams.get("instanceId");
	if (!instanceId) {
		return new Response("instanceId query parameter required", { status: 400 });
	}

	if (request.headers.get("Upgrade") !== "websocket") {
		return new Response("Expected Upgrade: websocket", { status: 426 });
	}

	try {
		const doId = env.WORKFLOW_STATUS.idFromName(instanceId);
		return env.WORKFLOW_STATUS.get(doId).fetch(request);
	} catch {
		return new Response("Failed to establish WebSocket connection", {
			status: 500,
		});
	}
}

async function readLimitedBody(
	request: Request,
	maxBytes: number,
): Promise<string | null> {
	const lengthHeader = request.headers.get("content-length");
	if (lengthHeader && Number(lengthHeader) > maxBytes) {
		return null;
	}

	const buffer = await request.arrayBuffer();
	if (buffer.byteLength > maxBytes) {
		return null;
	}
	return new TextDecoder().decode(buffer);
}

function bearerToken(header: string | null): string | null {
	if (!header) return null;
	const match = /^Bearer\s+(.+)$/i.exec(header.trim());
	return match?.[1] ?? null;
}

function redactPreview(text: string, secretFindings: number): string {
	const compact = text.replace(/\s+/g, " ").trim().slice(0, 120);
	if (secretFindings > 0) {
		return `[redacted:${secretFindings} finding(s)] ${compact.slice(0, 40)}`;
	}
	return compact;
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
