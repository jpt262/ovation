import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import pkg from './package.json';

const banner = `/**
 * Ovation - A clap-activated switch
 * v${pkg.version}
 * 
 * @license ${pkg.license}
 * ${pkg.homepage}
 */`;

export default [
    // UMD build (for browsers)
    {
        input: 'src/index.js',
        output: {
            name: 'Ovation',
            file: pkg.unpkg,
            format: 'umd',
            banner,
        },
        plugins: [
            resolve(),
            babel({
                babelHelpers: 'bundled',
                presets: [['@babel/preset-env', { targets: '> 1%, not dead' }]],
            }),
            terser(),
        ],
    },
    // UMD build (not minified, for debugging)
    {
        input: 'src/index.js',
        output: {
            name: 'Ovation',
            file: 'dist/ovation.js',
            format: 'umd',
            banner,
        },
        plugins: [
            resolve(),
            babel({
                babelHelpers: 'bundled',
                presets: [['@babel/preset-env', { targets: '> 1%, not dead' }]],
            }),
        ],
    },
    // ESM build (for modern bundlers)
    {
        input: 'src/index.js',
        output: {
            file: pkg.module,
            format: 'es',
            banner,
        },
        plugins: [
            resolve(),
        ],
    },
]; 