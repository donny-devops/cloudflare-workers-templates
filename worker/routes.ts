import { createMcpHandler } from "@modelcontextprotocol/sdk/server/node";

import type { Env } from "./bindings";
import { json, readJson } from "./lib/http";
import { getInbox, recordInbox, scanSecrets } from "./lib/ops";
import { createMcpServer } from "./mcp";
import { verifyWebhook } from "./webhooks";

const MCP_PATH = "/mcp";

export async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/health") {
    return json({
      status: "ok",
      service: "cloudflare-workers-templates",
      time: new Date().toISOString(),
      commit: env.GIT_COMMIT ?? "dev"
    });
  }

  if (path === "/api/status") {
    const inbox = await getInbox(env);
    return json({
      service: "cloudflare-workers-templates",
      environment: env.ENVIRONMENT,
      commit: env.GIT_COMMIT ?? "dev",
      durableObjects: {
        workflows: Boolean(env.WORKFLOW_STATUS),
        inbox: Boolean(env.INBOX)
      },
      inbox
    });
  }

  if (path === "/api/scan" && request.method === "POST") {
    const body = await readJson<{ text?: string }>(request);
    return json(scanSecrets(body.text ?? ""));
  }

  if (path.startsWith("/webhooks/") && request.method === "POST") {
    return handleWebhook(request, env, path.slice("/webhooks/".length));
  }

  if (path === "/mailhooks" && request.method === "POST") {
    return handleMailhook(request, env);
  }

  if (path === MCP_PATH) {
    const mcpResponse = await createMcpHandler(createMcpServer(env), {
      expectedHosts: expectedHosts(url.host)
    })(request, {
      waitUntil: ctx.waitUntil.bind(ctx)
    });
    if (mcpResponse) {
      return mcpResponse;
    }
    if (request.method === "GET") {
      return json({
        protocol: "mcp",
        transport: "streamable-http",
        path: MCP_PATH
      });
    }
  }

  if (path === "/ws") {
    const workflowId = url.searchParams.get("workflowId") ?? "global";
    const id = env.WORKFLOW_STATUS.idFromName(workflowId);
    const stub = env.WORKFLOW_STATUS.get(id);
    return stub.fetch(`https://do/websocket?workflowId=${encodeURIComponent(workflowId)}`, request);
  }

  return null;
}

function expectedHosts(host: string) {
  return [host, `www.${host}`];
}

async function handleWebhook(request: Request, env: Env, source: string) {
  const raw = await request.text();
  const verified = await verifyWebhook({
    source,
    rawBody: raw,
    signature: request.headers.get("x-hub-signature-256") ?? request.headers.get("x-signature"),
    secret: env.WEBHOOK_SECRET
  });

  if (!verified) {
    return json({ error: "invalid webhook signature" }, 401);
  }

  const payload = parseMaybeJson(raw);
  const result = await recordInbox(env, "webhook", source, summarizeWebhook(source, payload), payload);
  return json({ ok: true, ...result });
}

async function handleMailhook(request: Request, env: Env) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!env.MAILHOOK_TOKEN || token !== env.MAILHOOK_TOKEN) {
    return json({ error: "unauthorized mailhook" }, 401);
  }

  const payload = await readJson<Record<string, unknown>>(request);
  const from = String(payload.from ?? payload.sender ?? "unknown");
  const subject = String(payload.subject ?? "(no subject)");
  const result = await recordInbox(env, "mailhook", from, subject, payload);
  return json({ ok: true, ...result });
}

function parseMaybeJson(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { raw };
  }
}

function summarizeWebhook(source: string, payload: unknown) {
  if (payload && typeof payload === "object" && "action" in payload) {
    return `${source}:${String((payload as { action?: unknown }).action)}`;
  }
  return `${source} event`;
}
