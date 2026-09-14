export const INSTANCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export const MAX_COMMENT_LENGTH = 500;

export type ApprovalPayload = {
	approved: boolean;
	comment?: string;
};

export function instanceIdFromPath(
	pathname: string,
	prefix: string,
): string | undefined {
	if (!pathname.startsWith(prefix)) {
		return undefined;
	}

	const rest = pathname.slice(prefix.length);
	if (!rest || rest.includes("/")) {
		return undefined;
	}

	try {
		const id = decodeURIComponent(rest);
		return INSTANCE_ID_PATTERN.test(id) ? id : undefined;
	} catch {
		return undefined;
	}
}

export function parseInstanceIdParam(
	value: string | null,
): string | undefined {
	if (!value) {
		return undefined;
	}

	return INSTANCE_ID_PATTERN.test(value) ? value : undefined;
}

export function parseApprovalPayload(
	body: unknown,
): ApprovalPayload | { error: string } {
	if (body === null || typeof body !== "object" || Array.isArray(body)) {
		return { error: "JSON object required" };
	}

	const record = body as Record<string, unknown>;
	if (typeof record.approved !== "boolean") {
		return { error: "approved must be a boolean" };
	}

	if (record.comment !== undefined) {
		if (
			typeof record.comment !== "string" ||
			record.comment.length > MAX_COMMENT_LENGTH
		) {
			return {
				error: `comment must be a string of at most ${MAX_COMMENT_LENGTH} characters`,
			};
		}
	}

	return {
		approved: record.approved,
		...(typeof record.comment === "string" ? { comment: record.comment } : {}),
	};
}

export function isNotFoundError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	return /not found|does not exist|404/i.test(error.message);
}
