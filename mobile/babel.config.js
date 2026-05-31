module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        { unstable_transformProfile: "hermes-stable" },
      ],
    ],
    overrides: [
      {
        // Apply private-field transforms everywhere EXCEPT react-native's DOM event
        // implementation files. Those files use Flow type annotations like `+NONE: 0`
        // (no JS initializer) and rely on Object.defineProperty(proto, 'NONE',
        // { writable: false }) after the class body. If class-properties (loose) runs
        // on them, it generates `this.NONE = 0` in the constructor, which throws
        // "Cannot assign to read-only property 'NONE'" in strict mode because NONE
        // is already frozen on Event.prototype. Those files' public fields are plain
        // class fields that Hermes SDK 54 handles natively.
        exclude: /react-native[/\\]src[/\\]private[/\\]webapis[/\\]dom/,
        plugins: [
          ["@babel/plugin-transform-class-properties", { loose: true }],
          ["@babel/plugin-transform-private-methods", { loose: true }],
        ],
      },
      {
        // Apply transform-classes to react-native + metro-runtime to fix the Hermes
        // SDK 54 scope bug where class names are not resolvable in static methods.
        // Exclude dom/events (Object.defineProperty read-only statics conflict).
        test: (filePath) => {
          const p = filePath.replace(/\\/g, '/');
          if (p.includes('/react-native/src/private/webapis/dom')) return false;
          return (
            p.includes('/node_modules/react-native/') ||
            p.includes('/node_modules/metro-runtime/')
          );
        },
        plugins: [
          ["@babel/plugin-transform-classes", { loose: true }],
        ],
      },
    ],
  };
};
