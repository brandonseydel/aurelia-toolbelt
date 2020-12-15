import { ExtensionContext } from 'vscode';
import { AureliaToolbeltContext } from './client/aurelia-toolbelt-context';



export async function activate(context: ExtensionContext) {
  const aureliaToolbeltContext = await AureliaToolbeltContext.load(context);
  await Promise.all([aureliaToolbeltContext.registerCommands()]);
}