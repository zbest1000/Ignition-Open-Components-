const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');

const LibName = "OpenECharts";

function copyToResources(compilation, callback) {
    const generatedResourcesDir = path.resolve(__dirname, 'build/generated-resources/mounted/');
    const jsToCopy = path.resolve(__dirname, "dist", `${LibName}.js`);
    const cssToCopy = path.resolve(__dirname, "dist", `${LibName}.css`);
    const jsResourcePath = path.resolve(generatedResourcesDir, `${LibName}.js`);
    const cssResourcePath = path.resolve(generatedResourcesDir, `${LibName}.css`);

    const toCopy = [
        { from: jsToCopy, to: jsResourcePath },
        { from: cssToCopy, to: cssResourcePath }
    ];

    if (!fs.existsSync(generatedResourcesDir)) {
        fs.mkdirSync(generatedResourcesDir, { recursive: true });
    }

    const errors = [];
    toCopy.forEach(file => {
        if (!fs.existsSync(file.from)) {
            errors.push(`expected bundle output not found: ${file.from}`);
            return;
        }
        try {
            fs.copyFileSync(file.from, file.to);
        } catch (err) {
            errors.push(`failed to copy ${file.from} -> ${file.to}: ${err.message}`);
        }
    });

    // Fail the build rather than silently shipping an empty mounted/ folder,
    // which would cause the gateway to serve 404s for the JS/CSS bundle.
    if (errors.length > 0) {
        callback(new Error(`CopyToResourcesPlugin: ${errors.join('; ')}`));
        return;
    }

    callback();
}

module.exports = {
    entry: './src/index.ts',
    output: {
        library: LibName,
        path: path.join(__dirname, "dist"),
        filename: `${LibName}.js`,
        libraryTarget: "umd",
        umdNamedDefine: true
    },
    devtool: "source-map",
    resolve: {
        extensions: [".jsx", ".js", ".ts", ".tsx", ".d.ts", ".css"],
        modules: [
            path.resolve(__dirname, "node_modules")
        ]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: { url: false }
                    }
                ]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: `${LibName}.css`
        }),
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tapAsync('CopyToResourcesPlugin', copyToResources);
            }
        }
    ],
    externals: {
        "react": "React",
        "react-dom": "ReactDOM",
        "@inductiveautomation/perspective-client": "PerspectiveClient"
    },
    optimization: {
        splitChunks: false
    }
};
