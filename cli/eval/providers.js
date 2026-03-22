import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF, EVAL_TROUBLESHOOTING_DOCS_REF } from "../docs-ref.js";

export const DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS = 45_000;

function readResponseTextFromOpenAiPayload(responsePayload) {
  if (typeof responsePayload?.output_text === "string" && responsePayload.output_text.trim().length > 0) {
    return responsePayload.output_text.trim();
  }

  if (Array.isArray(responsePayload?.output)) {
    const outputText = responsePayload.output
      .flatMap((outputEntry) => (Array.isArray(outputEntry?.content) ? outputEntry.content : []))
      .map((contentPart) => {
        if (typeof contentPart?.text === "string") {
          return contentPart.text;
        }

        if (typeof contentPart?.text?.value === "string") {
          return contentPart.text.value;
        }

        return "";
      })
      .join("")
      .trim();

    if (outputText.length > 0) {
      return outputText;
    }
  }

  if (typeof responsePayload?.choices?.[0]?.message?.content === "string") {
    return responsePayload.choices[0].message.content;
  }

  const contentParts = responsePayload?.choices?.[0]?.message?.content;
  if (Array.isArray(contentParts)) {
    return contentParts
      .map((contentPart) => {
        if (typeof contentPart?.text === "string") {
          return contentPart.text;
        }

        if (typeof contentPart?.text?.value === "string") {
          return contentPart.text.value;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function readResponseTextFromAnthropicPayload(responsePayload) {
  if (!Array.isArray(responsePayload?.content)) {
    return "";
  }

  return responsePayload.content
    .filter((entry) => entry?.type === "text" && typeof entry.text === "string")
    .map((entry) => entry.text)
    .join("")
    .trim();
}

function inferMockResponseText({ modelDescriptor, promptText }) {
  const promptTextLowerCase = promptText.toLowerCase();
  const skillApplied = promptText.includes("--- Skill Guidance Start ---");
  const modelName = modelDescriptor.model;

  if (promptText.includes("AGENTS Purpose Draft Request")) {
    return JSON.stringify({
      purpose:
        "This repository appears to ship tooling and authored markdown that help teams install, evaluate, and maintain repo-specific agent guidance. Agents should optimize for correct local workflow changes, obvious file ownership, and edits that keep the CLI, templates, and documentation aligned."
    });
  }

  if (promptText.includes("Eval summary facts:")) {
    const hasWorse = promptText.includes("\"overallVerdict\": \"WORSE\"");
    const hasBetter = promptText.includes("\"overallVerdict\": \"BETTER\"");
    const hasIncomplete = promptText.includes("\"runStatus\": \"incomplete\"");
    const hasFailure = promptText.includes("\"rowFailures\": [") && !promptText.includes("\"rowFailures\": []");
    const headline = hasWorse
      ? "WORSE: hard-check regressions are the decisive signal."
      : hasBetter
        ? "BETTER: the measured checks moved in the right direction."
        : "NO SIGNAL: the evidence is mixed.";
    const summary = [
      hasBetter
        ? "The skill improved the measured checks."
        : hasWorse
          ? "The skill regressed on the measured checks."
          : "The run did not produce a clean directional signal.",
      hasIncomplete ? "The run is incomplete." : "",
      hasFailure ? "Row failures are part of the story." : ""
    ].filter(Boolean).join(" ");

    const decisiveReasons = [];
    if (promptText.includes("\"hardChecks\":")) {
      decisiveReasons.push("Hard-check aggregates are the primary floor.");
    }
    if (promptText.includes("\"topRegressions\": [") && !promptText.includes("\"topRegressions\": []")) {
      decisiveReasons.push("Top regressions explain why the treatment lost.");
    }
    if (promptText.includes("\"topImprovements\": [") && !promptText.includes("\"topImprovements\": []")) {
      decisiveReasons.push("Top improvements explain where the treatment helped.");
    }
    if (hasFailure) {
      decisiveReasons.push("Row failures kept the run from being fully complete.");
    }

    return JSON.stringify({
      headline,
      summary,
      decisiveReasons: decisiveReasons.slice(0, 4),
      nextStep: hasWorse
        ? "Tighten the failing path, then rerun the eval."
        : "Use inspect only if you need pair-level evidence."
    });
  }

  if (promptText.includes("Output A:") && promptText.includes("Output B:")) {
    const outputAMatch = promptText.match(/Output A:\n([\s\S]*?)\n\nOutput B:/);
    const outputBMatch = promptText.match(/Output B:\n([\s\S]*?)\n\nReturn JSON only/);
    const outputA = outputAMatch?.[1] ?? "";
    const outputB = outputBMatch?.[1] ?? "";
    const scoreOutput = (text) => {
      const lowerText = text.toLowerCase();
      let score = 0;
      if (lowerText.includes("abortcontroller")) {
        score += 2;
      }
      if (lowerText.includes("loading")) {
        score += 1;
      }
      if (lowerText.includes("role=\"alert\"")) {
        score += 1;
      }
      if (lowerText.includes("starttransition")) {
        score += 1;
      }
      if (lowerText.includes("usedeferredvalue")) {
        score += 1;
      }
      if (lowerText.includes("seed")) {
        score += 1;
      }
      if (lowerText.includes("rng")) {
        score += 1;
      }
      if (lowerText.includes("clock")) {
        score += 1;
      }
      if (lowerText.includes("replay")) {
        score += 1;
      }
      if (lowerText.includes("math.random")) {
        score -= 2;
      }
      if (lowerText.includes("date.now")) {
        score -= 2;
      }
      if (lowerText.includes("settimeout")) {
        score -= 2;
      }
      if (lowerText.includes("usecontext(") || lowerText.includes("global store")) {
        score -= 2;
      }
      return score;
    };
    const scoreA = scoreOutput(outputA);
    const scoreB = scoreOutput(outputB);
    const winner = scoreA === scoreB ? "tie" : scoreA > scoreB ? "a" : "b";
    return JSON.stringify({
      winner,
      confidence: 0.75,
      reason: winner === "tie" ? "Both outputs are equally strong." : "One output followed the rubric more closely."
    });
  }

  if (modelName === "flat") {
    return "Use a straightforward implementation with a generic effect and shared state if needed.";
  }

  if (promptTextLowerCase.includes("userpanel")) {
    if (skillApplied) {
      return [
        "Use local component state for loading and error handling.",
        "Create an AbortController inside useEffect and abort on cleanup.",
        "Render an explicit loading state and render errors with role=\"alert\"."
      ].join(" ");
    }

    return "Fetch the user in useEffect and render the result once it loads.";
  }

  if (promptTextLowerCase.includes("searchbox")) {
    if (skillApplied) {
      return [
        "Keep query in local state.",
        "Use useDeferredValue for the displayed query.",
        "Use startTransition when kicking off the expensive query update."
      ].join(" ");
    }

    return "Store query in state and useEffect to run the search whenever the query changes.";
  }

  if (
    promptTextLowerCase.includes("random reward") ||
    promptTextLowerCase.includes("replayable") ||
    promptTextLowerCase.includes("critical hit") ||
    promptTextLowerCase.includes("cooldown") ||
    promptTextLowerCase.includes("loot drop") ||
    promptTextLowerCase.includes("ready\" toast") ||
    promptTextLowerCase.includes("ready toast")
  ) {
    if (skillApplied) {
      return "Use a seeded rng instead of Math.random(). Drive time from an injected clock with explicit ticks instead of Date.now() or setTimeout(). Capture the seed and tick timeline in a replay regression test.";
    }

    return "Use Math.random() to pick the reward, Date.now() to label the event, and setTimeout() until the flaky path reproduces.";
  }

  if (promptTextLowerCase.includes("purchase flow") || promptTextLowerCase.includes("value-path")) {
    if (skillApplied) {
      return [
        "Add a deterministic integration test for the end-to-end purchase flow.",
        "Assert observable outcomes instead of private helper calls.",
        "Treat the test as the primary proof of the user journey."
      ].join(" ");
    }

    return "Add a unit test for the helper and assert the mocked function was called.";
  }

  return skillApplied
    ? "Follow the skill guidance and make the implementation explicit."
    : "Provide a generic answer.";
}

async function runOpenAiModel({
  modelDescriptor,
  systemPrompt,
  userPrompt,
  environmentVariables,
  fetchImplementation,
  requestTimeoutMs = DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS
}) {
  const apiKey = environmentVariables.OPENAI_API_KEY;
  if (!apiKey) {
    throw new VasirCliError({
      code: "EVAL_PROVIDER_AUTH_MISSING",
      message: "OPENAI_API_KEY is required for OpenAI eval models.",
      suggestion:
        "Add `OPENAI_API_KEY` to `keys.json`, set it in the environment, rerun interactively so Vasir can prompt for it, or use `--model mock` for a local smoke test.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  const baseUrl = environmentVariables.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const timeoutError = () =>
    new VasirCliError({
      code: "EVAL_PROVIDER_TIMEOUT",
      message: `OpenAI eval request timed out for ${modelDescriptor.id} after ${requestTimeoutMs}ms.`,
      suggestion:
        "Retry the eval, reduce the live model set, or rerun with `--model mock` to isolate the harness from provider latency.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  const abortController = typeof AbortController === "function" ? new AbortController() : null;
  let timeoutHandle = null;

  try {
    const fetchPromise = fetchImplementation(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelDescriptor.model,
        temperature: 0.2,
        instructions: systemPrompt,
        input: userPrompt
      }),
      ...(abortController ? { signal: abortController.signal } : {})
    });
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        abortController?.abort();
        reject(timeoutError());
      }, requestTimeoutMs);
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    const responsePayload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new VasirCliError({
        code: "EVAL_PROVIDER_FAILED",
        message: `OpenAI eval request failed for ${modelDescriptor.id}.`,
        suggestion:
          "Inspect the OpenAI model id and credentials, or rerun with `--model mock` to isolate the eval harness from the provider.",
        context: {
          provider: modelDescriptor.provider,
          model: modelDescriptor.model,
          responsePayload
        },
        docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
      });
    }

    return {
      text: readResponseTextFromOpenAiPayload(responsePayload),
      usage: responsePayload?.usage ?? null
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw timeoutError();
    }
    throw error;
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function runAnthropicModel({
  modelDescriptor,
  systemPrompt,
  userPrompt,
  environmentVariables,
  fetchImplementation,
  requestTimeoutMs = DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS
}) {
  const apiKey = environmentVariables.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new VasirCliError({
      code: "EVAL_PROVIDER_AUTH_MISSING",
      message: "ANTHROPIC_API_KEY is required for Anthropic eval models.",
      suggestion:
        "Add `ANTHROPIC_API_KEY` to `keys.json`, set it in the environment, rerun interactively so Vasir can prompt for it, or use `--model mock` for a local smoke test.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  }

  const baseUrl = environmentVariables.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
  const timeoutError = () =>
    new VasirCliError({
      code: "EVAL_PROVIDER_TIMEOUT",
      message: `Anthropic eval request timed out for ${modelDescriptor.id} after ${requestTimeoutMs}ms.`,
      suggestion:
        "Retry the eval, reduce the live model set, or rerun with `--model mock` to isolate the harness from provider latency.",
      docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
    });
  const abortController = typeof AbortController === "function" ? new AbortController() : null;
  let timeoutHandle = null;

  try {
    const fetchPromise = fetchImplementation(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: modelDescriptor.model,
        max_tokens: 1200,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      }),
      ...(abortController ? { signal: abortController.signal } : {})
    });
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        abortController?.abort();
        reject(timeoutError());
      }, requestTimeoutMs);
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    const responsePayload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new VasirCliError({
        code: "EVAL_PROVIDER_FAILED",
        message: `Anthropic eval request failed for ${modelDescriptor.id}.`,
        suggestion:
          "Inspect the Anthropic model id and credentials, or rerun with `--model mock` to isolate the eval harness from the provider.",
        context: {
          provider: modelDescriptor.provider,
          model: modelDescriptor.model,
          responsePayload
        },
        docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
      });
    }

    return {
      text: readResponseTextFromAnthropicPayload(responsePayload),
      usage: responsePayload?.usage ?? null
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw timeoutError();
    }
    throw error;
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function generateEvalResponse({
  modelDescriptor,
  systemPrompt,
  userPrompt,
  environmentVariables,
  fetchImplementation = globalThis.fetch,
  requestTimeoutMs = DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS
}) {
  if (modelDescriptor.provider === "mock") {
    return {
      text: inferMockResponseText({
        modelDescriptor,
        promptText: `${systemPrompt}\n${userPrompt}`
      }),
      usage: null
    };
  }

  if (typeof fetchImplementation !== "function") {
    throw new VasirCliError({
      code: "EVAL_FETCH_UNAVAILABLE",
      message: "Fetch is unavailable for live eval providers.",
      suggestion:
        "Use `vasir eval run <skill> --model mock` for a local smoke test or run Vasir in a Node environment with fetch support.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  if (modelDescriptor.provider === "openai") {
    return runOpenAiModel({
      modelDescriptor,
      systemPrompt,
      userPrompt,
      environmentVariables,
      fetchImplementation,
      requestTimeoutMs
    });
  }

  if (modelDescriptor.provider === "anthropic") {
    return runAnthropicModel({
      modelDescriptor,
      systemPrompt,
      userPrompt,
      environmentVariables,
      fetchImplementation,
      requestTimeoutMs
    });
  }

  throw new VasirCliError({
    code: "EVAL_PROVIDER_NOT_SUPPORTED",
    message: `Unsupported eval provider: ${modelDescriptor.provider}`,
    suggestion:
      "Use `--model openai`, `--model opus`, `--model mock`, or a full supported descriptor such as `openai:gpt-5.4`.",
    docsRef: EVAL_REFERENCE_DOCS_REF
  });
}
