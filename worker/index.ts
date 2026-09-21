import {
	instanceIdFromPath,
	isNotFoundError,
	parseApprovalPayload,
	parseInstanceIdParam,
} from "./validation";

export { MyWorkflow } from "./workflow";
export { WorkflowStatusDO } from "./durable-object";

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
	return Response.json(data, { status, headers });
}

function methodNotAllowed(allow: string): Response {
	return json({ error: "Method not allowed" }, 405, { Allow: allow });
}

/**
 * Main Worker fetch handler
 *
 * Handles API routes and WebSocket upgrade requests for workflow management:
 * - POST /api/workflow/start - Create new workflow instance
 * - GET /api/workflow/status/:id - Get workflow status
 * - POST /api/workflow/event/:id - Send events to workflow
 * - GET /ws - WebSocket connection for real-time updates
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/api/workflow/start") {
			if (request.method !== "POST") {
				return methodNotAllowed("POST");
			}

			try {
				const instance = await env.MY_WORKFLOW.create({
					params: {
						timestamp: Date.now(),
					},
				});

				return json({
					instanceId: instance.id,
					message: "Workflow started successfully",
				});
			} catch {
				return json({ error: "Failed to start workflow" }, 500);
			}
		}

		if (url.pathname.startsWith("/api/workflow/status/")) {
			if (request.method !== "GET") {
				return methodNotAllowed("GET");
			}

			const instanceId = instanceIdFromPath(
				url.pathname,
				"/api/workflow/status/",
			);
			if (!instanceId) {
				return json({ error: "Valid instance ID required" }, 400);
			}

			try {
				const instance = await env.MY_WORKFLOW.get(instanceId);
				const status = await instance.status();
				return json(status);
			} catch (error) {
				if (isNotFoundError(error)) {
					return json({ error: "Workflow instance not found" }, 404);
				}
				return json({ error: "Failed to get workflow status" }, 500);
			}
		}

		if (url.pathname.startsWith("/api/workflow/event/")) {
			if (request.method !== "POST") {
				return methodNotAllowed("POST");
			}

			const instanceId = instanceIdFromPath(
				url.pathname,
				"/api/workflow/event/",
			);
			if (!instanceId) {
				return json({ error: "Valid instance ID required" }, 400);
			}

			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return json({ error: "Invalid JSON body" }, 400);
			}

			const payload = parseApprovalPayload(body);
			if ("error" in payload) {
				return json({ error: payload.error }, 400);
			}

			try {
				const instance = await env.MY_WORKFLOW.get(instanceId);

				await instance.sendEvent({
					type: "user-approval",
					payload,
				});

				return json({
					success: true,
					message: "Event sent successfully",
				});
			} catch (error) {
				if (isNotFoundError(error)) {
					return json({ error: "Workflow instance not found" }, 404);
				}
				return json({ error: "Failed to send event" }, 500);
			}
		}

		if (url.pathname === "/ws") {
			const instanceId = parseInstanceIdParam(
				url.searchParams.get("instanceId"),
			);
			if (!instanceId) {
				return new Response("Valid instanceId query parameter required", {
					status: 400,
				});
			}

			const upgradeHeader = request.headers.get("Upgrade");
			if (upgradeHeader !== "websocket") {
				return new Response("Expected Upgrade: websocket", { status: 426 });
			}

			try {
				const doId = env.WORKFLOW_STATUS.idFromName(instanceId);
				const stub = env.WORKFLOW_STATUS.get(doId);
				return stub.fetch(request);
			} catch {
				return new Response("Failed to establish WebSocket connection", {
					status: 500,
				});
			}
		}

		if (url.pathname === "/health") {
			return json({
				status: "healthy",
				service: "cloudflare-workers-templates",
				timestamp: new Date().toISOString(),
			});
		}

		return json({ error: "Not Found" }, 404);
	},
	async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
		// Example scheduled job — runs on the cron defined in wrangler.jsonc.
		// Replace with real periodic work (e.g. nightly reconciliation, cleanup).
		await env.MY_WORKFLOW.create({
			params: { timestamp: Date.now() },
		});
	},
} satisfies ExportedHandler<Env>;