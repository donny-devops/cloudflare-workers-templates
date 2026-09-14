import type { InboxDO } from "./inbox";

/**
 * Extra bindings used by the operability layer. Secrets are optional so
 * local/CI dry-runs work without credentials; mutating ingress rejects
 * requests until the matching secret is configured.
 */
export type OperabilityEnv = {
	INBOX: DurableObjectNamespace<InboxDO>;
	WEBHOOK_SECRET?: string;
	MAILHOOK_TOKEN?: string;
	SERVICE_NAME?: string;
	SERVICE_VERSION?: string;
};

export type WorkerEnv = Env & OperabilityEnv;
