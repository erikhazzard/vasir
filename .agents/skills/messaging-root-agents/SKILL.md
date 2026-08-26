---
name: messaging-root-agents
description: Messages and reads independent Ratatosk-managed Codex root sessions through verified identity, immediate steering, or explicitly queued delivery. Use when one root agent must communicate with another root outside its collaboration tree; not for spawned subagents.
---

# Messaging Codex Root Agents

This protocol lets one root agent exchange ordinary Codex turns with another Ratatosk-managed root session. It owns cross-root discovery, delivery, and confirmation. Root `AGENTS.md` owns authorization; Codex collaboration tools own agents inside the current root's collaboration tree.

## Core Principle

A visible draft is not delivery. Resolve exactly one target, submit through Ratatosk's durable terminal-input boundary, and verify the resulting Codex state before reporting that a message was steered or queued. Immediate delivery with `Enter` is the default even when the target is active; queued delivery with `Tab` is opt-in only.

## Route

1. If the target appears in `collaboration.list_agents`, use `send_message` or `followup_task`. Stop here.
2. For default immediate delivery, use `thread/read` plus `turn/start` for an idle thread or `turn/steer` for an active turn when the runtime exposes those controls. Require the returned thread/turn identity.
3. Otherwise use Ratatosk's local terminal-input API below. Use this path for explicitly requested queueing because the Codex TUI owns the `Tab` queue behavior.

Never send without current authorization. Send the exact requested text; do not silently rewrite it. An active target does not imply queueing: steer it immediately unless the user explicitly requests `queue`, `after the current turn`, or equivalent deferred delivery. If the target should initiate a cross-root reply, include `Reply to <sender provider session ID> using $messaging-root-agents` in the authorized message. If the sender ID is unavailable, read the reply from the target session instead of inventing an identity.

## Resolve The Target

Require the target Codex provider session ID. Names and working directories are not identities.

```bash
RATATOSK_WORKSPACE="$HOME/Library/Application Support/Ratatosk/workspace"
TARGET_PROVIDER_SESSION_ID='<exact Codex session id>'

TARGET_SESSION_JSON="$(jq -c --arg id "$TARGET_PROVIDER_SESSION_ID" '
  [.sessions[] | select(
    .codexAppServerThreadId == $id or
    .codexCliSessionId == $id or
    .agentSessionIdentity.providerSessionId == $id
  )] |
  if length == 1 then .[0] else error("expected exactly one Ratatosk session") end
' "$RATATOSK_WORKSPACE/state.json")"

TARGET_CLIENT_ID="$(jq -r '.id' <<<"$TARGET_SESSION_JSON")"
jq -e '
  .runtimeStatus == "running" and
  .state == "ready" and
  (.providerActivityState == "idle" or .providerActivityState == "active")
' <<<"$TARGET_SESSION_JSON" >/dev/null
```

If the match is missing or ambiguous, stop. If provider activity is unknown, stop rather than guessing. Re-read `state.json` immediately before delivery. For an active target, submit with `Enter` to steer the current turn; do not wait for idle and do not substitute `Tab` queueing unless deferred delivery was explicitly requested.

## Send Through Ratatosk

Use Ratatosk's local API and the client ID resolved above. Read recent output first and confirm it is the intended Codex TUI at an empty input prompt. The default local port is `3420`; honor `RATATOSK_PORT` when the environment overrides it.

```bash
RATATOSK_API="http://127.0.0.1:${RATATOSK_PORT:-3420}/api"
TARGET_MESSAGE='<exact authorized message>'
ROOT_MESSAGE_INPUT_ID="root-message-$(uuidgen | tr '[:upper:]' '[:lower:]')"
DELIVERY_MODE="${DELIVERY_MODE:-immediate}"

case "$DELIVERY_MODE" in
  immediate) SUBMIT_KEY=$'\r' ;;
  queue) SUBMIT_KEY=$'\t' ;;
  *) echo "DELIVERY_MODE must be immediate or queue" >&2; exit 2 ;;
esac

curl --fail --silent --show-error \
  "$RATATOSK_API/sessions/$TARGET_CLIENT_ID/recent-output?maxBytes=12000"

jq -n \
  --arg message "$TARGET_MESSAGE" \
  --arg submitKey "$SUBMIT_KEY" \
  --arg inputId "$ROOT_MESSAGE_INPUT_ID" \
  '{input: ($message + $submitKey), inputId: $inputId}' |
  curl --fail --silent --show-error \
    -H 'Content-Type: application/json' \
    --data-binary @- \
    "$RATATOSK_API/sessions/$TARGET_CLIENT_ID/input" |
  jq -e '
    {
      accepted: .pendingInput.accepted,
      duplicate: .pendingInput.duplicate,
      receipt: .inputReceipt
    } |
    select(.accepted == true)
  '
```

Pass `TARGET_MESSAGE` through `jq`; do not splice message text into executable shell source. `immediate` appends `"\r"` (`Enter`): it starts an idle target's turn or steers an active target's current turn. `queue` appends `"\t"` (`Tab`): in Ratatosk's Codex TUI it queues the message for the turn after the current one. Never infer `queue` merely because the target is active. Keep `ROOT_MESSAGE_INPUT_ID` unchanged when retrying the same logical send; create a new ID for a different message.

Keep the message at 3,999 characters or fewer because Ratatosk's terminal-input boundary caps the submitted string, including the submit key, at 4,000 characters.

## Verify And Read The Reply

Do not claim success because the text is visible. Confirm the fact appropriate to the requested delivery mode:

- For `immediate`, the target rollout appends the exact user message, or recent terminal output shows the submitted turn followed by continued agent work rather than editable text at the bottom prompt.
- For `queue`, recent terminal output must show Codex's queued-message state. Report it as **queued**, not delivered. Treat it as delivered only after the current turn finishes and the rollout appends the exact user message as the next turn.

Locate the rollout by filename, not by searching file contents; another session may mention the target ID.

```bash
TARGET_ROLLOUT="$(rg --files "$RATATOSK_WORKSPACE/agent-account-contexts/codex" |
  rg "/rollout-[^/]*-${TARGET_PROVIDER_SESSION_ID}\\.jsonl$")"

jq -s -e --arg message "$TARGET_MESSAGE" '
  any(.[];
    .type == "response_item" and
    .payload.type == "message" and
    .payload.role == "user" and
    any(.payload.content[]?; .text == $message)
  )
' "$TARGET_ROLLOUT" >/dev/null

jq -s -r '
  [
    .[] |
    select(
      .type == "response_item" and
      .payload.type == "message" and
      .payload.role == "assistant"
    ) |
    [.payload.content[]?.text // empty] | join("\n")
  ] |
  last // empty
' "$TARGET_ROLLOUT"
```

Wait for the target to return to idle before treating its latest assistant message as the completed reply. Keep waits interruptible and report a timeout honestly.

## Never Do These

- Append to a rollout JSONL file. That edits history; it does not deliver a turn.
- Select a target by tab name, cwd, or fuzzy transcript search.
- Overwrite or submit a pre-existing draft in the target terminal.
- Queue with `Tab` merely because the target is active; active targets receive immediate `Enter` steering by default.
- Report "sent" from the terminal input receipt alone; durable Ratatosk acceptance and provider acceptance are different facts.
- Use cross-root terminal delivery for a spawned subagent that native collaboration tools already own.

## Close-Out

Report the target provider session ID, delivery route, acceptance evidence, and—only when requested—the completed reply. Do not expose unrelated transcript content.
