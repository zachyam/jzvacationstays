import { Worker } from "@temporalio/worker";
import { TASK_QUEUE } from "./client";

async function run() {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";

  const worker = await Worker.create({
    workflowsPath: new URL("./workflows/index.ts", import.meta.url).pathname,
    activities: await import("./activities"),
    taskQueue: TASK_QUEUE,
    connection: { address },
  });

  console.log(`Temporal worker started, task queue: ${TASK_QUEUE}`);
  await worker.run();
}

run().catch((err) => {
  console.error("Temporal worker failed:", err);
  process.exit(1);
});
