import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { checkEnvironment } from "../../server/functions/env-check";

export const Route = createFileRoute("/admin/env-check")({
  component: EnvCheckPage,
});

function EnvCheckPage() {
  const [envData, setEnvData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    setLoading(true);
    try {
      const data = await checkEnvironment();
      setEnvData(data);
    } catch (error) {
      console.error("Failed to check environment:", error);
      setEnvData({ error: error instanceof Error ? error.message : "Failed to check" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-6">
          Environment Configuration Check
        </h1>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Security Note:</strong> This page only shows whether environment variables are set, not their actual values.
          </p>
        </div>

        <button
          onClick={handleCheck}
          disabled={loading}
          className="px-6 py-3 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Checking..." : "Check Environment"}
        </button>

        {envData && (
          <div className="mt-8 space-y-6">
            {envData.error ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-800">Error: {envData.error}</p>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-stone-900 mb-3">S3 Configuration</h2>
                  <div className="bg-stone-50 rounded-xl p-4">
                    <pre className="text-sm font-mono text-stone-700 whitespace-pre-wrap">
                      {JSON.stringify(envData.s3, null, 2)}
                    </pre>
                  </div>
                  {(!envData.s3.hasAccessKey || !envData.s3.hasSecretKey || !envData.s3.hasEndpoint) && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-sm text-red-800 font-medium">
                        ⚠️ S3 credentials are missing! Uploads will not work.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-stone-900 mb-3">Other Configuration</h2>
                  <div className="bg-stone-50 rounded-xl p-4">
                    <pre className="text-sm font-mono text-stone-700 whitespace-pre-wrap">
                      {JSON.stringify(envData.other, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="text-xs text-stone-500">
                  Checked at: {envData.timestamp}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}