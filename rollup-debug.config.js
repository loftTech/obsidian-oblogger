import copy from 'rollup-plugin-copy-watch'
import typescript from 'rollup-plugin-typescript2';
import scss from "rollup-plugin-scss";

const configs = [{
    input: "src/main.ts",
    external: ["obsidian"],
    output: {
        dir: "test-vault/.obsidian/plugins/oblogger",
        format: "cjs",
        exports: "default",
        name: "Oblogger (Development)",
    },
    plugins: [
        typescript(),
        scss({output: "test-vault/.obsidian/plugins/oblogger/styles.css"}),
        copy({
            targets: [
                { src: "manifest.json", dest: "test-vault/.obsidian/plugins/oblogger/" },
            ],
            verbose: true
        })
    ],
}];
export default configs;
