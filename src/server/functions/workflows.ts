import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getConductorClient } from "../../workflows/client";

const CheckOddEvenSchema = z.object({
  number: z.number().int("Number must be an integer"),
});

export const checkOddEven = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CheckOddEvenSchema.parse(data))
  .handler(async ({ data }) => {
    const client = getConductorClient();

    try {
      const result = await client.startWorkflow("is_odd_or_even_workflow", {
        number: data.number,
      });

      return {
        success: true,
        workflowId: result.workflowId,
        result: result.status === "COMPLETED" ? result.output?.result : null,
        status: result.status,
      };
    } catch (error) {
      console.error("Failed to start workflow:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

export const getWorkflowStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ workflowId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const client = getConductorClient();

    try {
      const status = await client.getWorkflowStatus(data.workflowId);
      return {
        success: true,
        ...status,
      };
    } catch (error) {
      console.error("Failed to get workflow status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });