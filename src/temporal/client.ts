import { Client, Connection } from "@temporalio/client";

let _client: Client;

/**
 * Get a shared Temporal client instance.
 * Lazily initialized to avoid crashes when TEMPORAL_ADDRESS is not set.
 */
export async function getTemporalClient(): Promise<Client> {
  if (!_client) {
    const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
    const connection = await Connection.connect({ address });
    _client = new Client({ connection });
  }
  return _client;
}

export const TASK_QUEUE = "jzvacationstays";
