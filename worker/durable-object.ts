import { DurableObject } from "cloudflare:workers";
import {
	INBOX_LIMIT,
	RATE_LIMIT_PER_MINUTE,
	type InboxEvent,
	type InboxStats,
} from "./lib/constants";

interface RateBucket {
	windowStart: number;
	count: number;
}

/**
 * WorkflowStatusDO - Durable Object for managing workflow state and WebSocket connections
 *
 * Responsibilities:
 * - Accept and manage WebSocket connections using hibernation API
 * - Track step statuses for a workflow instance
 * - Broadcast updates to all connected clients
 * - Provide RPC method for workflow to update step status
 * - Store redacted webhook/mailhook inbox metadata on a separate named instance
 *   (idFromName("global")) using inbox:* storage keys
 */
export class WorkflowStatusDO extends DurableObject {
	private stepStatuses: Map<string, string>;
	private currentStep: string | null;
	private workflowStatus: "running" | "completed" | "error";

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		this.stepStatuses = new Map();
		this.currentStep = null;
		this.workflowStatus = "running";

		// Load state from durable storage to survive hibernation/eviction
		ctx.blockConcurrencyWhile(async () => {
			const storedStatuses =
				await ctx.storage.get<Record<string, string>>("stepStatuses");
			const storedCurrent = await ctx.storage.get<string | null>("currentStep");
			const storedWorkflowStatus = await ctx.storage.get<
				"running" | "completed" | "error"
			>("workflowStatus");

			if (storedStatuses) {
				this.stepStatuses = new Map(Object.entries(storedStatuses));
			} else {
				const steps = [
					"process data",
					"wait 2 seconds",
					"wait for approval",
					"final",
				];
				steps.forEach((s) => this.stepStatuses.set(s, "pending"));
			}

			this.currentStep = storedCurrent ?? null;
			this.workflowStatus = storedWorkflowStatus ?? "running";
		});
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade") === "websocket") {
			const pair = new WebSocketPair();
			const [client, server] = Object.values(pair);

			// Use hibernation API - acceptWebSocket allows the DO to hibernate
			this.ctx.acceptWebSocket(server);

			// Send current state immediately upon connection
			server.send(JSON.stringify(this.getStateMessage()));

			return new Response(null, { status: 101, webSocket: client });
		}

		return new Response("Expected WebSocket", { status: 400 });
	}

	/**
	 * RPC method called by the workflow to update step status
	 * This is called via stub.updateStep() from the workflow
	 */
	async updateStep(stepName: string, status: string): Promise<void> {
		this.stepStatuses.set(stepName, status);

		if (status === "running" || status === "waiting") {
			this.currentStep = stepName;
		}

		const allCompleted = Array.from(this.stepStatuses.values()).every(
			(s) => s === "completed",
		);
		if (allCompleted) {
			this.workflowStatus = "completed";
			this.currentStep = null;
		}

		await this.ctx.storage.put(
			"stepStatuses",
			Object.fromEntries(this.stepStatuses),
		);
		await this.ctx.storage.put("currentStep", this.currentStep);
		await this.ctx.storage.put("workflowStatus", this.workflowStatus);

		this.broadcast(this.getStateMessage());
	}

	async record(event: InboxEvent): Promise<InboxEvent> {
		const events = await this.readInboxEvents();
		events.unshift(event);
		await this.ctx.storage.put(
			"inbox:events",
			events.slice(0, INBOX_LIMIT),
		);
		return event;
	}

	async list(limit = 25): Promise<InboxEvent[]> {
		const events = await this.readInboxEvents();
		return events.slice(0, Math.max(1, Math.min(limit, INBOX_LIMIT)));
	}

	async stats(): Promise<InboxStats> {
		const events = await this.readInboxEvents();
		return {
			total: events.length,
			webhooks: events.filter((event) => event.kind === "webhook").length,
			mailhooks: events.filter((event) => event.kind === "mailhook").length,
			scans: events.filter((event) => event.kind === "scan").length,
			secretFindings: events.reduce(
				(sum, event) => sum + event.secretFindings,
				0,
			),
		};
	}

	async allow(source: string, limit = RATE_LIMIT_PER_MINUTE): Promise<boolean> {
		const key = `inbox:rl:${source}`;
		const now = Date.now();
		const bucket =
			(await this.ctx.storage.get<RateBucket>(key)) ?? {
				windowStart: now,
				count: 0,
			};

		if (now - bucket.windowStart >= 60_000) {
			bucket.windowStart = now;
			bucket.count = 0;
		}

		bucket.count += 1;
		await this.ctx.storage.put(key, bucket);
		return bucket.count <= limit;
	}

	private async readInboxEvents(): Promise<InboxEvent[]> {
		return (await this.ctx.storage.get<InboxEvent[]>("inbox:events")) ?? [];
	}

	/**
	 * WebSocket message handler (hibernation API)
	 * Called when a client sends a message
	 */
	async webSocketMessage(ws: WebSocket, _message: string): Promise<void> {
		ws.send(JSON.stringify(this.getStateMessage()));
	}

	/**
	 * WebSocket close handler (hibernation API)
	 * Called when a client closes the connection
	 */
	async webSocketClose(
		ws: WebSocket,
		code: number,
		reason: string,
		_wasClean: boolean,
	): Promise<void> {
		ws.close(code, reason);
	}

	/**
	 * Broadcast a message to all connected WebSocket clients
	 */
	private broadcast(message: object): void {
		const sockets = this.ctx.getWebSockets();
		const json = JSON.stringify(message);

		for (const socket of sockets) {
			try {
				socket.send(json);
			} catch {
				// Ignore errors for disconnected sockets
			}
		}
	}

	/**
	 * Get the current state as a message object
	 */
	private getStateMessage(): object {
		return {
			type: "workflow_update",
			currentStep: this.currentStep,
			stepStatuses: Object.fromEntries(this.stepStatuses),
			workflowStatus: this.workflowStatus,
			timestamp: Date.now(),
		};
	}
}
