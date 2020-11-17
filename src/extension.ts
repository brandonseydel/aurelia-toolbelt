import { ExtensionContext, commands } from 'vscode';
import { showFileNameDialog, displayStatusMessage } from './editor';
import { commandsMap } from './commands';
import { toTitleCase } from './formatting';
import { ResourceType } from './enums/resource-type';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

const importMappings = [
  { withLoader: true, replaceToken: '', text: '' },
  { withLoader: false, replaceToken: '', text: '' },
  { withLoader: true, replaceToken: '', text: '' },
  { withLoader: true, replaceToken: '', text: '' },
  { withLoader: true, replaceToken: '', text: '' },
  { withLoader: true, replaceToken: '', text: '' },
];

interface PackageContents {
  devDependences: Record<string, string>;
  dependences: Record<string, string>;
}


const getCustomElementSignature = (packageFileContents: PackageContents | undefined, kebabCase: string, styleFileType: string | undefined) => {
  const containsAurelia = !packageFileContents || packageFileContents.dependences['aurelia'] || packageFileContents.devDependences['aurelia'];
  if (containsAurelia) {
    return `import { ICustomElementViewModel } from '@aurelia/runtime-html\n`;
  }
  const importStatement = `import template from './${kebabCase}.html\n'`;
  const customElementImport = `import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html\n`;
  const styleImport = styleFileType && `import './${kebabCase}.${styleFileType.toLowerCase()}\n'`;
  const customElementRegistration = `\n@customElement({ name: '${kebabCase}', template })\n`;

  return customElementImport + importStatement + styleImport + customElementRegistration;
};

export async function activate(context: ExtensionContext) {
  __dirname = context.extensionPath;
  const templatesPath = path.join(__dirname, 'templates');
  const templatesFiles: string[] = fs.readdirSync(templatesPath, 'utf-8');
  const templates = templatesFiles.map(t => [t, fs.readFileSync(path.join(__dirname, 'templates', t), 'utf8')]);
  const channel = vscode.window.createOutputChannel('Aurelia Scaffold');
  const tsConfigs = await vscode.workspace.findFiles('**/tsconfig.json');
  const packageJsons = await vscode.workspace.findFiles('**/package.json');
  const webpack = await vscode.workspace.findFiles('**/webpack.config.js');
  const packageJson = packageJsons.length > 0 ? packageJsons[0] : undefined;
  const packageFileContents = packageJson && Buffer.from(await vscode.workspace.fs.readFile(packageJson)).toString('utf-8');
  const firstMatch = tsConfigs.length > 0 ? tsConfigs[tsConfigs.length - 1] : undefined;

  const showDynamicDialog = async (args: any, componentName: string, resource: ResourceType) => {
    let bindables: string | undefined = undefined;
    let styleFileType: string | undefined = undefined;
    let mkDir = true;
    const loc = await showFileNameDialog(args, resource, componentName);
    if (!loc) { return; }
    let localTemplates = (JSON.parse(JSON.stringify(templates)) as string[][]).filter(x => x[0].startsWith(resource));

    if (resource === ResourceType.CustomElement) {
      styleFileType = await vscode.window.showQuickPick(['SCSS', 'CSS', 'None'], { canPickMany: false });

      switch (styleFileType) {
        case 'SCSS':
          localTemplates = localTemplates.filter(x => !x[0].match(/\.css/g));
          break;
        case 'CSS':
          localTemplates = localTemplates.filter(x => !x[0].match(/\.scss/g));
          break;
        case 'None':
          localTemplates = localTemplates.filter(x => !x[0].match(/css/g));
          break;
      }

    }
    if (resource === ResourceType.CustomElementHtml) {
      bindables = await vscode.window.showInputBox({ prompt: `Type the name of any bindables you would like to include seperated by commas.eg.src, style, class`, value: `` });
      mkDir = false;
    }

    if (fs.existsSync(loc.fullPath)) {
      vscode.window.showErrorMessage(`${loc.fullPath} already exists.Please choose a different custom element name`);
      return;
    }


    let deps: PackageContents | undefined;

    try {
      deps = (packageFileContents && JSON.parse(packageFileContents)) as PackageContents | undefined;
    }
    catch {
    }


    localTemplates.forEach(x => {
      x[1] = x[1].replace(/\$\{customElementSignature\}/g, getCustomElementSignature(deps, loc.kebab, styleFileType));
      x[1] = x[1].replace(/\$\{customElementName\}/g, loc.pascal);
      x[1] = x[1].replace(/\$\{pascalCaseName\}/g, loc.pascal);
      x[1] = x[1].replace(/\s\$\{bindable\}/g, bindables ? ` bindable = "${bindables}"` : '');
      if (x[0].includes('ts') && !firstMatch) {
        x[1] = x[1].replace(/ts/g, 'js');
      }
    });
    mkDir && fs.mkdirSync(loc.fullPath);
    localTemplates.forEach(x => fs.writeFileSync(path.join(mkDir ? loc.fullPath : loc.rootPath, loc.kebab + path.extname(x[0].replace('.tmpl', ''))), x[1]));
    displayStatusMessage(toTitleCase(resource), loc.pascal);
  };


  vscode.commands.executeCommand('setContext', 'extensionSelectionMode', true);
  for (const [key, value] of commandsMap) {
    const command = commands.registerCommand(key, args => showDynamicDialog(args, value.fileName, value.resource));
    context.subscriptions.push(command);
  }

}
