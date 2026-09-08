import crypto from "node:crypto";
import { isDeepStrictEqual } from "node:util";

// Same-origin, release-pinned lazy evidence. The small Writing projection remains
// shared; opening a creation report does not download older response archives.
export const WRITING_CREATION_ARCHIVE = Object.freeze({
  benchmarkId: "storytelling-magic-discovery",
  path: "writing-creation-responses.js",
  href: "./writing-creation-responses.js",
  globalName: "VASIR_WRITING_CREATION_RESPONSES"
});

/** Pure, synchronous browser hydrator. Its source is included in the creation
 * archive, so it must not depend on imports, eval, network access, or globals. */
export function hydrateWritingCreationResponseArchive(wire) {
  if (wire === null) return null;
  const fail = () => { throw new Error("Creation review archive or original-review reference changed."); };
  const archive = wire?.archive;
  if (wire?.kind !== "vasirbenchmark-creation-review-references" || wire.schemaVersion !== 1 ||
    archive?.kind !== "vasirbenchmark-writing-responses" || archive.schemaVersion !== 1 ||
    !Array.isArray(archive.responses) || !Array.isArray(archive.judgeRequests) || !Array.isArray(archive.judgeProfiles)) fail();
  const profiles = new Map(archive.judgeProfiles.map(profile => [profile.id, profile]));
  const requests = new Map();
  if (profiles.size !== archive.judgeProfiles.length) fail();
  for (const request of archive.judgeRequests) {
    if (requests.has(request.id) || request.id !== `${request.profileId}:${request.promptSha256}` ||
      !profiles.has(request.profileId) || !Array.isArray(request.candidateOrder)) fail();
    let evaluations = null;
    if (request.status === "complete") {
      let original;
      try { original = JSON.parse(request.outputText); } catch { fail(); }
      if (!Array.isArray(original?.evaluations) || original.evaluations.length !== 2 ||
        new Set(original.evaluations.map(candidate => candidate.candidateId)).size !== 2) fail();
      evaluations = new Map(original.evaluations.map(candidate => [candidate.candidateId, candidate]));
    }
    requests.set(request.id, { request, evaluations });
  }
  return { ...archive, responses: archive.responses.map(response => {
    if (response.benchmarkId !== "storytelling-magic-discovery" || !Array.isArray(response.judgments)) fail();
    const seats = new Set();
    return { ...response, judgments: response.judgments.map(judge => {
      const source = requests.get(judge.requestId), request = source?.request;
      const profile = profiles.get(judge.reviewerId), original = source?.evaluations?.get(judge.candidateId);
      if (Object.hasOwn(judge, "dimensions") || Object.hasOwn(judge, "rationale") || seats.has(judge.reviewerId) ||
        !original || !profile || judge.profileId !== profile.id || request.profileId !== profile.id ||
        judge.judgeConfigurationId !== profile.configurationId || judge.contextMode !== profile.contextMode ||
        judge.contextSha256 !== profile.contextSha256 || judge.promptSha256 !== request.promptSha256 ||
        judge.answerSha256 !== request.outputSha256 ||
        !request.candidateOrder.some(candidate => candidate.candidateId === judge.candidateId && candidate.outputSha256 === response.provenance?.outputSha256) ||
        !Array.isArray(original.dimensions) || original.dimensions.length !== 10 ||
        new Set(original.dimensions.map(dimension => dimension.id)).size !== 10 ||
        original.dimensions.some(dimension => typeof dimension.id !== "string" || !Number.isInteger(dimension.rating) ||
          dimension.rating < 1 || dimension.rating > 10 || typeof dimension.evidence !== "string" || !dimension.evidence.trim()) ||
        typeof original.review !== "string" || !original.review.trim() ||
        judge.score !== original.dimensions.reduce((sum, dimension) => sum + dimension.rating, 0)) fail();
      seats.add(judge.reviewerId);
      return { ...judge, dimensions: Object.fromEntries(original.dimensions.map(dimension =>
        [dimension.id, { rating: dimension.rating, reason: null, evidence: dimension.evidence }])), rationale: original.review };
    }) };
  }) };
}

/** Drop only reconstructible duplicate fields, never any original final bytes.
 * Native SHA validation happens before encoding; the public release and browser
 * proof independently verify the retained originals after synchronous hydration. */
export function encodeWritingCreationResponseArchive(archive) {
  if (archive === null) return null;
  if (!Array.isArray(archive?.judgeRequests) || !Array.isArray(archive.responses)) throw new Error("Invalid creation response archive.");
  for (const request of archive.judgeRequests) {
    const observed = typeof request.outputText === "string" ? crypto.createHash("sha256").update(request.outputText).digest("hex") : null;
    if ((request.outputText !== null && typeof request.outputText !== "string") || observed !== request.outputSha256) {
      throw new Error("Creation original judge JSON hash changed before encoding.");
    }
  }
  const wire = { kind: "vasirbenchmark-creation-review-references", schemaVersion: 1,
    archive: { ...archive, responses: archive.responses.map(response => ({ ...response,
      judgments: response.judgments.map(judge => {
        const { dimensions: _dimensions, rationale: _rationale, ...reference } = judge;
        return reference;
      }) })) } };
  if (!isDeepStrictEqual(hydrateWritingCreationResponseArchive(wire), archive)) {
    throw new Error("Creation readable review differs from its hash-verified original JSON.");
  }
  return wire;
}

export function serializeWritingCreationResponseArchive(archive) {
  const wire = encodeWritingCreationResponseArchive(archive);
  const serialized = JSON.stringify(wire).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  // Keep the absent-archive placeholder byte-identical. Populated archives expose
  // the same fully hydrated global before script.onload, with no async race.
  const value = wire === null ? serialized : `(${hydrateWritingCreationResponseArchive.toString()})(${serialized})`;
  return `(function () { 'use strict'; window.VASIR_WRITING_CREATION_RESPONSES = Object.freeze(${value}); }());\n`;
}

export function splitWritingResponseArchives(responseBundle) {
  if (!responseBundle) return { primary: null, creation: null };
  const primary = structuredClone(responseBundle);
  let creation = null;
  for (const child of primary.benchmarkResponses ?? []) {
    if (child.benchmarkId !== WRITING_CREATION_ARCHIVE.benchmarkId) continue;
    if (creation || !child.responseBundle) throw new Error("Invalid or duplicated creation archive.");
    creation = child.responseBundle;
    delete child.responseBundle;
    child.archive = { href: WRITING_CREATION_ARCHIVE.href, globalName: WRITING_CREATION_ARCHIVE.globalName };
  }
  return { primary, creation };
}

export function hydrateWritingResponseArchives(primary, creation) {
  if (!primary) {
    if (creation) throw new Error("Unselected creation archive.");
    return null;
  }
  const complete = structuredClone(primary);
  let count = 0;
  for (const child of complete.benchmarkResponses ?? []) {
    if (!child.archive) continue;
    if (child.benchmarkId !== WRITING_CREATION_ARCHIVE.benchmarkId ||
      child.archive.href !== WRITING_CREATION_ARCHIVE.href || child.archive.globalName !== WRITING_CREATION_ARCHIVE.globalName ||
      !creation || child.responseBundle || ++count !== 1) throw new Error("Writing archive descriptor changed or evidence is missing.");
    delete child.archive;
    child.responseBundle = structuredClone(creation);
  }
  if (Boolean(creation) !== Boolean(count)) throw new Error("Unselected creation archive.");
  return complete;
}
