export const SERVICE_NAME = "cloudflare-workers-templates";
export const SERVICE_VERSION = "1.1.0";
export const MAX_INGRESS_BYTES = 256 * 1024;
export const MAX_SCAN_BYTES = 64 * 1024;
export const INBOX_LIMIT = 100;
export const RATE_LIMIT_PER_MINUTE = 60;

export type InboxKind = "webhook" | "mailhook" | "scan";

export interface InboxEvent {
	id: string;
	kind: InboxKind;
	source: string;
	receivedAt: number;
	bytes: number;
	secretFindings: number;
	secretKinds: string[];
	redactedPreview: string;
}

export interface InboxStats {
	total: number;
	webhooks: number;
	mailhooks: number;
	scans: number;
	secretFindings: number;
}
