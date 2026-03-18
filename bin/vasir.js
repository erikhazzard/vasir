#!/usr/bin/env node

import process from "node:process";

import { runCommandLine } from "../install/command-runner.js";

process.exitCode = await runCommandLine(process.argv, {
  repositoryUrl: process.env.VASIR_REPOSITORY_URL
});
