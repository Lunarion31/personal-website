const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const routes = ["", "about", "contact", "privacy", "terms"];
const artTags = (html) => [...html.matchAll(/<img\b[^>]*src="\/assets\/art\/[^>]+>/g)].map(([tag]) => tag);

test("editorial plates are local, self-contained SVGs with explicit viewboxes", () => {
    for (const asset of ["curiosity-cabinet", "curious-eye", "paper-flight", "ink-comet"]) {
        const svg = read(`assets/art/${asset}.svg`);
        assert.match(svg, /^<svg[^>]*viewBox="0 0 \d+ \d+"/);
        assert.match(svg, /#173452/);
        assert.doesNotMatch(svg, /<script\b|<foreignObject\b|<image\b|\b(?:href|src)\s*=/i);
        assert.ok(Buffer.byteLength(svg) < 15000, `${asset}: lightweight illustration`);
    }
});

test("every page uses sized, accessible editorial images without new scripts", () => {
    for (const route of routes) {
        const html = read(path.join(route, "index.html"));
        const tags = artTags(html);
        assert.ok(tags.length > 0, `${route || "home"}: artwork is integrated`);
        for (const tag of tags) {
            const asset = tag.match(/src="([^"]+)"/)[1];
            assert.ok(fs.existsSync(path.join(root, asset)));
            assert.match(tag, /width="\d+" height="\d+"/);
            assert.match(tag, /decoding="async"/);
            assert.match(tag, /alt="[^"]*"/);
            if (tag.includes('alt=""')) assert.match(tag, /aria-hidden="true"/);
            else assert.doesNotMatch(tag, /aria-hidden="true"/);
        }
        assert.match(html, /newspaper\.css\?v=jamie-journal-v18/);
    }
});

test("homepage interests illustration and contact plate are captioned and lazy-loaded", () => {
    const home = read("index.html");
    assert.match(home, /<section class="journal-art page-section" id="interests" aria-labelledby="interests-title">/);
    assert.match(home, /id="interests-title">The things/);
    assert.match(home, /curiosity-cabinet\.svg"[^>]*loading="lazy"/);
    assert.match(home, /Fig\. 02 — A few things that keep me curious/);
    assert.match(read("contact/index.html"), /<figure class="correspondence-art">[\s\S]*?paper-flight\.svg"[^>]*loading="lazy"[\s\S]*?<figcaption>/);
});

test("legal artwork stays outside the reading area and the original moon is retained", () => {
    for (const route of ["privacy", "terms"]) {
        const html = read(`${route}/index.html`);
        const article = html.match(/<article\b[\s\S]*?<\/article>/)[0];
        assert.doesNotMatch(article, /assets\/art\//);
        assert.match(html, /<aside class="legal-stamp"[^>]*><img src="\/assets\/art\/ink-comet\.svg"/);
    }
    assert.match(read("index.html"), /src="\/assets\/lunar-orbit\.svg\?v=journal-v16"/);
    assert.match(read("newspaper.css"), /\.journal-art-layout\s*\{[^}]*minmax\(0,/);
});
