import fs from "node:fs/promises";
import path from "node:path";

function isLocalAsset(value) {
    if (!value) return false;
    if (/^(?:[a-z]+:)?\/\//i.test(value)) return false;
    if (value.startsWith("data:")) return false;
    if (value.startsWith("#")) return false;
    return true;
}

async function readText(filePath) {
    return fs.readFile(filePath, "utf8");
}

function inlineScriptSource(code) {
    return code.replace(/<\/script/gi, "<\\/script");
}

async function buildSingleHtml(inputHtmlPath, outputHtmlPath) {
    const inputAbs = path.resolve(inputHtmlPath);
    const outputAbs = path.resolve(outputHtmlPath);
    const inputDir = path.dirname(inputAbs);
    let html = await readText(inputAbs);

    const cssRegex = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    html = await replaceAsync(html, cssRegex, async (full, href) => {
        if (!isLocalAsset(href)) return full;
        const cssPath = path.resolve(inputDir, href);
        const css = await readText(cssPath);
        return `<style>\n${css}\n</style>`;
    });

    const scriptRegex = /<script\b([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/gi;
    html = await replaceAsync(html, scriptRegex, async (full, preAttrs, src, postAttrs) => {
        if (!isLocalAsset(src)) return full;
        const jsPath = path.resolve(inputDir, src);
        const js = await readText(jsPath);
        const attrs = `${preAttrs || ""}${postAttrs || ""}`.trim();
        const attrText = attrs ? ` ${attrs}` : "";
        return `<script${attrText}>\n${inlineScriptSource(js)}\n</script>`;
    });

    await fs.mkdir(path.dirname(outputAbs), { recursive: true });
    await fs.writeFile(outputAbs, html, "utf8");
    return outputAbs;
}

async function replaceAsync(input, regex, replacer) {
    const tasks = [];
    input.replace(regex, (...args) => {
        tasks.push(replacer(...args));
        return args[0];
    });
    const replacements = await Promise.all(tasks);
    let i = 0;
    return input.replace(regex, () => replacements[i++]);
}

const inputArg = process.argv[2] || "index.html";
const outputArg = process.argv[3] || "dist/index.single.html";

buildSingleHtml(inputArg, outputArg)
    .then((outputPath) => {
        process.stdout.write(`Built ${outputPath}\n`);
    })
    .catch((error) => {
        process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
        process.exit(1);
    });
