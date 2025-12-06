declare module '@google/genai' {
    export class GoogleGenAI {
        constructor(config: { apiKey: string });
        models: {
            generateContent(params: any): Promise<any>;
        };
    }
    export enum Type {
        TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
        STRING = 'STRING',
        NUMBER = 'NUMBER',
        INTEGER = 'INTEGER',
        BOOLEAN = 'BOOLEAN',
        ARRAY = 'ARRAY',
        OBJECT = 'OBJECT',
        NULL = 'NULL'
    }
}