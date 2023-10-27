import vscode from "vscode";
import { window } from "vscode";
import { convertCharOffsetToVSCodePosition } from "./utils";
import {
  EXTENSION_DISPLAY_NAME,
  PATTERN_REVERSE_MATCH_INITIAL_SEARCH_SCOPE,
} from "./config";

export const expandSelections = (config: Config): void => {
  const { startPattern, endPattern, includePatternInSelection } = config;

  const editor = window.activeTextEditor;
  if (!editor) {
    window.showWarningMessage(
      `${EXTENSION_DISPLAY_NAME}: No active text editor`
    );
    return;
  }

  const currentSelections = editor.selections;

  // TODO: Optimization is feasible by caching the result of each selection-expand and
  // check if the latter selections are enclosed in the same scope as the former.
  // If so, use the result of the former

  const newSelections = currentSelections.map((selection) => {
    const codeComesAfter = editor.document.getText(
      new vscode.Range(selection.end, new vscode.Position(Infinity, Infinity))
    );
    const {
      patternOffset: endPatternOffset,
      patternMatchSize: endPatternMatchSize,
    } = matchPatternNormalDirection(
      endPattern,
      codeComesAfter,
      true,
      startPattern
    );

    const codeComesBefore = editor.document.getText(
      new vscode.Range(new vscode.Position(0, 0), selection.start)
    );
    const {
      patternOffset: startPatternOffset,
      patternMatchSize: startPatternMatchSize,
    } = matchPatternReverseDirection(
      startPattern,
      codeComesBefore,
      PATTERN_REVERSE_MATCH_INITIAL_SEARCH_SCOPE,
      true,
      endPattern
    );

    if (endPatternOffset === undefined || startPatternOffset === undefined) {
      window.showWarningMessage(
        `${EXTENSION_DISPLAY_NAME}: No matching pattern found`
      );
      return selection;
    }

    const endPatternPosition = convertCharOffsetToVSCodePosition(
      codeComesAfter,
      includePatternInSelection
        ? endPatternOffset + endPatternMatchSize
        : endPatternOffset,
      selection.end
    );
    const startPatternPosition = convertCharOffsetToVSCodePosition(
      codeComesBefore,
      includePatternInSelection
        ? startPatternOffset
        : startPatternOffset + startPatternMatchSize,
      new vscode.Position(0, 0)
    );

    return !selection.isReversed || selection.isEmpty
      ? new vscode.Selection(startPatternPosition, endPatternPosition)
      : new vscode.Selection(endPatternPosition, startPatternPosition);
  });

  editor.selections = newSelections;
};

/**
 * Match a pattern against a text in normal direction (from left to right)
 * @param pattern The pattern to match against
 * @param text The text to match the pattern against
 * @param respectStackingOrder Whether to take the stacking order of the pattern into account.
 * For instance, if `pattern` = `}` and `text` = `{}}`, when `respectStackingOrder` is `false`,
 * the first `}` will be matched, otherwise the second `}` will be matched.
 * @param inversePattern The inverse of `pattern`. For instance, the inverse of `}` is `{`.
 * @returns The offset of the pattern in the text, and the size of the matched pattern.
 */
const matchPatternNormalDirection = <T extends boolean>(
  pattern: RegExp,
  text: string,
  respectStackingOrder: T,
  // FIX: typescript issue
  inversePattern: T extends true ? RegExp : undefined
): {
  patternOffset?: number;
  patternMatchSize: number;
} => {
  if (!respectStackingOrder) {
    const matchResult = pattern.exec(text);
    if (!matchResult)
      return {
        patternOffset: undefined,
        patternMatchSize: -1,
      };

    const { index: patternOffset, "0": matchStr } = matchResult;
    return {
      patternOffset,
      patternMatchSize: matchStr.length,
    };
  } else {
    // Try to match either pattern or the inverse pattern.
    // When encounters an inverse pattern, push a `0` to the stack.
    // When encounters a pattern, pop a `0` from the stack.
    // Return a match if a pattern is encountered and the stack is empty.

    const regularOrInversePattern = new RegExp(
      `(${pattern.source})|(${inversePattern!.source})`,
      "g"
    );

    const stack: 0[] = [];

    let matchResult;
    while ((matchResult = regularOrInversePattern.exec(text))) {
      const { index: patternOffset, "0": matchStr } = matchResult;

      if (matchStr.match(inversePattern!) && !matchStr.match(pattern)) {
        stack.push(0);
        continue;
      }

      if (stack.length > 0) {
        stack.pop();
        continue;
      }

      return {
        patternOffset,
        patternMatchSize: matchStr.length,
      };
    }

    return {
      patternOffset: undefined,
      patternMatchSize: -1,
    };
  }
};

