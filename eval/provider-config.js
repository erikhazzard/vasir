import { VasirCliError } from "../install/cli-error.js";
import {
  EVAL_REFERENCE_DOCS_REF,
  EVAL_TROUBLESHOOTING_DOCS_REF
} from "../install/docs-ref.js";

const DEFAULT_EVAL_MODELS = Object.freeze([
  "openai:gpt-5.4",
  "anthropic:claude-opus-4-6"
]);

const MODEL_ALIASES = Object.freeze({
  openai: "openai:gpt-5.4",
  "gpt-5.4": "openai:gpt-5.4",
  anthropic: "anthropic:claude-opus-4-6",
  opus: "anthropic:claude-opus-4-6",
  "opus4.6": "anthropic:claude-opus-4-6",
  "opus-4.6": "anthropic:claude-opus-4-6",
  "claude-opus-4-6": "anthropic:claude-opus-4-6",
  mock: "mock:skill-aware"
});

const PROVIDER_REQUIREMENTS = Object.freeze({
  openai: {
    providerLabel: "OpenAI",
    apiKeyName: "OPENAI_API_KEY",
    defaultModelId: "openai:gpt-5.4"
  },
  anthropic: {
    providerLabel: "Anthropic",
    apiKeyName: "ANTHROPIC_API_KEY",
    defaultModelId: "anthropic:claude-opus-4-6"
  }
});

function parseModelDescriptor(rawDescriptor) {
  const trimmedDescriptor = rawDescriptor.trim();
  if (trimmedDescriptor.length === 0) {
    return null;
  }

  const normalizedAlias = MODEL_ALIASES[trimmedDescriptor.toLowerCase()];
  const descriptorText = normalizedAlias ?? trimmedDescriptor;
  const separatorIndex = descriptorText.indexOf(":");

  if (separatorIndex <= 0 || separatorIndex === descriptorText.length - 1) {
    throw new VasirCliError({
      code: "EVAL_MODEL_DESCRIPTOR_INVALID",
      message: `Eval model descriptor is invalid: ${trimmedDescriptor}`,
      suggestion:
        "Use `--model` with `openai`, `opus`, `mock`, or a full `provider:model` descriptor such as `openai:gpt-5.4`.",
      docsRef: EVAL_REFERENCE_DOCS_REF
    });
  }

  const provider = descriptorText.slice(0, separatorIndex).toLowerCase();
  const model = descriptorText.slice(separatorIndex + 1).trim();
  return {
    id: `${provider}:${model}`,
    provider,
    model
  };
}

function deduplicateModelDescriptors(modelDescriptors) {
  const seenModelIds = new Set();
  const deduplicatedDescriptors = [];

  for (const modelDescriptor of modelDescriptors) {
    if (seenModelIds.has(modelDescriptor.id)) {
      continue;
    }

    seenModelIds.add(modelDescriptor.id);
    deduplicatedDescriptors.push(modelDescriptor);
  }

  return deduplicatedDescriptors;
}

function readRequestedDescriptorList({ requestedModelArguments, environmentVariables }) {
  if (requestedModelArguments.length > 0) {
    return requestedModelArguments;
  }

  const rawDescriptorList = environmentVariables.VASIR_EVAL_MODELS;
  if (typeof rawDescriptorList === "string" && rawDescriptorList.trim().length > 0) {
    return rawDescriptorList.split(",");
  }

  return DEFAULT_EVAL_MODELS;
}

function createMissingCredentialError() {
  return new VasirCliError({
    code: "EVAL_MODELS_NOT_CONFIGURED",
    message: "No eval models are ready to run.",
    suggestion:
      "Add provider keys to `keys.json`, set them in the environment, or run `vasir eval run <skill> --model mock` for a zero-cost local smoke test.",
    docsRef: EVAL_REFERENCE_DOCS_REF
  });
}

function createCancelledError() {
  return new VasirCliError({
    code: "EVAL_CANCELLED",
    message: "Eval setup was cancelled before any model ran.",
    suggestion:
      "Rerun `vasir eval run <skill>` and provide a provider key, add it to `keys.json`, skip the provider, or pass `--model mock` for a local smoke test.",
    docsRef: EVAL_TROUBLESHOOTING_DOCS_REF
  });
}

async function resolveProviderCredential({
  provider,
  resolvedEnvironmentVariables,
  promptForMissingCredential
}) {
  const providerRequirement = PROVIDER_REQUIREMENTS[provider];
  if (!providerRequirement) {
    return {
      status: "ready",
      environmentVariables: resolvedEnvironmentVariables
    };
  }

  if (resolvedEnvironmentVariables[providerRequirement.apiKeyName]) {
    return {
      status: "ready",
      environmentVariables: resolvedEnvironmentVariables
    };
  }

  if (!promptForMissingCredential) {
    return {
      status: "skipped",
      environmentVariables: resolvedEnvironmentVariables,
      reason: `missing ${providerRequirement.apiKeyName}`
    };
  }

  const promptResult = await promptForMissingCredential({
    providerLabel: providerRequirement.providerLabel,
    apiKeyName: providerRequirement.apiKeyName,
    defaultModelId: providerRequirement.defaultModelId
  });

  if (promptResult?.cancelled) {
    throw createCancelledError();
  }

  if (typeof promptResult?.apiKeyValue === "string" && promptResult.apiKeyValue.length > 0) {
    return {
      status: "ready",
      environmentVariables: {
        ...resolvedEnvironmentVariables,
        [providerRequirement.apiKeyName]: promptResult.apiKeyValue
      }
    };
  }

  return {
    status: "skipped",
    environmentVariables: resolvedEnvironmentVariables,
    reason: `missing ${providerRequirement.apiKeyName}`
  };
}

export async function resolveEvalModels({
  requestedModelArguments = [],
  environmentVariables,
  promptForMissingCredential = null
}) {
  const requestedDescriptorList = readRequestedDescriptorList({
    requestedModelArguments,
    environmentVariables
  });
  const parsedDescriptors = deduplicateModelDescriptors(
    requestedDescriptorList.map(parseModelDescriptor).filter(Boolean)
  );

  if (parsedDescriptors.length === 0) {
    throw createMissingCredentialError();
  }

  let resolvedEnvironmentVariables = { ...environmentVariables };
  const skippedProviders = [];
  const providerAvailability = new Map();
  const runnableDescriptors = [];

  for (const modelDescriptor of parsedDescriptors) {
    const providerRequirement = PROVIDER_REQUIREMENTS[modelDescriptor.provider];
    if (!providerRequirement) {
      runnableDescriptors.push(modelDescriptor);
      continue;
    }

    let providerState = providerAvailability.get(modelDescriptor.provider);
    if (!providerState) {
      const resolvedCredential = await resolveProviderCredential({
        provider: modelDescriptor.provider,
        resolvedEnvironmentVariables,
        promptForMissingCredential
      });
      resolvedEnvironmentVariables = resolvedCredential.environmentVariables;
      providerState = resolvedCredential;
      providerAvailability.set(modelDescriptor.provider, providerState);
    }

    if (providerState.status !== "ready") {
      skippedProviders.push({
        provider: modelDescriptor.provider,
        modelId: modelDescriptor.id,
        reason: providerState.reason
      });
      continue;
    }

    runnableDescriptors.push(modelDescriptor);
  }

  if (runnableDescriptors.length === 0) {
    throw createMissingCredentialError();
  }

  return {
    modelDescriptors: runnableDescriptors,
    environmentVariables: resolvedEnvironmentVariables,
    skippedProviders
  };
}
