import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runStorytellingAgent } from './storytelling-agent-runtime.js';

export const DM_EXPANSION_RUNTIME_VERSION = 'dm-declared-model-cohort-runtime-v1';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

// Codex always uses the original, byte-pinned restricted DM transport. Claude
// uses the explicit Read-only transport; there is no provider/account fallback.
export async function runDungeonMasterExpansionAgent({ configuration, frozenCodexRuntime, evidenceDirectory,
  promptText, skillSnapshot = null, timeoutMs, outputSchema = null,
  environmentVariables = process.env, spawnImplementation = childProcess.spawn }) {
  if (configuration.provider === 'codex') {
    if (typeof frozenCodexRuntime !== 'function') throw new Error('Original frozen Codex runtime is required.');
    return frozenCodexRuntime({ configuration, evidenceDirectory, promptText, skillSnapshot, timeoutMs, outputSchema, environmentVariables, spawnImplementation });
  }
  if (configuration.provider !== 'claude' || outputSchema) throw new Error('Only declared Claude writers and fixed Codex judges are supported.');
  if (!evidenceDirectory) throw new Error('Raw evidence directory is required.');
  fs.mkdirSync(evidenceDirectory, { recursive: true, mode: 0o700 });
  let stdout = '', stderr = '';
  const spawn = (...args) => {
    const child = spawnImplementation(...args);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    return child;
  };
  const retain = () => {
    fs.writeFileSync(path.join(evidenceDirectory, 'stdout.jsonl'), stdout, { mode: 0o600 });
    fs.writeFileSync(path.join(evidenceDirectory, 'stderr.txt'), stderr, { mode: 0o600 });
    return { rawStreamsRetained: true, stdoutSha256: hash(stdout), stderrSha256: hash(stderr), stdoutBytes: Buffer.byteLength(stdout), stderrBytes: Buffer.byteLength(stderr) };
  };
  try {
    const result = await runStorytellingAgent({ configuration, promptText, skillSnapshot,
      requiredSkillFiles: skillSnapshot ? ['references/adventure-design.md'] : [],
      requiredSkillReadTransport: 'read-tool', timeoutMs, environmentVariables, spawnImplementation: spawn });
    return { ...result, outputText: result.outputText ?? result.text,
      runtimeReceipt: { ...result.runtimeReceipt, expansionRuntimeVersion: DM_EXPANSION_RUNTIME_VERSION,
        requiredSkillReadTransport: 'read-tool', ...retain() } };
  } catch (error) {
    error.context = { ...(error.context ?? {}), expansionRuntimeVersion: DM_EXPANSION_RUNTIME_VERSION, ...retain() };
    throw error;
  }
}
