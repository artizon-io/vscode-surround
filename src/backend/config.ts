/**
 * Control the maximum number of custom patterns user can define.
 */
export const NUM_CUSTOM_PATTERNS = 10;

export const EXTENSION_NAME = "vscode-surround";
export const EXTENSION_DISPLAY_NAME = "VSCode Surround";

/**
 * Control the search scope of the reverse pattern match (in no. characters).
 * This is required because there is no reverse lookup mechanism built into JavaScript regex.
 */
export const PATTERN_REVERSE_MATCH_INITIAL_SEARCH_SCOPE = 1000;

export const patternsPreset: Record<string, Pick<Config, "startPattern" | "endPattern">> = {
  parenthesis: {
    startPattern: /\(/,
    endPattern: /\)/,
  },
  curly: {
    startPattern: /\{/,
    endPattern: /\}/,
  },
  square: {
    startPattern: /\[/,
    endPattern: /\]/,
  },
  angle: {
    startPattern: /</,
    endPattern: />/,
  },
  "single-quote": {
    startPattern: /'/,
    endPattern: /'/,
  },
  "double-quote": {
    startPattern: /"/,
    endPattern: /"/,
  },
  backtick: {
    startPattern: /`/,
    endPattern: /`/,
  },
  "backtick-block": {
    startPattern: /```/,
    endPattern: /```/,
  },
};