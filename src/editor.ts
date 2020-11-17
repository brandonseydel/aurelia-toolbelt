import { toKebabCase, toPascalCase } from './formatting';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IPath } from './models/path';
import { ResourceType } from './enums/resource-type';
export const displayStatusMessage = (type: string, name: string, timeout = 2000) => vscode.window.setStatusBarMessage(`${type} ${name} was successfully generated`, timeout);

export const openFileInEditor = async (folderName: string) => {
  const inputName = path.parse(folderName).name;
  const fullFilePath = path.join(folderName, `${inputName}.ts`);
  const textDocument = await vscode.workspace.openTextDocument(fullFilePath);
  return await vscode.window.showTextDocument(textDocument);
};



// Show input prompt for element name 
export const showFileNameDialog = async (args: any, type: ResourceType, defaultName: string): Promise<IPath | undefined> => {
  const rootPath = args.fsPath || path.dirname(vscode.window.activeTextEditor?.document?.fileName || '');
  if (!rootPath) { return; }
  let componentName = await vscode.window.showInputBox({ prompt: `Type the name of the new ${type}`, value: `${defaultName}` });
  if (!componentName) { return; }
  let kebab = toKebabCase(componentName);
  let pascal = toPascalCase(componentName);

  if (!componentName) {
    throw new Error('That\'s not a valid name! (no whitespaces or special characters)');
  } else {
    const fullPath = path.join(rootPath, kebab);
    return {
      fullPath,
      rootPath,
      componentName,
      kebab,
      pascal
    };
  };
};