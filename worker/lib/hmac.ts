export function parseSignatureHeader(header: string | null): string | null {
	if (!header) {
		return null;
	}

	const value = header.trim();
	const prefixed = /^(?:sha256=)?([A-Fa-f0-9]{64})$/.exec(value);
	return prefixed?.[1] ? prefixed[1].toLowerCase() : null;
}

export function readWebhookSignature(request: Request): string | null {
	return (
		parseSignatureHeader(request.headers.get("x-webhook-signature")) ??
		parseSignatureHeader(request.headers.get("x-hub-signature-256")) ??
		parseSignatureHeader(request.headers.get("x-signature"))
	);
}

export async function hmacSha256Hex(
	secret: string,
	payload: string,
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);
	return bufferToHex(signature);
}

export function timingSafeEqualHex(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}

	const a = left.toLowerCase();
	const b = right.toLowerCase();
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

function bufferToHex(buffer: ArrayBuffer): string {
	return [...new Uint8Array(buffer)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
