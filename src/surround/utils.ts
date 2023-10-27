import vscode from "vscode";

/**
 * Takes an offset and the current position in the editor, and returns the `vscode.Position` after applying the offset
 * @param code Code of current editor
 * @param offset Position offset
 * @param currentPosition Current position in the editor
 * @returns Position after applying the offset
 */
export const convertCharOffsetToVSCodePosition = (
  code: string,
  offset: number,
  currentPosition: vscode.Position
): vscode.Position => {
  const lines = code.slice(0, offset).split("\n");

  const rowOffset = lines.length - 1;

  if (rowOffset === 0) {
    const columnOffset = lines[lines.length - 1].length;

    return currentPosition.translate(0, columnOffset);
  } else {
    currentPosition = currentPosition.translate(rowOffset, 0);

    const column = lines[lines.length - 1].length;

    return currentPosition.with(undefined, column);
  }
};
