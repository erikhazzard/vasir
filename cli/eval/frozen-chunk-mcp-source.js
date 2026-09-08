// Minimal, local-only read transport. The generated server has no path-taking
// API, no shell execution, no network operations, and no environment access.
export function frozenChunkMcpSource(chunks, directory, frameFunction) {
  return `"use strict";
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const crypto = require("node:crypto");
const chunks = ${JSON.stringify(chunks.map(({ contents, ...chunk }) => chunk))};
const directory = ${JSON.stringify(directory)};
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const frame = ${frameFunction.toString()};
const send = value => process.stdout.write(JSON.stringify(value) + "\\n");
const tool = {name:"read_chunk",description:"Read one bounded chunk from the local files supplied for this request. No files exist unless supplied by the request.",inputSchema:{type:"object",properties:{index:{type:"integer",minimum:0}},required:["index"],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}};
readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on("line", line => {
  let request;
  try { request = JSON.parse(line); } catch { return; }
  if (request.id === undefined) return;
  const reply = result => send({jsonrpc:"2.0",id:request.id,result});
  if (request.method === "initialize") return reply({protocolVersion:request.params?.protocolVersion || "2025-06-18",capabilities:{tools:{}},serverInfo:{name:"benchmark-frozen-reader",version:"1.0.0"}});
  if (request.method === "ping") return reply({});
  if (request.method === "tools/list") return reply({tools:[tool]});
  if (request.method === "tools/call") {
    try {
      const args = request.params?.arguments;
      if (request.params?.name !== "read_chunk" || !args || Object.keys(args).length !== 1 || !Number.isInteger(args.index) || args.index < 0 || !chunks[args.index]) throw new Error("No supplied chunk at this index.");
      const chunk = {...chunks[args.index]};
      const source = fs.readFileSync(path.join(directory,chunk.relativePath),"utf8");
      if (hash(source) !== chunk.fileSha256) throw new Error("Frozen file changed.");
      chunk.contents = source.slice(chunk.start,chunk.end);
      if (hash(chunk.contents) !== chunk.sha256 || Buffer.byteLength(chunk.contents) !== chunk.bytes) throw new Error("Frozen chunk changed.");
      return reply({content:[{type:"text",text:frame(chunk)}],isError:false});
    } catch(error) { return reply({content:[{type:"text",text:error.message}],isError:true}); }
  }
  send({jsonrpc:"2.0",id:request.id,error:{code:-32601,message:"Unsupported method"}});
});
`;
}
