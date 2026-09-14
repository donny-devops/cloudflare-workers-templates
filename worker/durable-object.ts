import { DurableObject } from "cloudflare:workers";

import type { Env } from "./bindings";
import type { InboxEvent, InboxKind } from "./lib/inbox-types";

interface ConnectionState {
  workflowId: string;
}

/**
 * Workflow status Durable Object.
 * Holds per-workflow live connections and a small inbox ring for ops events.
 * Inbox metadata uses `inbox:` storage keys so it never collides with workflow state.
 */
export class WorkflowStatusDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const workflowId = url.searchParams.get("workflowId") ?? "unknown";
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server, [workflowId]);
      server.serializeAttachment({ workflowId } satisfies ConnectionState);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      const payload = await request.text();
      const workflowId = url.searchParams.get("workflowId") ?? "unknown";
      for (const socket of this.ctx.getWebSockets(workflowId)) {
        socket.send(payload);
      }
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const state = ws.deserializeAttachment() as ConnectionState | undefined;
    if (!state) {
      return;
    }
    for (const socket of this.ctx.getWebSockets(state.workflowId)) {
      if (socket !== ws) {
        socket.send(message);
      }
    }
  }

  async record(kind: InboxKind, source: string, summary: string, payload: unknown) {
    if (!(await this.allow(source))) {
      return { recorded: false as const, reason: "rate_limited" as const };
    }

    const events = await this.readEvents();
    const event: InboxEvent = {
      id: crypto.randomUUID(),
      kind,
      source,
      summary: summary.slice(0, 280),
      payload,
      receivedAt: Date.now()
    };
    events.unshift(event);
    await this.ctx.storage.put("inbox:events", events.slice(0, 50));
    return { recorded: true as const, event };
  }

  async list() {
    return this.readEvents();
  }

  async stats() {
    const events = await this.readEvents();
    return {
      total: events.length,
      webhooks: events.filter((event) => event.kind === "webhook").length,
      mailhooks: events.filter((event) => event.kind === "mailhook").length
    };
  }

  async allow(source: string) {
    const key = `inbox:rl:${source}`;
    const last = (await this.ctx.storage.get<number>(key)) ?? 0;
    const now = Date.now();
    if (now - last < 250) {
      return false;
    }
    await this.ctx.storage.put(key, now);
    return true;
  }

  private async readEvents() {
    return (await this.ctx.storage.get<InboxEvent[]>("inbox:events")) ?? [];
  }
}
