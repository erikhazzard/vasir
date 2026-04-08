function splitDiffLines(fileText) {
  if (fileText.length === 0) {
    return [];
  }

  const lines = fileText.split("\n");
  if (fileText.endsWith("\n")) {
    lines.pop();
  }

  return lines;
}

function buildLongestCommonSubsequenceTable(beforeLines, afterLines) {
  const table = Array.from(
    { length: beforeLines.length + 1 },
    () => new Uint32Array(afterLines.length + 1)
  );

  for (let beforeIndex = beforeLines.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterLines.length - 1; afterIndex >= 0; afterIndex -= 1) {
      table[beforeIndex][afterIndex] =
        beforeLines[beforeIndex] === afterLines[afterIndex]
          ? table[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(table[beforeIndex + 1][afterIndex], table[beforeIndex][afterIndex + 1]);
    }
  }

  return table;
}

function buildDiffOperations(beforeLines, afterLines) {
  const lcsTable = buildLongestCommonSubsequenceTable(beforeLines, afterLines);
  const operations = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      operations.push({
        type: "equal",
        text: beforeLines[beforeIndex]
      });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (lcsTable[beforeIndex + 1][afterIndex] >= lcsTable[beforeIndex][afterIndex + 1]) {
      operations.push({
        type: "remove",
        text: beforeLines[beforeIndex]
      });
      beforeIndex += 1;
      continue;
    }

    operations.push({
      type: "add",
      text: afterLines[afterIndex]
    });
    afterIndex += 1;
  }

  while (beforeIndex < beforeLines.length) {
    operations.push({
      type: "remove",
      text: beforeLines[beforeIndex]
    });
    beforeIndex += 1;
  }

  while (afterIndex < afterLines.length) {
    operations.push({
      type: "add",
      text: afterLines[afterIndex]
    });
    afterIndex += 1;
  }

  let nextBeforeLineNumber = 1;
  let nextAfterLineNumber = 1;

  for (const operation of operations) {
    operation.beforeLineNumber = nextBeforeLineNumber;
    operation.afterLineNumber = nextAfterLineNumber;

    if (operation.type === "equal") {
      nextBeforeLineNumber += 1;
      nextAfterLineNumber += 1;
      continue;
    }

    if (operation.type === "remove") {
      nextBeforeLineNumber += 1;
      continue;
    }

    nextAfterLineNumber += 1;
  }

  return operations;
}

function formatUnifiedRange(startLineNumber, lineCount) {
  if (lineCount === 0) {
    return `${Math.max(0, startLineNumber - 1)},0`;
  }

  if (lineCount === 1) {
    return `${startLineNumber}`;
  }

  return `${startLineNumber},${lineCount}`;
}

function buildUnifiedDiffHunks(operations, contextLines) {
  const changedOperationIndexes = operations
    .map((operation, operationIndex) => operation.type === "equal" ? null : operationIndex)
    .filter((operationIndex) => operationIndex !== null);

  if (changedOperationIndexes.length === 0) {
    return [];
  }

  const hunks = [];
  let changedOperationCursor = 0;

  while (changedOperationCursor < changedOperationIndexes.length) {
    let hunkStartIndex = Math.max(0, changedOperationIndexes[changedOperationCursor] - contextLines);
    let hunkEndIndex = Math.min(
      operations.length,
      changedOperationIndexes[changedOperationCursor] + contextLines + 1
    );
    changedOperationCursor += 1;

    while (changedOperationCursor < changedOperationIndexes.length) {
      const nextChangeIndex = changedOperationIndexes[changedOperationCursor];
      const nextHunkStartIndex = Math.max(0, nextChangeIndex - contextLines);
      if (nextHunkStartIndex > hunkEndIndex) {
        break;
      }

      hunkEndIndex = Math.min(operations.length, nextChangeIndex + contextLines + 1);
      changedOperationCursor += 1;
    }

    const hunkOperations = operations.slice(hunkStartIndex, hunkEndIndex);
    const oldStartLineNumber = hunkOperations[0]?.beforeLineNumber ?? 1;
    const newStartLineNumber = hunkOperations[0]?.afterLineNumber ?? 1;
    const oldLineCount = hunkOperations.filter((operation) => operation.type !== "add").length;
    const newLineCount = hunkOperations.filter((operation) => operation.type !== "remove").length;

    hunks.push({
      oldStartLineNumber,
      oldLineCount,
      newStartLineNumber,
      newLineCount,
      operations: hunkOperations
    });
  }

  return hunks;
}

export function isLikelyTextBuffer(fileBuffer) {
  return !fileBuffer.includes(0);
}

export function renderUnifiedDiff({
  previousFileLabel,
  nextFileLabel,
  previousText,
  nextText,
  contextLines = 3
}) {
  const operations = buildDiffOperations(
    splitDiffLines(previousText),
    splitDiffLines(nextText)
  );
  const hunks = buildUnifiedDiffHunks(operations, contextLines);

  if (hunks.length === 0) {
    return "";
  }

  const renderedLines = [
    `--- ${previousFileLabel}`,
    `+++ ${nextFileLabel}`
  ];

  for (const hunk of hunks) {
    renderedLines.push(
      `@@ -${formatUnifiedRange(hunk.oldStartLineNumber, hunk.oldLineCount)} +${formatUnifiedRange(hunk.newStartLineNumber, hunk.newLineCount)} @@`
    );

    for (const operation of hunk.operations) {
      const prefix = operation.type === "equal" ? " " : operation.type === "remove" ? "-" : "+";
      renderedLines.push(`${prefix}${operation.text}`);
    }
  }

  return renderedLines.join("\n");
}
