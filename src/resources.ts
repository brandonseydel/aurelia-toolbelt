import * as path from 'path';
import { TemplateType } from './enums/template-type';
import { ResourceType } from './enums/resource-type';
import { IResource } from './models/resource';

export const resources = new Map<ResourceType, IResource>([
  [ResourceType.CustomElement, {
    declaration: 'custom-element',
    files: [`custom-element.ts`, `custom-element.scss`, `custom-element.html`]
  }]]);
