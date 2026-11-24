/**
 * Builds the browser bundle the gateway serves under /res/open-echarts/.
 *
 * Output:
 *   OpenECharts.js / OpenECharts.css   the entry files; the Java descriptors reference these names
 *   OpenECharts.<name>.<hash>.js       chunks loaded on demand (echarts-gl)
 *
 * Every emitted .js and .css file (and the extracted licence notices) is copied into build/generated-resources/mounted/,
 * which Gradle packages into the module.
 */
const path = require('path');
const fs = require('fs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const LibName = 'OpenECharts';
const distDir = path.resolve(__dirname, 'dist');
const mountedDir = path.resolve(__dirname, 'build/generated-resources/mounted');

// Scripts, stylesheets, and the third-party licence notices the minified scripts refer to.
const isServedFile = name => /\.(js|css)$|\.LICENSE\.txt$/.test(name);

/**
 * Mirrors the emitted .js/.css files into the mounted resources folder, and
 * removes files left there by an earlier build (chunk names carry a content
 * hash, so stale ones would otherwise pile up). Fails the build rather than
 * shipping a module whose scripts would 404.
 */
class CopyToMountedPlugin {
    apply(compiler) {
        compiler.hooks.afterEmit.tapAsync('CopyToMountedPlugin', (compilation, callback) => {
            try {
                const emitted = compilation.getAssets().map(asset => asset.name).filter(isServedFile);
                for (const required of [`${LibName}.js`, `${LibName}.css`]) {
                    if (!emitted.includes(required)) throw new Error(`expected bundle output not found: ${required}`);
                }

                fs.mkdirSync(mountedDir, { recursive: true });
                for (const stale of fs.readdirSync(mountedDir)) {
                    if (isServedFile(stale) && !emitted.includes(stale)) fs.rmSync(path.join(mountedDir, stale));
                }
                for (const name of emitted) {
                    const target = path.join(mountedDir, name);
                    fs.mkdirSync(path.dirname(target), { recursive: true });
                    fs.copyFileSync(path.join(distDir, name), target);
                }
                callback();
            } catch (err) {
                callback(new Error(`CopyToMountedPlugin: ${err.message}`));
            }
        });
    }
}

module.exports = (_env, argv) => {
    const production = argv.mode === 'production';

    return {
        entry: './src/index.ts',
        output: {
            library: LibName,
            libraryTarget: 'umd',
            umdNamedDefine: true,
            path: distDir,
            filename: `${LibName}.js`,
            chunkFilename: `${LibName}.[name].[contenthash:8].js`,
            // Chunks are fetched from wherever the gateway served the entry script.
            publicPath: 'auto',
            // Perspective and other modules are webpack bundles on the same page; keep the chunk registries apart.
            uniqueName: LibName,
            chunkLoadingGlobal: `webpackChunk${LibName}`,
        },
        // The map is written to dist/ for debugging but not shipped, so the bundle must not point at it.
        devtool: production ? 'hidden-source-map' : 'source-map',
        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
            modules: [path.resolve(__dirname, 'node_modules')],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        { loader: 'css-loader', options: { url: false } },
                    ],
                },
            ],
        },
        plugins: [
            new MiniCssExtractPlugin({ filename: `${LibName}.css` }),
            new CopyToMountedPlugin(),
        ],
        // Provided by Perspective as page globals. Bundling any of them would
        // put a second copy on the page (two Reacts break hooks and context).
        externals: {
            'react': 'React',
            'react-dom': 'ReactDOM',
            'mobx': 'mobx',
            'mobx-react': 'mobxReact',
            '@inductiveautomation/perspective-client': 'PerspectiveClient',
            '@inductiveautomation/perspective-common': 'PerspectiveCommon',
        },
        optimization: {
            // Only the explicit import() of echarts-gl creates a chunk.
            splitChunks: false,
        },
        performance: {
            // ECharts is large by nature; the sizes are checked by the smoke test instead.
            hints: false,
        },
    };
};
