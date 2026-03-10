import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getChecklistUploadUrl } from "../../server/functions/uploads";

export const Route = createFileRoute("/admin/test-upload")({
  component: TestUploadPage,
});

function TestUploadPage() {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [uploadUrl, setUploadUrl] = useState<string>("");

  async function testConfiguration() {
    setStatus("Testing configuration...");
    setError("");

    try {
      // Test with a fake file and property/room info
      const result = await getChecklistUploadUrl({
        data: {
          checklistId: "test-checklist",
          itemId: "test-item",
          contentType: "image/jpeg",
          fileName: "test.jpg",
          fileSize: 1000,
          propertyName: "Seaglass Villa",
          roomName: "Master Bedroom",
          temporary: true,
        },
      });

      setStatus("✅ Configuration successful!");
      setUploadUrl(result.uploadUrl);
      console.log("Test result:", result);
    } catch (err) {
      setError(`❌ Configuration failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      console.error("Test failed:", err);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("Uploading file...");
    setError("");

    try {
      // Step 1: Get presigned URL with property/room info
      const { uploadUrl, publicUrl } = await getChecklistUploadUrl({
        data: {
          checklistId: "test-checklist",
          itemId: "test-item",
          contentType: file.type,
          fileName: file.name,
          fileSize: file.size,
          propertyName: "Seaglass Villa",
          roomName: "Master Bedroom",
          temporary: true,
        },
      });

      setStatus("Got upload URL, uploading to R2...");

      // Step 2: Upload to R2
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      setStatus(`✅ Upload successful! File available at: ${publicUrl}`);
      console.log("Upload successful:", publicUrl);
    } catch (err) {
      setError(`❌ Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      console.error("Upload failed:", err);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Upload Configuration Test</h1>

      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">1. Test Configuration</h2>
        <button
          onClick={testConfiguration}
          className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
        >
          Test S3/R2 Configuration
        </button>

        {uploadUrl && (
          <div className="text-xs bg-stone-100 p-2 rounded overflow-x-auto">
            <strong>Generated URL:</strong><br />
            {uploadUrl.substring(0, 100)}...
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">2. Test File Upload</h2>
        <input
          type="file"
          onChange={handleFileUpload}
          accept="image/*,video/*"
          className="block"
        />
      </div>

      {status && (
        <div className="p-4 bg-green-50 text-green-800 rounded">
          {status}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded">
          {error}
        </div>
      )}

      <div className="text-sm text-stone-600 space-y-2">
        <p><strong>Checklist:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Cloudflare R2 bucket created</li>
          <li>Public access enabled on bucket</li>
          <li>API credentials generated</li>
          <li>Environment variables set:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>S3_ENDPOINT</li>
              <li>S3_REGION=auto</li>
              <li>S3_ACCESS_KEY_ID</li>
              <li>S3_SECRET_ACCESS_KEY</li>
              <li>S3_BUCKET</li>
              <li>S3_PUBLIC_URL</li>
            </ul>
          </li>
          <li>CORS configured (if needed)</li>
        </ul>
      </div>
    </div>
  );
}