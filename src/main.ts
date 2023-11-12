import vscode from "vscode";
import { onActivate } from "./backend";

export function activate(context: vscode.ExtensionContext) {
  onActivate(context);
}

export function deactivate() {}
