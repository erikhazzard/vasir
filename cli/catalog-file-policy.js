const GENERATED_PYTHON_CACHE_DIRECTORY_NAMES = new Set(["__pycache__", ".pytest_cache"]);
const IGNORED_CATALOG_FILE_NAMES = new Set([".DS_Store"]);

export function isIgnoredCatalogEntry({ entryName, isDirectory }) {
  if (IGNORED_CATALOG_FILE_NAMES.has(entryName)) {
    return true;
  }

  if (isDirectory) {
    return GENERATED_PYTHON_CACHE_DIRECTORY_NAMES.has(entryName);
  }

  return entryName.endsWith(".pyc");
}

export function isIgnoredCatalogRelativeFilePath(relativeFilePath) {
  const pathSegments = relativeFilePath.replace(/\\/g, "/").split("/");
  const fileName = pathSegments.at(-1);
  const directorySegments = pathSegments.slice(0, -1);

  return (
    IGNORED_CATALOG_FILE_NAMES.has(fileName) ||
    fileName.endsWith(".pyc") ||
    directorySegments.some((directoryName) => GENERATED_PYTHON_CACHE_DIRECTORY_NAMES.has(directoryName))
  );
}
