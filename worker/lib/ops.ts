import type { WorkerEnv } from "../bindings";
import { SERVICE_NAME, SERVICE_VERSION, type InboxEvent } from "./constants";
import { json } from "./json";

export function serviceName(env: WorkerEnv): string {
	return env.SERVICE_NAME || SERVICE_NAME;
}

export function serviceVersion(env: WorkerEnv): string {
	return env.SERVICE_VERSION || SERVICE_VERSION;
}

export function inboxStub(env: WorkerEnv) {
	return env.INBOX.get(env.INBOX.idFromName("global"));
}

export async function recordInboxEvent(
	env: WorkerEnv,
	event: Omit<InboxEvent, "id" | "receivedAt">,
): Promise<InboxEvent> {
	const record: InboxEvent = {
		...event,
		id: crypto.randomUUID(),
		receivedAt: Date.now(),
	};
	return inboxStub(env).record(record);
}

export function healthResponse(
	env: WorkerEnv,
	requestId: string,
	inboxAvailable: boolean,
): Response {
	const status = inboxAvailable ? "ok" : "degraded";
	return json(
		{
			status,
			service: serviceName(env),
			version: serviceVersion(env),
			time: new Date().toISOString(),
			requestId,
			checks: {
				workflow: env.MY_WORKFLOW ? "ok" : "missing",
				durableObjects: env.WORKFLOW_STATUS ? "ok" : "missing",
				inbox: inboxAvailable ? "ok" : "degraded",
			},
		},
		inboxAvailable ? 200 : 503,
	);
}
