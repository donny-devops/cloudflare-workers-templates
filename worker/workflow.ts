import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";

/**
 * This workflow showcases:
 * - Durable step execution with step.do
 * - Time-based delays with step.sleep
 * - Interactive pausing with step.waitForEvent
 * - Data flow between steps
 *
 * @see https://developers.cloudflare.com/workflows
 */
export class MyWorkflow extends WorkflowEntrypoint<
	Env,
	Record<string, unknown>
> {
	async run(event: WorkflowEvent<Record<string, unknown>>, step: WorkflowStep) {
		const instanceId = event.instanceId;
		let activeStep = "process data";

		// Notify Durable Object of step progress. Called outside step.do, so this
		// operation may repeat. Safe here because updateStep is idempotent.
		// Refer to: https://developers.cloudflare.com/workflows/build/rules-of-workflows/
		const notifyStep = async (
			stepName: string,
			status: "running" | "completed" | "waiting" | "error",
		) => {
			try {
				const doId = this.env.WORKFLOW_STATUS.idFromName(instanceId);
				const stub = this.env.WORKFLOW_STATUS.get(doId);
				await stub.updateStep(stepName, status);
			} catch {
				// Live UI updates are best-effort; workflow durability does not depend on them.
			}
		};

		try {
			activeStep = "process data";
			await notifyStep("process data", "running");
			const result = await step.do("process data", async () => {
				await new Promise((resolve) => setTimeout(resolve, 1000));
				return { processed: true, timestamp: Date.now() };
			});
			await notifyStep("process data", "completed");

			activeStep = "wait 2 seconds";
			await notifyStep("wait 2 seconds", "running");
			await step.sleep("wait 2 seconds", "2 seconds");
			await notifyStep("wait 2 seconds", "completed");

			activeStep = "wait for approval";
			await notifyStep("wait for approval", "waiting");
			const approval = await step.waitForEvent("wait for approval", {
				type: "user-approval",
				timeout: "60 minutes",
			});
			await notifyStep("wait for approval", "completed");

			activeStep = "final";
			await notifyStep("final", "running");
			await step.do("final", async () => {
				console.log("Results:", { result, approval: approval.payload });
				await new Promise((resolve) => setTimeout(resolve, 1000));
			});
			await notifyStep("final", "completed");
		} catch (error) {
			await notifyStep(activeStep, "error");
			throw error;
		}
	}
}
