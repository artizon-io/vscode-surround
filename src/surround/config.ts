/**
 * Control the maximum number of custom patterns user can define.
 */
export const NUM_CUSTOM_PATTERNS = 10;

export const EXTENSION_NAME = "artizon-vscode-surround";
export const EXTENSION_DISPLAY_NAME = "VSCode Surround";

/**
 * Control the search scope of the reverse pattern match (in no. characters).
 * This is required because there is no reverse lookup mechanism built into JavaScript regex.
 */
export const PATTERN_REVERSE_MATCH_INITIAL_SEARCH_SCOPE = 1000;