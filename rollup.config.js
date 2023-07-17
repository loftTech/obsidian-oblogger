import copy from 'rollup-plugin-copy-watch'
import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';
import scss from "rollup-plugin-scss";

const configs = [{
    input: "src/main.ts",
    external: ["obsidian"],
    output: {
        dir: "build",
        sourcemapExcludeSources: true,
        format: "cjs",
        exports: "default",
        name: "Oblogger (Production)",
    },
    plugins: [
        scss({ output: 'build/styles.css' }),
        typescript(),
        terser(),
        copy({
            targets: [
                { src: "manifest.json", dest: "build" }
            ],
        })
    ],
}];

export default configs;
