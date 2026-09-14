import type { WorkflowStatusDO } from "./durable-object";

/**
 * Extra bindings used by the operability layer. Secrets are optional so
 * local/CI dry-runs work without credentials; mutating ingress rejects
 * requests until the matching secret is configured.
 *
 * INBOX reuses WorkflowStatusDO (existing sqlite class) with idFromName("global")
 * and inbox:* storage keys so production does not need a new DO migration.
 */
export type OperabilityEnv = {
	INBOX: DurableObjectNamespace<WorkflowStatusDO>;
	WEBHOOK_SECRET?: string;
	MAILHOOK_TOKEN?: string;
	SERVICE_NAME?: string;
	SERVICE_VERSION?: string;
};

export type WorkerEnv = Env & OperabilityEnv;
