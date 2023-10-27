import vscode from "vscode";
import { Disposable, window, workspace, commands } from "vscode";
import { z } from "zod";
import { expandSelections } from "./logic";
import {
  EXTENSION_DISPLAY_NAME,
  EXTENSION_NAME,
  NUM_CUSTOM_PATTERNS,
} from "./config";

// TODO: Build package.json dynamically

const preset: Record<string, Pick<Config, "startPattern" | "endPattern">> = {
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

const registerSelectionCommands = (): Disposable[] => {
  const disposables: Disposable[] = [];

  Object.entries(preset).forEach(([name, { startPattern, endPattern }]) => {
    const getCommand = (includePatternInSelection: boolean) => () =>
      expandSelections({
        startPattern,
        endPattern,
        includePatternInSelection,
      });

    disposables.push(
      commands.registerCommand(
        `${EXTENSION_NAME}.select-in-${name}-exclusive`,
        getCommand(false)
      )
    );

    disposables.push(
      commands.registerCommand(
        `${EXTENSION_NAME}.select-in-${name}-inclusive`,
        getCommand(true)
      )
    );
  });

  // TODO: retrieve extension metadata from package.json

  const customPatternsConfig = workspace
    .getConfiguration(EXTENSION_NAME)
    .get("custom-patterns");

  const customPatternConfigSchema = z.object({
    startPattern: z.string(),
    endPattern: z.string(),
  });

  const customPatternsConfigParseResult = z
    .object(
      Object.fromEntries(
        [...Array(NUM_CUSTOM_PATTERNS).keys()].map((_, index) => [
          `${index + 1}`,
          customPatternConfigSchema.optional(),
        ])
      )
    )
    .safeParse(customPatternsConfig);

  if (!customPatternsConfigParseResult.success) {
    window.showErrorMessage(
      `${EXTENSION_DISPLAY_NAME}: Invalid custom patterns configuration`
    );
    return disposables;
  }

  [...Array(NUM_CUSTOM_PATTERNS).keys()].forEach((_, index) => {
    index += 1;

    const config = customPatternsConfigParseResult.data[`${index}`];

    const getCommand = (includePatternInSelection: boolean) => {
      if (!config)
        return () =>
          window.showWarningMessage(
            `${EXTENSION_DISPLAY_NAME}: Configuration for custom pattern ${index} not found`
          );

      const { startPattern: startPatternStr, endPattern: endPatternStr } =
        config;

      let startPattern: RegExp;
      let endPattern: RegExp;
      try {
        startPattern = new RegExp(startPatternStr);
        endPattern = new RegExp(endPatternStr);
      } catch (e) {
        if ((e as Error).name === "SyntaxError") {
          return () =>
            window.showErrorMessage(
              `${EXTENSION_DISPLAY_NAME}: Custom Selection Pattern ${index} - Start or end pattern is not valid regular expression(s)`
            );
        } else {
          throw e;
        }
      }

      return () =>
        expandSelections({
          startPattern,
          endPattern,
          includePatternInSelection,
        });
    };

    disposables.push(
      commands.registerCommand(
        `${EXTENSION_NAME}.select-in-custom-pattern-${index}-exclusive`,
        getCommand(false)
      )
    );

    disposables.push(
      commands.registerCommand(
        `${EXTENSION_NAME}.select-in-custom-pattern-${index}-inclusive`,
        getCommand(true)
      )
    );
  });

  return disposables;
};

export const onActivate = (context: vscode.ExtensionContext) => {
  let disposables: Disposable[] = [];
  function reloadCommands() {
    disposables.forEach((disposable) => disposable.dispose());
    disposables = registerSelectionCommands();
    context.subscriptions.push(...disposables);
  }

  reloadCommands();

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(EXTENSION_NAME)) reloadCommands();
    })
  );
};
