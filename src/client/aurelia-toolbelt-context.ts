import { CommandType } from './../enums/command-type';
import * as cp from 'child_process';
import { ExtensionContext, commands } from 'vscode';
import { showFileNameDialog, displayStatusMessage } from '../editor';
import { commandsMap } from '../commands';
import { toTitleCase } from '../formatting';
import { ResourceType } from '../enums/resource-type';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { compile } from 'handlebars';
import * as colorData from './themes/colors.json';

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
    const customElementRegistration = `\n@customElement({ name: '${kebabCase}', template })`;

    return customElementImport + importStatement + styleImport + customElementRegistration;
};

const getCustomAttributeSignature = (packageFileContents: PackageContents | undefined, kebabCase: string) => {
    const containsAurelia = !packageFileContents || (packageFileContents.dependencies && packageFileContents.dependencies['aurelia']);
    if (containsAurelia) {
        return `import { ICustomAttributeViewModel, bindable, customAttribute} from 'aurelia';\n\n@customAttribute({ name: '${kebabCase}' })`;
    }
    const customAttributeImport = `import { customAttribute, ICustomAttributeViewModel, bindable, customAttribute} from '@aurelia/runtime-html';\n`;
    const customAttributeRegistration = `\n@customAttribute({ name: '${kebabCase}' })`;

    return customAttributeImport + customAttributeRegistration;
};



export class AureliaToolbeltContext {

    public templatesPath?: string;
    public templatesFiles?: string[];
    public templates?: [string, HandlebarsTemplateDelegate][];
    public channel?: vscode.OutputChannel;
    public tsConfigs?: vscode.Uri[];
    public packageJsons?: vscode.Uri[];
    public webpack?: vscode.Uri[];
    public packageJson?: vscode.Uri;
    public packageFileContents?: string;
    public firstMatch?: vscode.Uri;

    constructor(private readonly context: vscode.ExtensionContext) { }

    static async load(extensionContext: vscode.ExtensionContext) {
        const context = new AureliaToolbeltContext(extensionContext);
        __dirname = extensionContext.extensionPath;
        context.templatesPath = path.join(__dirname, 'templates');
        context.templatesFiles = fs.readdirSync(context.templatesPath, 'utf-8');
        context.templates = context.templatesFiles.map(t => [t, compile(fs.readFileSync(path.join(__dirname, 'templates', t), 'utf8'), {

        })] as [string, HandlebarsTemplateDelegate]);
        context.channel = vscode.window.createOutputChannel('Aurelia ToolBelt');
        context.tsConfigs = await vscode.workspace.findFiles('**/tsconfig.json');
        context.packageJsons = await vscode.workspace.findFiles('**/package.json');
        context.webpack = await vscode.workspace.findFiles('**/webpack.config.js');
        context.packageJson = context.packageJsons.length > 0 ? context.packageJsons[0] : undefined;
        context.packageFileContents = context.packageJson && Buffer.from(await vscode.workspace.fs.readFile(context.packageJson)).toString('utf-8');
        context.firstMatch = context.tsConfigs.length > 0 ? context.tsConfigs[context.tsConfigs.length - 1] : undefined;
        context.addColorSettings();
        return context;
    }

    public async registerCommands(): Promise<void> {
        // this.context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'html' },
        //     new DocumentSemanticTokensProvider(), legend));

        for (const [key, value] of commandsMap) {
            const command = commands.registerCommand(key, args => this.showDynamicDialog(args, value.fileName, value.resource));
            this.context.subscriptions.push(command);
        }
        commands.registerCommand(CommandType.GenerateApp, () => this.runCommand('npx makes aurelia', 'Aurelia Toolbelt'));
        vscode.commands.executeCommand('setContext', 'extensionSelectionMode', true);
    }

    addColorSettings() {
        (async () => {
            const config = vscode.workspace.getConfiguration();
            let tokenColorCustomizations: any = config.inspect('editor.tokenColorCustomizations')?.globalValue;

            if (!tokenColorCustomizations) {
                tokenColorCustomizations = {};
            }
            if (!Object.hasOwnProperty.call(tokenColorCustomizations, 'textMateRules')) {
                tokenColorCustomizations['textMateRules'] = [];
            }

            const tokenColor = (tokenColorCustomizations['textMateRules'] as any[]).filter(x => !x.name.includes('Aurelia Toolbelt'));
            const colorDataLength = colorData.length;
            const tokenColorLength = tokenColor.length;

            for (let i = 0; i < colorDataLength; i++) {
                const name = colorData[i].name;

                let exist = false;
                for (let j = 0; j < tokenColorLength; j++) {
                    if (tokenColor[j].name === name) {
                        exist = true;
                        break;
                    }
                }

                tokenColor.push(colorData[i]);
            }


            const color = new vscode.ThemeColor('entity.other.attribute-name');
            tokenColor.push({
                name: 'Aurelia Toolbelt Attributes',
                scope: ['meta.tag.any.html'],
                settings: {
                    foreground: '#9CDCFE'
                }
            });
            tokenColorCustomizations['textMateRules'] = tokenColor;
            await config.update(
                'editor.tokenColorCustomizations',
                tokenColorCustomizations,
                vscode.ConfigurationTarget.Global
            );
        })();
    }

    showDynamicDialog = async (args: any, componentName: string, resource: ResourceType) => {
        try {
            let bindables: string | undefined = undefined;
            let styleFileType: string | undefined = undefined;
            let mkDir = true;
            const loc = await showFileNameDialog(args, resource, componentName);
            if (!loc || !this.templates || !this.channel) return;
            let localTemplates = this.templates.filter(x => x[0].startsWith(resource));

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
                this.channel.appendLine(`${styleFileType} selected`);
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
                deps = (this.packageFileContents && JSON.parse(this.packageFileContents)) as PackageContents | undefined;
            }
            catch {
            }

            this.channel.appendLine(`Generating templates ${localTemplates.map(x => x[0]).join(',')}`);

            this.channel.appendLine(JSON.stringify(deps));
            this.channel.appendLine(JSON.stringify(loc));


            mkDir && fs.mkdirSync(loc.fullPath);
            mkDir && this.channel.appendLine(`Creating directory at ${loc.fullPath}`);

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
            this.channel?.appendLine(JSON.stringify(e));
        }
    };

    runCommand(command: string, terminalName?: string): void {
        const cwd = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
        if (terminalName?.length) {
            this.runCommandInTerminal(command);
        } else {
            this.runCommandInOutputWindow(command, cwd);
        }
    }

    runCommandInOutputWindow(command: string, cwd: vscode.WorkspaceFolder | undefined) {
        const childProcess = cp.exec(command, { cwd: cwd?.uri.path, env: process.env });
        childProcess.stderr?.on('data', data => this.channel?.append(<string>data));
        childProcess.stdout?.on('data', data => this.channel?.append(<string>data));
        this.channel && this.showOutput(this.channel);
    }

    showOutput(outputChannel: vscode.OutputChannel): void {
        outputChannel.show(false);
    }

    runCommandInTerminal(command: string): void {
        const cwd = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
        const terminal = vscode.window.createTerminal('Aurelia Toolbelt');
        terminal.show(true);
        cwd && terminal.sendText(`cd ${cwd.uri.fsPath}`, true);
        terminal.sendText(`${command}`, true);
        terminal.sendText(`y`, true);
    }


}