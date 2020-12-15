//USE THIS FOR READONLY PRIVATE FUNCTION ETC COLORING ONCE WE GET FAR ENOUGH

// import * as vscode from 'vscode';
// import { Aurelia } from 'aurelia';
// import { parse } from 'node-html-parser';
// import { IAttributeParser } from '@aurelia/runtime-html';


// const tokenTypes = new Map<string, number>();
// const tokenModifiers = new Map<string, number>();

// export const legend = (function () {
// 	const tokenTypesLegend = ['attr'];
// 	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

// 	const tokenModifiersLegend = [
// 		'bind',
// 		'two-way',
// 		'one-time',
// 		'from-view',
// 		'to-view'
// 	];
// 	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

// 	return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
// })();



// interface IParsedToken {
// 	line: number;
// 	startCharacter: number;
// 	length: number;
// 	tokenType: string;
// 	tokenModifiers: string[];
// }

// export class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

// 	private aurelia = new Aurelia();

// 	async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
// 		const allTokens = this._parseText(document.getText());
// 		const builder = new vscode.SemanticTokensBuilder();
// 		allTokens.forEach((token) => {
// 			builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
// 		});
// 		return builder.build();
// 	}

// 	private _encodeTokenType(tokenType: string): number {
// 		if (tokenTypes.has(tokenType)) {
// 			return tokenTypes.get(tokenType)!;
// 		} else if (tokenType === 'notInLegend') {
// 			return tokenTypes.size + 2;
// 		}
// 		return 0;
// 	}

// 	private _encodeTokenModifiers(strTokenModifiers: string[]): number {
// 		let result = 0;
// 		for (let i = 0; i < strTokenModifiers.length; i++) {
// 			const tokenModifier = strTokenModifiers[i];
// 			if (tokenModifiers.has(tokenModifier)) {
// 				result = result | (1 << tokenModifiers.get(tokenModifier)!);
// 			} else if (tokenModifier === 'notInLegend') {
// 				result = result | (1 << tokenModifiers.size + 2);
// 			}
// 		}
// 		return result;
// 	}

// 	private _parseText(template: string): IParsedToken[] {
// 		const r: IParsedToken[] = [];
// 		const htmlElement = parse(template);
// 		const compiler = this.aurelia.container.get(IAttributeParser);
// 		const attributeSyntaxes = Object.keys(htmlElement.attributes).map(x => ({ name: x, value: htmlElement.getAttribute(x) ?? '' })).filter(x => x.value).map(x => compiler.parse(x.name, x.value));

// 		return r;
// 	}

// 	indexesOf(source: string, searchString: string) {
// 		let match: RegExpExecArray | null;
// 		const indexes: RegExpExecArray[] = [];

// 		const regex = new RegExp(searchString + '/g');
// 		this.aurelia.container.getAll

// 		while (match = regex.exec(source)) {
// 			const firstMatch = match[0];
// 			if (!indexes[match[0]]) indexes[match[0]] = [];
// 			indexes[match[0]].push(match.index);
// 		}

// 		return indexes;
// 	}

// }