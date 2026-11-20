#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://localhost:8080}"
task_id=""

health="$(curl --fail --silent --show-error "$base_url/api/health")"
[[ "$(jq -r '.status' <<<"$health")" == "ok" ]]

created="$(curl --fail --silent --show-error \
  -X POST "$base_url/api/tasks" \
  -H 'Content-Type: application/json' \
  --data '{"title":"Compose CI smoke test"}')"
task_id="$(jq -r '.id' <<<"$created")"
[[ "$(jq -r '.title' <<<"$created")" == "Compose CI smoke test" ]]

updated="$(curl --fail --silent --show-error \
  -X PATCH "$base_url/api/tasks/$task_id" \
  -H 'Content-Type: application/json' \
  --data '{"completed":true}')"
[[ "$(jq -r '.completed' <<<"$updated")" == "true" ]]

listed="$(curl --fail --silent --show-error "$base_url/api/tasks")"
jq -e --arg id "$task_id" '.[] | select((.id | tostring) == $id)' <<<"$listed" >/dev/null

invalid_status="$(curl --silent --show-error -o /dev/null -w '%{http_code}' \
  -X POST "$base_url/api/tasks" \
  -H 'Content-Type: application/json' \
  --data '{"title":"   "}')"
[[ "$invalid_status" == "400" ]]

delete_status="$(curl --silent --show-error -o /dev/null -w '%{http_code}' \
  -X DELETE "$base_url/api/tasks/$task_id")"
[[ "$delete_status" == "204" ]]

echo "Compose task API smoke tests passed."
