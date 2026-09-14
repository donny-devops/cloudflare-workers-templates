export { MyWorkflow } from "./workflow";
export { WorkflowStatusDO } from "./durable-object";

import type { WorkerEnv } from "./bindings";
import { withSecurityHeaders } from "./lib/headers";
import { json } from "./lib/json";
import { handleRequest } from "./routes";

/**
 * Operability-aware Worker:
 * - POST /api/workflow/start — create a workflow instance
 * - GET /api/workflow/status/:id — workflow status
 * - POST /api/workflow/event/:id — send approval events
 * - GET /ws — WebSocket status stream
 * - GET /health — liveness/readiness
 * - GET /api/status — binding and inbox snapshot
 * - POST /webhooks/:source — HMAC-signed webhook ingest
 * - POST /mailhooks — bearer-token mailhook ingest
 * - POST /mcp — MCP JSON-RPC tools for agents
 */
export default {
	async fetch(
		request: Request,
		env: WorkerEnv,
		ctx: ExecutionContext,
	): Promise<Response> {
		const requestId = crypto.randomUUID();
		try {
			const response = await handleRequest(request, env, ctx, requestId);
			return withSecurityHeaders(response, requestId);
		} catch {
			return withSecurityHeaders(
				json({ error: "Internal error", requestId }, 500),
				requestId,
			);
		}
	},
} satisfies ExportedHandler<WorkerEnv>;
