import type { WorkerEnv } from "../bindings";
import { json } from "./json";
import {
	inboxStub,
	recordInboxEvent,
	serviceName,
	serviceVersion,
} from "./ops";
import { scanForSecrets, summarizeFindings } from "./secrets";

interface JsonRpcRequest {
	jsonrpc?: string;
	id?: string | number | null;
	method?: string;
	params?: unknown;
}

const TOOLS = [
	{
		name: "status_check",
		description:
			"Return worker health, binding presence, and redacted inbox stats.",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
	},
	{
		name: "scan_secrets",
		description:
			"Scan provided text for credential patterns and return redacted findings. Never stores the raw input.",
		inputSchema: {
			type: "object",
			required: ["text"],
			properties: {
				text: { type: "string", description: "Text to scan" },
			},
			additionalProperties: false,
		},
	},
	{
		name: "list_inbox",
		description:
			"List recent webhook and mailhook events. Previews are redacted.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", minimum: 1, maximum: 100 },
			},
			additionalProperties: false,
		},
	},
	{
		name: "start_workflow",
		description: "Create a Cloudflare Workflow instance from this template.",
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
	},
];

export async function handleMcp(
	request: Request,
	env: WorkerEnv,
	requestId: string,
): Promise<Response> {
	if (request.method === "GET") {
		return json({
			name: serviceName(env),
			version: serviceVersion(env),
			protocol: "mcp",
			transport: "json-rpc",
			requestId,
			tools: TOOLS.map((tool) => tool.name),
		});
	}

	if (request.method !== "POST") {
		return json({ error: "Method not allowed" }, 405, { allow: "GET, POST" });
	}

	let body: JsonRpcRequest;
	try {
		body = (await request.json()) as JsonRpcRequest;
	} catch {
		return json(rpcError(null, -32700, "Parse error"), 400);
	}

	const id = body.id ?? null;
	if (body.jsonrpc !== "2.0" || typeof body.method !== "string") {
		return json(rpcError(id, -32600, "Invalid request"), 400);
	}

	try {
		const result = await dispatchMcp(body.method, body.params, env, requestId);
		if (body.method.startsWith("notifications/")) {
			return new Response(null, { status: 204 });
		}
		return json({ jsonrpc: "2.0", id, result });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal error";
		const code = message === "Method not found" ? -32601 : -32000;
		return json(rpcError(id, code, message), code === -32601 ? 404 : 500);
	}
}

async function dispatchMcp(
	method: string,
	params: unknown,
	env: WorkerEnv,
	requestId: string,
): Promise<unknown> {
	switch (method) {
		case "initialize":
			return {
				protocolVersion: "2025-03-26",
				capabilities: { tools: {} },
				serverInfo: {
					name: serviceName(env),
					version: serviceVersion(env),
				},
			};
		case "notifications/initialized":
			return null;
		case "ping":
			return { ok: true, requestId };
		case "tools/list":
			return { tools: TOOLS };
		case "tools/call":
			return callTool(params, env, requestId);
		default:
			throw new Error("Method not found");
	}
}

async function callTool(
	params: unknown,
	env: WorkerEnv,
	requestId: string,
): Promise<unknown> {
	const name =
		typeof params === "object" && params && "name" in params
			? String((params as { name: string }).name)
			: "";
	const args =
		typeof params === "object" && params && "arguments" in params
			? ((params as { arguments?: Record<string, unknown> }).arguments ?? {})
			: {};

	switch (name) {
		case "status_check": {
			const stats = await inboxStub(env).stats();
			return textResult({
				requestId,
				service: serviceName(env),
				version: serviceVersion(env),
				webhookSigning: Boolean(env.WEBHOOK_SECRET),
				mailhookAuth: Boolean(env.MAILHOOK_TOKEN),
				inbox: stats,
			});
		}
		case "scan_secrets": {
			const text = typeof args.text === "string" ? args.text : "";
			const findings = scanForSecrets(text);
			await recordInboxEvent(env, {
				kind: "scan",
				source: "mcp",
				bytes: text.length,
				secretFindings: findings.length,
				secretKinds: summarizeFindings(findings).kinds,
				redactedPreview: findings
					.map((finding) => `${finding.label}:${finding.redacted}`)
					.join(", ")
					.slice(0, 180),
			});
			return textResult({ findings, count: findings.length });
		}
		case "list_inbox": {
			const limit = typeof args.limit === "number" ? args.limit : 25;
			return textResult(await inboxStub(env).list(limit));
		}
		case "start_workflow": {
			const instance = await env.MY_WORKFLOW.create({
				params: { timestamp: Date.now(), source: "mcp" },
			});
			return textResult({ instanceId: instance.id });
		}
		default:
			throw new Error("Method not found");
	}
}

function textResult(data: unknown): unknown {
	return {
		content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
		structuredContent: data,
	};
}

function rpcError(
	id: string | number | null,
	code: number,
	message: string,
): unknown {
	return { jsonrpc: "2.0", id, error: { code, message } };
}
