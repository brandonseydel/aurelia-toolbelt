import { ExtensionContext, commands } from 'vscode';
import { showFileNameDialog, displayStatusMessage } from './editor';
import { commandsMap } from './commands';
import { toTitleCase } from './formatting';
import { ResourceType } from './enums/resource-type';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { compile } from 'handlebars';

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
  dependencies: Record<string, string>;
}


const getCustomElementSignature = (packageFileContents: PackageContents | undefined, kebabCase: string, styleFileType: string | undefined) => {
  const containsAurelia = !packageFileContents || (packageFileContents.dependencies && packageFileContents.dependencies['aurelia']);
  if (containsAurelia) {
    return `import { ICustomElementViewModel } from 'aurelia';\n`;
  }
  const importStatement = `import template from './${kebabCase}.html';\n'`;
  const customElementImport = `import { customElement, ICustomElementViewModel } from '@aurelia/runtime-html';\n`;
  const styleImport = styleFileType && `import './${kebabCase}.${styleFileType?.toLowerCase()}';\n`;
  const customElementRegistration = `\n@customElement({ name: '${kebabCase}', template })\n`;

  return customElementImport + importStatement + styleImport + customElementRegistration;
};

const getCustomAttributeSignature = (packageFileContents: PackageContents | undefined, kebabCase: string) => {
  const containsAurelia = !packageFileContents || (packageFileContents.dependencies && packageFileContents.dependencies['aurelia']);
  if (containsAurelia) {
    return `import { ICustomAttributeViewModel } from 'aurelia';\n`;
  }
  const customAttributeImport = `import { customAttribute, ICustomAttributeViewModel } from '@aurelia/runtime-html';\n`;
  const customAttributeRegistration = `\n@customAttribute({ name: '${kebabCase}' })\n`;

  return customAttributeImport + customAttributeRegistration;
};

export async function activate(context: ExtensionContext) {
  __dirname = context.extensionPath;
  const templatesPath = path.join(__dirname, 'templates');
  const templatesFiles: string[] = fs.readdirSync(templatesPath, 'utf-8');
  const templates: [string, HandlebarsTemplateDelegate][] = templatesFiles.map(t => [t, compile(fs.readFileSync(path.join(__dirname, 'templates', t), 'utf8'), {

  })] as [string, HandlebarsTemplateDelegate]);
  const channel = vscode.window.createOutputChannel('Aurelia Scaffold');
  const tsConfigs = await vscode.workspace.findFiles('**/tsconfig.json');
  const packageJsons = await vscode.workspace.findFiles('**/package.json');
  const webpack = await vscode.workspace.findFiles('**/webpack.config.js');
  const packageJson = packageJsons.length > 0 ? packageJsons[0] : undefined;
  const packageFileContents = packageJson && Buffer.from(await vscode.workspace.fs.readFile(packageJson)).toString('utf-8');
  const firstMatch = tsConfigs.length > 0 ? tsConfigs[tsConfigs.length - 1] : undefined;

  const showDynamicDialog = async (args: any, componentName: string, resource: ResourceType) => {
    try {
      let bindables: string | undefined = undefined;
      let styleFileType: string | undefined = undefined;
      let mkDir = true;
      const loc = await showFileNameDialog(args, resource, componentName);
      if (!loc) { return; }
      let localTemplates = templates.filter(x => x[0].startsWith(resource));

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
        channel.appendLine(`${styleFileType} selected`);
        localTemplates = localTemplates.filter(x => !x[0].match(/-html\.html/g));
      }
      else if (resource === ResourceType.CustomElementHtml) {
        bindables = await vscode.window.showInputBox({ prompt: `Type the name of any bindables you would like to include seperated by commas.eg.src, style, class`, value: `` });
        mkDir = false;
        localTemplates = localTemplates.filter(x => x[0].match(/-html\.html/g));
      }
      else if (resource === ResourceType.CustomAttribute) {
        mkDir = false;
        localTemplates = localTemplates.filter(x => x[0].match(/custom-attribute/g));
      }

      if (fs.existsSync(loc.fullPath)) {
        vscode.window.showErrorMessage(`${loc.fullPath} already exists.Please choose a different name`);
        return;
      }


      let deps: PackageContents | undefined;

      try {
        deps = (packageFileContents && JSON.parse(packageFileContents)) as PackageContents | undefined;
      }
      catch {
      }

      channel.appendLine(`Generating templates ${localTemplates.map(x => x[0]).join(',')}`);

      channel.appendLine(JSON.stringify(deps));
      channel.appendLine(JSON.stringify(loc));


      mkDir && fs.mkdirSync(loc.fullPath);
      mkDir && channel.appendLine(`Creatin directory at ${loc.fullPath}`);

      localTemplates.forEach(x => {
        const template = x[1]({

          customElementSignature: getCustomElementSignature(deps, loc.kebab, styleFileType),
          customAttributeSignature: getCustomAttributeSignature(deps, loc.kebab),
          customElementName: loc.pascal,
          pascalCaseName: loc.pascal,
          kebabCaseName: loc.kebab,
          bindable: bindables ? ` bindable = "${bindables}"` : ''
        }, {} as Handlebars.RuntimeOptions);
        fs.writeFileSync(path.join(mkDir ? loc.fullPath : loc.rootPath, loc.kebab + path.extname(x[0].replace('.tmpl', ''))), template);
      });
      displayStatusMessage(toTitleCase(resource), loc.pascal);
    } catch (e) {
      channel.appendLine(JSON.stringify(e));
    }
  };


  vscode.commands.executeCommand('setContext', 'extensionSelectionMode', true);
  for (const [key, value] of commandsMap) {
    const command = commands.registerCommand(key, args => showDynamicDialog(args, value.fileName, value.resource));
    context.subscriptions.push(command);
  }

}
