import { ResourceType } from './enums/resource-type';
import { ICommand } from './models/command';
import { CommandType } from './enums/command-type';

export const commandsMap = new Map<CommandType, ICommand>([
  [CommandType.CustomElement, { fileName: 'custom-element', resource: ResourceType.CustomElement }],
  [CommandType.CustomElementHtmlOnly, { fileName: 'custom-element-html-only', resource: ResourceType.CustomElementHtml }],
]);
