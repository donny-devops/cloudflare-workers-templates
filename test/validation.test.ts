import { describe, it, expect } from "vitest";
import {
	instanceIdFromPath,
	isNotFoundError,
	parseApprovalPayload,
	parseInstanceIdParam,
} from "../worker/validation";

describe("instanceIdFromPath", () => {
	it("extracts a valid id from a single path segment", () => {
		expect(
			instanceIdFromPath(
				"/api/workflow/status/abc-123",
				"/api/workflow/status/",
			),
		).toBe("abc-123");
	});

	it("rejects missing, nested, or unsafe ids", () => {
		expect(
			instanceIdFromPath("/api/workflow/status/", "/api/workflow/status/"),
		).toBeUndefined();
		expect(
			instanceIdFromPath(
				"/api/workflow/status/foo/bar",
				"/api/workflow/status/",
			),
		).toBeUndefined();
		expect(
			instanceIdFromPath(
				"/api/workflow/status/has space",
				"/api/workflow/status/",
			),
		).toBeUndefined();
		expect(
			instanceIdFromPath("/api/other/abc", "/api/workflow/status/"),
		).toBeUndefined();
	});
});

describe("parseInstanceIdParam", () => {
	it("accepts workflow-style ids and rejects empty or unsafe values", () => {
		expect(parseInstanceIdParam("test-1234")).toBe("test-1234");
		expect(parseInstanceIdParam("")).toBeUndefined();
		expect(parseInstanceIdParam(null)).toBeUndefined();
		expect(parseInstanceIdParam("../etc/passwd")).toBeUndefined();
	});
});

describe("parseApprovalPayload", () => {
	it("accepts a boolean approved flag and optional comment", () => {
		expect(parseApprovalPayload({ approved: true })).toEqual({
			approved: true,
		});
		expect(
			parseApprovalPayload({ approved: false, comment: "Rejected via UI" }),
		).toEqual({
			approved: false,
			comment: "Rejected via UI",
		});
	});

	it("rejects malformed bodies", () => {
		expect(parseApprovalPayload(null)).toEqual({ error: "JSON object required" });
		expect(parseApprovalPayload([])).toEqual({ error: "JSON object required" });
		expect(parseApprovalPayload({ approved: "yes" })).toEqual({
			error: "approved must be a boolean",
		});
		expect(parseApprovalPayload({ approved: true, comment: 1 })).toEqual({
			error: "comment must be a string of at most 500 characters",
		});
		expect(
			parseApprovalPayload({ approved: true, comment: "x".repeat(501) }),
		).toEqual({
			error: "comment must be a string of at most 500 characters",
		});
	});
});

describe("isNotFoundError", () => {
	it("detects not-found messages", () => {
		expect(isNotFoundError(new Error("instance not found"))).toBe(true);
		expect(isNotFoundError(new Error("boom"))).toBe(false);
		expect(isNotFoundError("not found")).toBe(false);
	});
});
