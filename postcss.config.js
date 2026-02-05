export const plugins = {
  tailwindcss: {},
  autoprefixer: {},
  ...(process.env.NODE_ENV === "production"
    ? {
        cssnano: {
          preset: [
            "default",
            {
              discardComments: { removeAll: true },
              reduceIdents: false,
              zindex: false,
              colormin: true,
              normalizeWhitespace: true,
              minifyFontValues: true,
              minifySelectors: true,
            },
          ],
        },
      }
    : {}),
};
