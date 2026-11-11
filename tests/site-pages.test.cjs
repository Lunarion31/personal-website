const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pages = ["index.html", "about/index.html", "contact/index.html", "previews/observatory.html"];

function checkLocalURL(value, from) {
  const url = new URL(value, new URL(from, "https://www.lunarion31.dev/"));
  if (!["www.lunarion31.dev", "lunarion31.dev"].includes(url.hostname)) return;
  const file = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
  assert.ok(fs.statSync(path.join(root, file), { throwIfNoEntry: false })?.isFile(), `${from}: missing ${value}`);
  if (url.hash) {
    const id = decodeURIComponent(url.hash.slice(1));
    assert.ok(read(file).includes(`id="${id}"`), `${from}: missing anchor ${value}`);
  }
}

test("local page links, fragments, assets and preview images resolve", () => {
  for (const file of pages) {
    const html = read(file);
    for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      checkLocalURL(value, file);
    }
    for (const [, value] of html.matchAll(/<meta[^>]+(?:property="og:image"|name="twitter:image")\s+content="([^"]+)"/g)) {
      checkLocalURL(value, file);
    }
  }
  for (const file of ["simple.css", "editorial.css", "previews/observatory.html"]) {
    for (const [, value] of read(file).matchAll(/url\(["']?([^)"']+)["']?\)/g)) {
      checkLocalURL(value, file);
    }
  }
});

test("old about and contact bookmarks lead to the corresponding homepage sections", () => {
  for (const section of ["about", "contact"]) {
    assert.ok(read(section + "/index.html").includes(`http-equiv="refresh" content="0; url=/#${section}"`));
    checkLocalURL("/#" + section, "index.html");
  }
});

test("published Lumi hotlinks retain their image formats and dimensions", () => {
  const gif = fs.readFileSync(path.join(root, "static/img/buttons/lumi.gif"));
  assert.equal(gif.toString("ascii", 0, 6), "GIF89a");
  assert.equal(gif.readUInt16LE(6), 88);
  assert.equal(gif.readUInt16LE(8), 31);
  for (const file of ["static/img/buttons/lumi.png", "assets/lumi.png"]) {
    const png = fs.readFileSync(path.join(root, file));
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), 88);
    assert.equal(png.readUInt32BE(20), 31);
  }
});

test("retired demo endpoint never sends email, even with old provider credentials", async () => {
  const context = vm.createContext({
    module: { exports: {} },
    process: { env: { RESEND_API_KEY: "mock-key", CONTACT_TO_EMAIL: "old@example.invalid" } },
    fetch() { throw new Error("Retired API must not call the email provider"); },
  });
  vm.runInContext(read("api/contact.js"), context);
  for (const method of ["GET", "POST"]) {
    const response = {
      headers: {}, code: null, body: null,
      setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await context.module.exports({ method, body: { name: "Test", district: "Old form" } }, response);
    assert.equal(response.code, 410);
    assert.equal(response.headers["Cache-Control"], "no-store");
    assert.match(response.body.error, /lunarion31@whale.lat/);
  }
});
