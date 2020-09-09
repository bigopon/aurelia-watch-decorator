const path = require('path');
const { AureliaPlugin } = require('aurelia-webpack-plugin');

module.exports = function (config) {
  const browsers = config.browsers;
  config.set({
    basePath: '',
    frameworks: ["jasmine"],
    files: ["tests/**/*.spec.ts"],
    preprocessors: {
      "tests/**/*.spec.ts": ["webpack", 'sourcemap']
    },
    webpack: {
      mode: "development",
      entry: 'tests/setup.ts',
      resolve: {
        extensions: [".ts", ".js"],
        modules: ["node_modules"],
        alias: {
          src: path.resolve(__dirname, 'src'),
          tests: path.resolve(__dirname, 'tests')
        }
      },
      devtool: browsers.includes('ChromeDebugging') ? 'eval-source-map' : 'inline-source-map',
      module: {
        rules: [
          {
            test: /\.ts$/,
            loader: "ts-loader",
            exclude: /node_modules/
          }
        ]
      },
      plugins: [
        new AureliaPlugin({
          aureliaApp: undefined,
          dist: 'es2015',
          features: {
            ie: false,
            svg: false,
            unparser: false,
            polyfills: "esnext"
          }
        })
      ]
    },
    mime: {
      "text/x-typescript": ["ts"]
    },
    reporters: ["mocha"],
    webpackServer: { noInfo: config.noInfo },
    browsers: Array.isArray(browsers) && browsers.length > 0 ? browsers : ['ChromeHeadless'],
    customLaunchers: {
      ChromeDebugging: {
        base: 'Chrome',
        flags: [
          '--remote-debugging-port=9333'
        ],
        debug: true
      }
    },
    mochaReporter: {
      ignoreSkipped: true
    },
    singleRun: false
  });
};
