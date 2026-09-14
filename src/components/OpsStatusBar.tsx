import { useEffect, useState } from "react";

type HealthState = "loading" | "ok" | "degraded" | "error";

interface StatusSnapshot {
	version?: string;
	bindings?: {
		webhookSigning?: boolean;
		mailhookAuth?: boolean;
		inbox?: boolean;
	};
	inbox?: {
		total?: number;
		secretFindings?: number;
		error?: string;
	};
}

export function OpsStatusBar() {
	const [health, setHealth] = useState<HealthState>("loading");
	const [open, setOpen] = useState(false);
	const [status, setStatus] = useState<StatusSnapshot | null>(null);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			try {
				const [healthRes, statusRes] = await Promise.all([
					fetch("/health"),
					fetch("/api/status"),
				]);
				if (cancelled) return;

				if (!healthRes.ok) {
					setHealth(healthRes.status === 503 ? "degraded" : "error");
				} else {
					setHealth("ok");
				}

				if (statusRes.ok) {
					setStatus((await statusRes.json()) as StatusSnapshot);
				}
			} catch {
				if (!cancelled) setHealth("error");
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	const label =
		health === "ok"
			? "ops ok"
			: health === "degraded"
				? "ops degraded"
				: health === "loading"
					? "ops…"
					: "ops error";

	const tone =
		health === "ok"
			? "text-emerald-700 dark:text-emerald-400"
			: health === "degraded"
				? "text-amber-700 dark:text-amber-400"
				: health === "loading"
					? "text-neutral-500"
					: "text-red-700 dark:text-red-400";

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				className={`rounded-full border border-neutral-300/70 dark:border-neutral-700/70 px-2.5 py-1 text-[11px] font-medium tracking-wide ${tone}`}
				aria-expanded={open}
				aria-label="Show operability status"
			>
				<span
					className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
						health === "ok"
							? "bg-emerald-500"
							: health === "degraded"
								? "bg-amber-500"
								: health === "loading"
									? "bg-neutral-400"
									: "bg-red-500"
					}`}
				/>
				{label}
			</button>
			{open && (
				<div className="absolute right-0 mt-2 w-64 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 text-xs text-neutral-600 dark:text-neutral-300 shadow-float z-20">
					<p className="font-medium text-neutral-800 dark:text-neutral-100">
						Operability
					</p>
					<ul className="mt-2 space-y-1">
						<li>version {status?.version ?? "unknown"}</li>
						<li>
							webhook signing{" "}
							{status?.bindings?.webhookSigning ? "configured" : "unset"}
						</li>
						<li>
							mailhook auth{" "}
							{status?.bindings?.mailhookAuth ? "configured" : "unset"}
						</li>
						<li>
							inbox events {status?.inbox?.total ?? 0} · findings{" "}
							{status?.inbox?.secretFindings ?? 0}
						</li>
					</ul>
					<p className="mt-2 text-[11px] text-neutral-500">
						Health, webhooks, mailhooks, secret scanning, and MCP live at
						/health, /webhooks/:source, /mailhooks, and /mcp.
					</p>
				</div>
			)}
		</div>
	);
}
