#!/usr/bin/env node

const baseUrl = process.env.CONDUCTOR_URL || "http://localhost:8000";
console.log("Base URL:", baseUrl);

async function testConnection() {
  try {
    console.log("Testing connection to:", `${baseUrl}/api/metadata/taskdefs`);

    const response = await fetch(`${baseUrl}/api/metadata/taskdefs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        name: "check_odd_even",
        description: "Task to check if a number is odd or even",
        retryCount: 3,
        retryLogic: "FIXED",
        retryDelaySeconds: 1,
        timeoutSeconds: 10,
        timeoutPolicy: "TIME_OUT_WF",
        responseTimeoutSeconds: 8,
        inputKeys: ["number"],
        outputKeys: ["result"]
      }])
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    const text = await response.text();
    console.log("Response body:", text);

  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testConnection();