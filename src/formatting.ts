export const toCamelCase = (input: string) => input.replace(/-([a-z])/ig, (all, letter) => letter.toUpperCase());
export const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
export const toUpperCase = (input: string) => toCamelCase(input.charAt(0).toUpperCase() + input.slice(1));
export const toKebabCase = (str: string) =>
    str?.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toLowerCase()).join('-') || '';

export const toPascalCase = (str: string = ''): string => {
    if (!str) { return ''; }
    return String(str)
        .replace(/^[^A-Za-z0-9]*|[^A-Za-z0-9]*$/g, '$')
        .replace(/[^A-Za-z0-9]+/g, '$')
        .replace(/([a-z])([A-Z])/g, (m, a, b) => `${a}$${b}`)
        .toLowerCase()
        .replace(/(\$)(\w?)/g, (m, a, b) => b.toUpperCase());
};