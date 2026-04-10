/**
 * Conductor client configuration for connecting to local Conductor instance
 */

// For now, we'll create a simple HTTP client interface
// Replace this with actual Conductor client when available
interface ConductorClient {
  startWorkflow(workflowName: string, input: any): Promise<{ workflowId: string; status: string }>;
  getWorkflowStatus(workflowId: string): Promise<{ status: string; output?: any }>;
}

class SimpleConductorClient implements ConductorClient {
  private baseUrl: string;

  constructor(baseUrl = process.env.CONDUCTOR_URL || "http://localhost:8000") {
    // Ensure the URL has a protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      this.baseUrl = `https://${baseUrl}`;
    } else {
      this.baseUrl = baseUrl;
    }
  }

  async startWorkflow(workflowName: string, input: any): Promise<{ workflowId: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workflow/startWorkflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workflowName,
          version: 1,
          input,
        }),
      });

      const responseText = await response.text();
      console.log(`Conductor response (${response.status}):`, responseText);

      if (!response.ok) {
        throw new Error(`Failed to start workflow: ${response.status} ${response.statusText} - ${responseText}`);
      }

      // Conductor returns the workflow ID as plain text, not JSON
      const workflowId = responseText.trim();

      // Poll for workflow completion and get the result
      const result = await this.waitForWorkflowCompletion(workflowId);
      return {
        workflowId,
        status: result.status,
        output: result.output,
      };
    } catch (error) {
      console.error("Conductor not available:", error);
      throw new Error(`Conductor workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async waitForWorkflowCompletion(workflowId: string, timeoutMs = 30000): Promise<{ status: string; output?: any }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getWorkflowStatus(workflowId);

        // If workflow is completed or failed, return the result
        if (status.status === "COMPLETED" || status.status === "FAILED") {
          return status;
        }

        // Wait 500ms before polling again
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn("Error checking workflow status:", error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Timeout - return running status
    return { status: "TIMEOUT" };
  }

  async getWorkflowStatus(workflowId: string): Promise<{ status: string; output?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workflow/${workflowId}`);

      if (!response.ok) {
        throw new Error(`Failed to get workflow status: ${response.statusText}`);
      }

      const workflowData = await response.json();
      console.log("Workflow status response:", workflowData);

      // Extract output from the workflow's output parameters
      const output = workflowData.output || {};

      return {
        status: workflowData.status,
        output,
      };
    } catch (error) {
      console.error("Failed to get workflow status from Conductor:", error);
      throw new Error(`Failed to get workflow status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

let _client: ConductorClient;

export function getConductorClient(): ConductorClient {
  if (!_client) {
    const conductorUrl = process.env.CONDUCTOR_URL || "http://localhost:8000";
    _client = new SimpleConductorClient(conductorUrl);
  }
  return _client;
}