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
 * SQLite-backed Durable Object that stores redacted webhook/mailhook
 * metadata. Raw secret material is never persisted.
 */
export class InboxDO extends DurableObject {
	async record(event: InboxEvent): Promise<InboxEvent> {
		const events = await this.readEvents();
		events.unshift(event);
		await this.ctx.storage.put("events", events.slice(0, INBOX_LIMIT));
		return event;
	}

	async list(limit = 25): Promise<InboxEvent[]> {
		const events = await this.readEvents();
		return events.slice(0, Math.max(1, Math.min(limit, INBOX_LIMIT)));
	}

	async stats(): Promise<InboxStats> {
		const events = await this.readEvents();
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
		const key = `rl:${source}`;
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

	private async readEvents(): Promise<InboxEvent[]> {
		return (await this.ctx.storage.get<InboxEvent[]>("events")) ?? [];
	}
}
