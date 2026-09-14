const SECURITY_HEADERS: Record<string, string> = {
	"x-content-type-options": "nosniff",
	"referrer-policy": "no-referrer",
	"permissions-policy": "camera=(), microphone=(), geolocation=()",
	"x-frame-options": "DENY",
	"content-security-policy":
		"default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
	"cache-control": "no-store",
};

export function withSecurityHeaders(
	response: Response,
	requestId: string,
): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(key)) {
			headers.set(key, value);
		}
	}
	headers.set("x-request-id", requestId);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
