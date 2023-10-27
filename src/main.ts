import vscode from "vscode";
import { onActivate } from "./surround";

export function activate(context: vscode.ExtensionContext) {
  onActivate(context);
}

export function deactivate() {}
