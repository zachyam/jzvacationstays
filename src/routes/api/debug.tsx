import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { checkEnv } from "../../server/functions/debug";

export const Route = createFileRoute("/api/debug")({
  component: DebugPage,
});

function DebugPage() {
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEnv()
      .then(setEnvInfo)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="p-8 font-mono text-sm">
      <h1 className="text-xl mb-4">Environment Debug Info</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      {envInfo && (
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(envInfo, null, 2)}
        </pre>
      )}
    </div>
  );
}