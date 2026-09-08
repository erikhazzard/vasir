#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { mkdir, readFile, writeFile, rename, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const [workspaceArgument, queueArgument] = process.argv.slice(2);
const workspace = await realpath(workspaceArgument);
const queue = resolve(queueArgument);
await mkdir(queue, { recursive: true });

export const IMAGE_TOOL = {
  name: 'generate_image',
  description: 'Generate a raster image from a text description, or edit existing local images. Save the resulting image to a workspace path. Image generation can take several minutes.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', description: 'Description of the image to generate or the changes to make.' },
      output_path: { type: 'string', description: 'Destination .png path, relative to the workspace or absolute within it.' },
      referenced_image_paths: { type: 'array', items: { type: 'string' }, description: 'Existing workspace image paths to edit. Omit for a new image.' }
    },
    required: ['prompt', 'output_path'],
    additionalProperties: false
  }
};

function insideWorkspace(value) {
  const path = resolve(workspace, value);
  const rel = relative(workspace, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('Image paths must identify files inside the workspace.');
  return path;
}

async function generateImage(args) {
  if (typeof args.prompt !== 'string' || !args.prompt.trim()) throw new Error('A nonempty image prompt is required.');
  const outputPath = insideWorkspace(args.output_path);
  if (!outputPath.endsWith('.png')) throw new Error('output_path must end in .png.');
  const referencedImagePaths = [];
  for (const value of args.referenced_image_paths ?? []) {
    const path = await realpath(insideWorkspace(value));
    insideWorkspace(path);
    referencedImagePaths.push(path);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  // Resolve the parent after mkdir so a symlink cannot redirect image output.
  insideWorkspace(resolve(await realpath(dirname(outputPath)), outputPath.split(sep).at(-1)));
  const requestId = randomUUID();
  const requestPath = resolve(queue, `${requestId}.request.json`);
  const responsePath = resolve(queue, `${requestId}.response.json`);
  const request = { schemaVersion: 1, requestId, requestedAt: new Date().toISOString(), workspace, prompt: args.prompt, outputPath, referencedImagePaths };
  await writeFile(`${requestPath}.tmp`, `${JSON.stringify(request, null, 2)}\n`);
  await rename(`${requestPath}.tmp`, requestPath);
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    try {
      const response = JSON.parse(await readFile(responsePath, 'utf8'));
      if (response.status !== 'complete') throw new Error(response.error ?? 'Image generation failed.');
      await readFile(outputPath);
      return { content: [{ type: 'text', text: JSON.stringify({ path: outputPath, ...(response.message ? { message: response.message } : {}) }) }] };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error('Image generation did not complete within 20 minutes.');
}

async function dispatch(message) {
  if (message.id === undefined) return;
  let result;
  if (message.method === 'initialize') result = { protocolVersion: message.params?.protocolVersion ?? '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'image-generation', version: '1.0.0' } };
  else if (message.method === 'ping') result = {};
  else if (message.method === 'tools/list') result = { tools: [IMAGE_TOOL] };
  else if (message.method === 'tools/call' && message.params?.name === IMAGE_TOOL.name) {
    try { result = await generateImage(message.params.arguments ?? {}); }
    catch (error) { result = { isError: true, content: [{ type: 'text', text: error.message }] }; }
  } else {
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } })}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n`);
}

createInterface({ input: process.stdin }).on('line', (line) => {
  try { void dispatch(JSON.parse(line)); } catch { /* Ignore invalid framing without polluting stdout. */ }
});
