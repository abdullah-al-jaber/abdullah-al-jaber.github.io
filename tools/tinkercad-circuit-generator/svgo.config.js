module.exports = {
    multipass: true,
    plugins: [
        {
            name: "preset-default",
            params: {
                overrides: {
                    minifyStyles: false,
                    inlineStyles: false,
                    removeDesc: { removeAny: true },
                },
            },
        },
        "removeTitle",
        "removeMetadata",
        "removeComments",
        "removeEditorsNSData",
        "removeStyleElement",
    ],
};
