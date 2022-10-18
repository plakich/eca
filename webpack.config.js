const {resolve} = require('path');
let {name: libraryName} = require("./package.json");

libraryName = typeof libraryName === "undefined" ? "index" : libraryName; 

module.exports = env =>
{
    const sharedConfig = {
        entry: `./src/${libraryName}.js`,
        mode: env.dev || env.build || "development", // could also set using --mode via scripts (just being explicit here)
    };

    const browserUMD =  {
        devtool: env.dev ? 'source-map' : undefined,
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: resolve(__dirname, 'node_modules'),
                    include: resolve(__dirname, 'src'),
                    use: ['babel-loader']
                }
            ]
        },
        output: {
            path: resolve(__dirname, 'dist'),
            filename: `${libraryName}${env.build ? '.min' : '.bundle'}.js`,
            library: {
                name: libraryName,
                type: 'umd',
                umdNamedDefine: true, // using amd will call define with libraryName as id
                export: "default" // exposes default export as libraryName global
            }     
        },
        devServer: {
            static: {
                directory: resolve(__dirname, 'dist'),
            },
            compress: true,
            port: 9000
        },
        ...sharedConfig
    };

    const cjsModule = {
        devtool: false,
        output: {
            path: resolve(__dirname, 'dist'),
            filename: `${libraryName}.cjs.js`,
            library: {
                type: 'commonjs2' 
            },
        },
        optimization: {
            minimize: false
        },
        ...sharedConfig
    };

    const esModule = {
        devtool: false,
        experiments: {
            outputModule: true // for esm to work
        },
        output: {
            path: resolve(__dirname, 'dist'),
            filename: `${libraryName}.esm.js`,
            library: {
                type: 'module' // output esm
            },
        },
        optimization: {
            minimize: false
        },
        ...sharedConfig
    };

    // return array because we want to output the file in 
    // three separate formats, which leaves the user 
    // the choice to import the library how they want.
    // First, we use UMD to output a minified file meant for the browser:
    // library api is exposed as libraryName global, but it could
    // also be asynchronously required via a loader like requireJS 
    // or browser-cjs (UMD supports both CommonJS require and AMD define). 
    // Second, we use CJS to output a non-minified file meant to 
    // be included in another app's build (e.g., npm package, or an express app).
    // Finally, we output as an ESM module as well, which can be
    // used anywhere import is supported (e.g., node, browser).
    // Also, only the browser UMD version is transpiled/minified. 
    // This leaves the developer the ability to transpile for their
    // own set of target browsers, whatever their own project uses.
    return [browserUMD, cjsModule, esModule]
};