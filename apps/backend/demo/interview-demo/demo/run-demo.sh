#!/usr/bin/env bash
# Usage: ./run-demo.sh <TENANT_A_TOKEN> <TENANT_B_TOKEN>
# Demonstrates tenant isolation and an async flow (order create -> sync processing)

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 TENANT_A_TOKEN TENANT_B_TOKEN"
  exit 1
fi

TENANT_A_TOKEN="$1"
TENANT_B_TOKEN="$2"

API=http://localhost:3000

echo "=== Create an order as Tenant A ==="
curl -s -X POST "$API/api/orders" \
  -H "Authorization: Bearer $TENANT_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"sku":"demo-sku","qty":1}],"total":100}' | jq

echo "\n=== List orders as Tenant A (should show the order) ==="
curl -s "$API/api/orders" -H "Authorization: Bearer $TENANT_A_TOKEN" | jq

echo "\n=== Try to GET orders as Tenant B (should be empty or not include A's order) ==="
curl -s "$API/api/orders" -H "Authorization: Bearer $TENANT_B_TOKEN" | jq

echo "\n=== If you have a sync worker running, watch worker logs for processing of the order.created event ==="
echo "Tail the worker logs or check the API GET /orders/{id} after processing."
