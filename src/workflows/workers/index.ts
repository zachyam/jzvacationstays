/**
 * Conductor worker that polls for tasks and executes them
 * Run this with: tsx src/workflows/workers/index.ts
 */

import { taskHandlers } from './odd-even-worker';

// Simple Conductor worker that polls for tasks
class ConductorWorker {
  private polling = false;
  private baseUrl: string;

  constructor(baseUrl = process.env.CONDUCTOR_URL || "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  async startPolling() {
    if (this.polling) return;
    this.polling = true;

    console.log("🚀 Conductor worker started, polling for tasks...");
    console.log("📋 Available task handlers:", Object.keys(taskHandlers));

    while (this.polling) {
      try {
        // Poll for each task type we can handle
        for (const taskType of Object.keys(taskHandlers)) {
          await this.pollAndExecute(taskType);
        }
      } catch (error) {
        console.error("Error in polling loop:", error);
      }

      // Poll every 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async pollAndExecute(taskType: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/tasks/poll/${taskType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const tasks = await response.json();

        // Handle single task or array of tasks
        const taskList = Array.isArray(tasks) ? tasks : (tasks ? [tasks] : []);

        for (const task of taskList) {
          if (task && task.taskId) {
            console.log(`📋 Received task: ${task.taskType} (ID: ${task.taskId})`);
            await this.executeTask(task);
          }
        }
      }
    } catch (error) {
      // Don't spam logs if Conductor is temporarily unavailable
      // console.warn(`Error polling for ${taskType}:`, error.message);
    }
  }

  private async executeTask(task: any) {
    try {
      const handler = taskHandlers[task.taskType as keyof typeof taskHandlers];
      if (!handler) {
        throw new Error(`No handler found for task type: ${task.taskType}`);
      }

      console.log(`⚡ Executing task: ${task.taskType}`, task.inputData);
      const result = await handler(task.inputData);
      console.log(`✅ Task completed:`, result);

      // Update task as completed in Conductor
      const updateResponse = await fetch(`${this.baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.taskId,
          workflowInstanceId: task.workflowInstanceId,
          status: 'COMPLETED',
          outputData: result,
        }),
      });

      if (updateResponse.ok) {
        console.log(`✅ Task ${task.taskId} marked as COMPLETED in Conductor`);
      } else {
        console.error(`❌ Failed to update task ${task.taskId}:`, await updateResponse.text());
      }

    } catch (error) {
      console.error(`❌ Task execution failed: ${task.taskType}`, error);

      // Update task as failed in Conductor
      try {
        await fetch(`${this.baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.taskId,
            workflowInstanceId: task.workflowInstanceId,
            status: 'FAILED',
            reasonForIncompletion: error instanceof Error ? error.message : 'Unknown error',
          }),
        });
      } catch (updateError) {
        console.error('Failed to update task as failed:', updateError);
      }
    }
  }

  stop() {
    this.polling = false;
    console.log("🛑 Conductor worker stopped");
  }
}

// Health check endpoint for production monitoring
import { createServer } from 'http';

function startHealthServer() {
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(3001, () => {
    console.log('🩺 Health check server running on port 3001');
  });
}

// Start the worker if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new ConductorWorker();

  // Start health server for production monitoring
  if (process.env.NODE_ENV === 'production') {
    startHealthServer();
  }

  worker.startPolling().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down worker...');
    worker.stop();
    process.exit(0);
  });
}