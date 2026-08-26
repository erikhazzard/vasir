import { VasirCliError } from "../cli-error.js";
import { EVAL_REFERENCE_DOCS_REF } from "../docs-ref.js";

const MODEL_REASONING_LEVELS = Object.freeze({
  "codex:gpt-5.6-sol": Object.freeze(["low", "medium", "high", "xhigh", "max", "ultra"]),
  "codex:gpt-5.6-terra": Object.freeze(["low", "medium", "high", "xhigh", "max", "ultra"]),
  "codex:gpt-5.6-luna": Object.freeze(["low", "medium", "high", "xhigh", "max"]),
  "claude:fable": Object.freeze(["low", "medium", "high", "xhigh", "max"]),
  "claude:opus": Object.freeze(["low", "medium", "high", "xhigh", "max"])
});

const MODEL_ALIASES = Object.freeze({
  sol: "codex:gpt-5.6-sol",
  terra: "codex:gpt-5.6-terra",
  luna: "codex:gpt-5.6-luna",
  fable: "claude:fable",
  opus: "claude:opus",
  "gpt-5.6-sol": "codex:gpt-5.6-sol",
  "gpt-5.6-terra": "codex:gpt-5.6-terra",
  "gpt-5.6-luna": "codex:gpt-5.6-luna"
});

function createConfiguration(provider, model, reasoning) {
  return {
    id: `${provider}:${model}@${reasoning}`,
    provider,
    model,
    reasoning
  };
}

function parseModelSelector(rawSelector) {
  const selector = String(rawSelector ?? "").trim();
  const atIndex = selector.lastIndexOf("@");
  const rawDescriptor = atIndex > 0 ? selector.slice(0, atIndex) : selector;
  const descriptor = MODEL_ALIASES[rawDescriptor.toLowerCase()] ?? rawDescriptor;
  const embeddedReasoning = atIndex > 0 ? selector.slice(atIndex + 1).trim() : null;
  const colonIndex = descriptor.indexOf(":");
  if (colonIndex <= 0 || colonIndex === descriptor.length - 1) {
    throw new VasirCliError({
      code: "EVAL_BENCHMARK_MODEL_INVALID",
      message: `Benchmark model selector is invalid: ${selector}`,
      suggestion:
        "Use a model alias such as `sol` or a fresh-agent descriptor such as `codex:gpt-5.6-sol@max` or `claude:opus@xhigh`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const provider = descriptor.slice(0, colonIndex).toLowerCase();
  const model = descriptor.slice(colonIndex + 1);
  if (!MODEL_REASONING_LEVELS[`${provider}:${model}`]) {
    throw new VasirCliError({
      code: "EVAL_BENCHMARK_MODEL_UNSUPPORTED",
      message: `Benchmark fresh-agent model is unsupported: ${provider}:${model}`,
      suggestion:
        "Use GPT-5.6 Sol, Terra, or Luna through `codex:`, or Claude Fable or Opus through `claude:`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  return { provider, model, embeddedReasoning };
}

function resolveReasoningLevels({ provider, model, embeddedReasoning, requestedReasoningArguments }) {
  const availableLevels = MODEL_REASONING_LEVELS[`${provider}:${model}`];
  const requestedLevels = embeddedReasoning
    ? [embeddedReasoning]
    : requestedReasoningArguments.length > 0
      ? requestedReasoningArguments
      : availableLevels;

  for (const reasoning of requestedLevels) {
    if (!availableLevels.includes(reasoning)) {
      throw new VasirCliError({
        code: "EVAL_BENCHMARK_REASONING_UNSUPPORTED",
        message: `${provider}:${model} does not advertise reasoning effort ${reasoning}.`,
        suggestion: `Use one of: ${availableLevels.join(", ")}.`,
        docsRef: EVAL_REFERENCE_DOCS_REF
      });
    }
  }

  return requestedLevels;
}

export function resolveBenchmarkConfigurations({
  requestedModelArguments = [],
  requestedReasoningArguments = []
} = {}) {
  const selectors = requestedModelArguments.length > 0
    ? requestedModelArguments
    : Object.keys(MODEL_REASONING_LEVELS);
  const configurations = [];
  const seen = new Set();

  for (const selector of selectors) {
    const parsedSelector = parseModelSelector(selector);
    const reasoningLevels = resolveReasoningLevels({
      ...parsedSelector,
      requestedReasoningArguments
    });
    for (const reasoning of reasoningLevels) {
      const configuration = createConfiguration(
        parsedSelector.provider,
        parsedSelector.model,
        reasoning
      );
      if (!seen.has(configuration.id)) {
        seen.add(configuration.id);
        configurations.push(configuration);
      }
    }
  }

  return configurations;
}

export function resolveBenchmarkConfiguration(selector) {
  const parsedSelector = parseModelSelector(selector);
  if (!parsedSelector.embeddedReasoning) {
    throw new VasirCliError({
      code: "EVAL_BENCHMARK_REASONING_REQUIRED",
      message: `Benchmark model selector must include one reasoning effort: ${selector}`,
      suggestion: "Use an exact selector such as `codex:gpt-5.6-sol@ultra` or `claude:opus@max`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  return createConfiguration(
    parsedSelector.provider,
    parsedSelector.model,
    resolveReasoningLevels({
      ...parsedSelector,
      requestedReasoningArguments: []
    })[0]
  );
}

export function getDefaultBenchmarkConfigurationCount() {
  return Object.values(MODEL_REASONING_LEVELS).reduce(
    (total, reasoningLevels) => total + reasoningLevels.length,
    0
  );
}
