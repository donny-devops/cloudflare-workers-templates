import { useEffect, useReducer } from "react";
import type {
	WorkflowState,
	WorkflowUpdateMessage,
	StepStatus,
} from "../types";
import { WORKFLOW_STEPS } from "../types";

type Action =
	| { type: "CONNECTED" }
	| { type: "DISCONNECTED" }
	| { type: "UPDATE"; payload: WorkflowUpdateMessage }
	| { type: "RESET" };

const initialState: WorkflowState = {
	instanceId: null,
	currentStep: null,
	stepStatuses: Object.fromEntries(
		WORKFLOW_STEPS.map((step) => [step.name, "pending" as StepStatus]),
	),
	workflowStatus: "idle",
	wsConnected: false,
};

const MAX_RECONNECT_ATTEMPTS = 8;

function workflowReducer(state: WorkflowState, action: Action): WorkflowState {
	switch (action.type) {
		case "CONNECTED":
			return { ...state, wsConnected: true };

		case "DISCONNECTED":
			return { ...state, wsConnected: false };

		case "UPDATE":
			return {
				...state,
				currentStep: action.payload.currentStep,
				stepStatuses: action.payload.stepStatuses,
				workflowStatus: action.payload.workflowStatus,
			};

		case "RESET":
			return { ...initialState };

		default:
			return state;
	}
}

export function useWorkflowWebSocket(instanceId: string | null): WorkflowState {
	const [state, dispatch] = useReducer(workflowReducer, initialState);

	useEffect(() => {
		if (!instanceId) {
			dispatch({ type: "RESET" });
			return;
		}

		let cancelled = false;
		let ws: WebSocket | null = null;
		let retries = 0;
		let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

		const connect = () => {
			if (cancelled) {
				return;
			}

			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const wsUrl = `${protocol}//${window.location.host}/ws?instanceId=${encodeURIComponent(instanceId)}`;
			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				retries = 0;
				dispatch({ type: "CONNECTED" });
			};

			ws.onclose = () => {
				dispatch({ type: "DISCONNECTED" });
				if (cancelled || retries >= MAX_RECONNECT_ATTEMPTS) {
					return;
				}

				const delay = Math.min(1000 * 2 ** retries, 10_000);
				retries += 1;
				reconnectTimer = setTimeout(connect, delay);
			};

			ws.onerror = () => {
				// Connection errors are handled by onclose.
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as WorkflowUpdateMessage;

					if (data.type === "workflow_update") {
						dispatch({ type: "UPDATE", payload: data });
					}
				} catch {
					// Ignore malformed messages
				}
			};
		};

		connect();

		return () => {
			cancelled = true;
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
			}
			ws?.close();
		};
	}, [instanceId]);

	return state;
}
