export default {
    type: "object",
        properties: {
        name: { },
        regExp: { },
        context: {
            type: "string",
        },
        publicPath: { },
        outputPath: { },
        useRelativePath: {
            type: "boolean",
        },
        emitFile: {
            type: "boolean",
        },
    },
    additionalProperties: true,
};
