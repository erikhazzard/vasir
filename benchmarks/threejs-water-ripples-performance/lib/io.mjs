import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function writeAtomic(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, contents);
  await rename(temporaryPath, path);
}

export async function writeJson(path, value) {
  await writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeBase64(path, value) {
  await writeAtomic(path, Buffer.from(value, 'base64'));
}
