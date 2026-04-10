#!/bin/bash

# Script to register workflow and task definitions with deployed Conductor
CONDUCTOR_URL=${1:-"https://your-conductor-server.up.railway.app"}

echo "Registering task definition..."
curl -X POST ${CONDUCTOR_URL}/api/metadata/taskdefs \
  -H "Content-Type: application/json" \
  -d @src/workflows/tasks/check_odd_even.json

echo "Registering workflow definition..."
curl -X POST ${CONDUCTOR_URL}/api/metadata/workflow \
  -H "Content-Type: application/json" \
  -d @src/workflows/definitions/is_odd_or_even.json

echo "Done! Workflows registered."