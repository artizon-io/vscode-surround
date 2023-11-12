import vscode from "vscode";
import { Disposable, window, workspace, commands } from "vscode";
import { z } from "zod";
import { expandSelections } from "./logic";
import {
  EXTENSION_DISPLAY_NAME,
  EXTENSION_NAME,
  NUM_CUSTOM_PATTERNS,
  patternsPreset,
} from "./config";

const loadPresetPatterns = (): Disposable[] => {
  return Object.entries(patternsPreset)
    .map(([name, { startPattern, endPattern }]) => {
      const getCommand = (includePatternInSelection: boolean) => () =>
        expandSelections({
          startPattern,
          endPattern,
          includePatternInSelection,
        });

      return [
        commands.registerCommand(
          `${EXTENSION_NAME}.select-in-${name}-exclusive`,
          getCommand(false)
        ),
        commands.registerCommand(
          `${EXTENSION_NAME}.select-in-${name}-inclusive`,
          getCommand(true)
        ),
      ];
    })
    .flat(1);
};

function loadCustomPatterns(): Disposable[] {
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
    return [];
  }

  return [...Array(NUM_CUSTOM_PATTERNS).keys()]
    .map((_, index) => {
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

      return [
        commands.registerCommand(
          `${EXTENSION_NAME}.select-in-custom-pattern-${index}-exclusive`,
          getCommand(false)
        ),
        commands.registerCommand(
          `${EXTENSION_NAME}.select-in-custom-pattern-${index}-inclusive`,
          getCommand(true)
        ),
      ];
    })
    .flat(1);
}

function reloadOnConfigChange(context: vscode.ExtensionContext): Disposable {
  let disposables: Disposable[] = [];

  return workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(EXTENSION_NAME)) {
      disposables.forEach((disposable) => disposable.dispose());

      disposables = [...loadCustomPatterns()];
      context.subscriptions.push(...disposables);
    }
  });
}

export const onActivate = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    ...[reloadOnConfigChange(context), ...loadPresetPatterns()]
  );
};