/**
 * Match a pattern against a text in reverse direction (from right to left)
 * @param pattern The pattern to match against
 * @param text The text to match the pattern against
 * @param initialSearchScope The initial search scope of the reverse pattern match (in no. characters).
 * This is required because there is no reverse lookup mechanism built into JavaScript regex.
 * So we have to iteratively increase the search scope until a match is found.
 * @param respectStackingOrder Whether to take the stacking order of the pattern into account.
 * For instance, if `pattern` = `{` and `text` = `{{}`, when `respectStackingOrder` is `false`,
 * the second `{` will be matched, otherwise the first `{` will be matched.
 * @param inversePattern The inverse of `pattern`. For instance, the inverse of `{` is `}`.
 * @returns The offset of the pattern in the text, and the size of the matched pattern.
 */
const matchPatternReverseDirection = <T extends boolean>(
  pattern: RegExp,
  text: string,
  initialSearchScope: number,
  respectStackingOrder: T,
  // FIX: typescript issue
  inversePattern: T extends true ? RegExp : undefined
): {
  patternOffset?: number;
  patternMatchSize: number;
} => {
  if (!respectStackingOrder) {
    // Append global flag to start pattern such that its `lastIndex` property
    // will take effect.
    // The `lastIndex` property is used to specify the index at which to start the next match.
    pattern = new RegExp(pattern, "g");

    // Iteratively increase search scope geometrically until match is found
    function search(searchScope: number) {
      if (searchScope === text.length)
        return { patternOffset: undefined, patternMatchSize: -1 };

      pattern.lastIndex = text.length - searchScope;

      const matches = [...text.matchAll(pattern)];
      if (matches.length === 0)
        return search(Math.min(searchScope * 2, text.length));

      const { index: patternOffset, "0": matchStr } =
        matches[matches.length - 1];
      return {
        patternOffset,
        patternMatchSize: matchStr.length,
      };
    }

    return search(initialSearchScope);
  } else {
    // Try to match either pattern or the inverse pattern.
    // When encounters an inverse pattern, push a `0` to the stack.
    // When encounters a pattern, pop a `0` from the stack.
    // Return a match if a pattern is encountered and the stack is empty.

    const regularOrInversePattern = new RegExp(
      `(${pattern.source})|(${inversePattern!.source})`,
      "g"
    );

    const stack: 0[] = [];

    // Iteratively increase search scope geometrically until match is found
    function search(searchScope: number) {
      if (searchScope === text.length)
        return { patternOffset: undefined, patternMatchSize: -1 };

      pattern.lastIndex = text.length - searchScope;

      const matches = [...text.matchAll(regularOrInversePattern)].reverse();

      if (matches.length === 0 || stack.length > 0)
        return search(Math.min(searchScope * 2, text.length));

      for (const match of matches) {
        const { index: patternOffset, "0": matchStr } = match;

        if (matchStr.match(inversePattern!) && !matchStr.match(pattern)) {
          stack.push(0);
          continue;
        }

        // If `matchStr` matches pattern

        if (stack.length > 0) {
          stack.pop();
          continue;
        }

        return {
          patternOffset,
          patternMatchSize: matchStr.length,
        };
      }

      return {
        patternOffset: undefined,
        patternMatchSize: -1,
      };
    }

    return search(initialSearchScope);
  }
};
