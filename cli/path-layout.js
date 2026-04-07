import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export function getHomeDirectory() {
  return os.homedir();
}

export function buildGlobalPaths({ homeDirectory = getHomeDirectory() } = {}) {
  const agentsHomeDirectory = path.join(homeDirectory, ".agents");
  const claudeHomeDirectory = path.join(homeDirectory, ".claude");
  const codexHomeDirectory = path.join(homeDirectory, ".codex");
  const globalCatalogDirectory = path.join(agentsHomeDirectory, "vasir");

  return {
    homeDirectory,
    agentsHomeDirectory,
    claudeHomeDirectory,
    codexHomeDirectory,
    globalCatalogDirectory,
    globalClaudeAliasPath: path.join(claudeHomeDirectory, "vasir"),
    globalCodexAliasPath: path.join(codexHomeDirectory, "vasir")
  };
}

export function buildProjectPaths({
  currentWorkingDirectory = process.cwd(),
  projectRootDirectory = null
} = {}) {
  const resolvedProjectRootDirectory = findProjectRootDirectory({
    currentWorkingDirectory,
    projectRootDirectory
  });
  const agentsDirectory = path.join(resolvedProjectRootDirectory, ".agents");
  const claudeDirectory = path.join(resolvedProjectRootDirectory, ".claude");
  const codexDirectory = path.join(resolvedProjectRootDirectory, ".codex");
  const projectSkillsDirectory = path.join(agentsDirectory, "skills");

  return {
    projectRootDirectory: resolvedProjectRootDirectory,
    agentsDirectory,
    claudeDirectory,
    codexDirectory,
    projectSkillsDirectory,
    claudeSkillsAliasPath: path.join(claudeDirectory, "skills"),
    codexSkillsAliasPath: path.join(codexDirectory, "skills")
  };
}

export function findProjectRootDirectory({
  currentWorkingDirectory = process.cwd(),
  projectRootDirectory = null
} = {}) {
  if (projectRootDirectory !== null) {
    return path.resolve(projectRootDirectory);
  }

  let candidateDirectory = path.resolve(currentWorkingDirectory);

  while (true) {
    if (fs.existsSync(path.join(candidateDirectory, ".git"))) {
      return candidateDirectory;
    }

    const parentDirectory = path.dirname(candidateDirectory);
    if (parentDirectory === candidateDirectory) {
      return path.resolve(currentWorkingDirectory);
    }

    candidateDirectory = parentDirectory;
  }
}
