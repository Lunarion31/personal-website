const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const pages = ["", "about", "contact", "privacy", "terms"];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const htmlFor = (page) => read(path.join(page, "index.html")).replace(/<!--[\s\S]*?-->/g, "");
const textOnly = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const attributes = (tag) => Object.fromEntries(Array.from(
  tag.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g),
  ([, name, doubleValue, singleValue]) => [name, doubleValue ?? singleValue ?? ""],
));
const tags = (html, tagName) => Array.from(html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi")), ([tag]) => attributes(tag));

test("all routes share navigation, local motion assets and semantic page landmarks", () => {
  for (const page of pages) {
    const html = htmlFor(page);
    assert.equal(tags(html, "h1").length, 1, `${page || "home"}: one H1`);
    assert.equal(tags(html, "main").length, 1, `${page || "home"}: one main`);
    assert.equal(tags(html, "main")[0].id, "main");
    assert.match(html, /class="skip-link" href="#main"/);
    const primaryNav = tags(html, "nav").find((tag) => tag.id === "primary-nav");
    assert.ok(primaryNav?.["aria-label"], `${page}: labelled navigation`);
    const menu = tags(html, "button").find((tag) => tag.class === "menu-toggle");
    assert.equal(menu.type, "button");
    assert.equal(menu["aria-controls"], "primary-nav");
    assert.equal(menu["aria-expanded"], "false");
    assert.deepEqual(tags(html, "script").map((tag) => tag.src.split("?")[0]), [
      "/site-navigation.js",
      ...(!page ? ["/home-intro.js"] : []),
      "/script.js", "/site-sound.js", "/site.js", "/button-sparks.js", "/assets/vendor/lenis-1.3.26.min.js", "/site-motion.js",
    ], `${page}: common scripts execute in dependency order`);
    for (const script of tags(html, "script").filter((tag) => !["/site-navigation.js", "/home-intro.js"].includes(tag.src.split("?")[0]))) assert.ok("defer" in script);
    assert.ok(html.indexOf('/site-navigation.js') < html.indexOf('</head>'), "entry initialization precedes first paint");
    const styles = tags(html, "link").filter((tag) => tag.rel === "stylesheet").map((tag) => tag.href);
    assert.deepEqual(styles, page ? ["/site.css?v=lunarion-blue-20260930", "/pages.css?v=lunarion-blue-20260930"] : ["/site.css?v=lunarion-blue-20260930"]);
    assert.ok(!html.includes("/homepage") && !html.includes('href="/styles.css"'), "no obsolete styling/motion references");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
    assert.equal(ids.length, new Set(ids).size, `${page}: unique IDs`);
    const brandImages = tags(html, "img").filter((tag) => tag.class === "brand-icon");
    assert.equal(brandImages.length, 2, `${page}: header and footer branding`);
    for (const image of brandImages) {
      assert.equal(image.src, "/assets/lunarion-mark.svg");
      assert.equal(image.alt, "");
      assert.ok(Number(image.width) > 0 && Number(image.height) > 0);
    }
  }
});

test("every route keeps one sound control outside the navigation and page transition containers", () => {
  for (const page of pages) {
    const html = htmlFor(page);
    const controls = tags(html, "button").filter(tag => tag.class === "site-sound-toggle");
    assert.equal(controls.length, 1, `${page || "home"}: one persistent sound control`);
    assert.equal(controls[0].type, "button");
    assert.equal(controls[0]["aria-pressed"], "false");
    assert.ok(!html.match(/<header\b[\s\S]*?<\/header>/)[0].includes("site-sound-toggle"));
    assert.match(html, /<\/header>\s*<button class="site-sound-toggle"/);
    assert.match(html, /class="site-sound-label" aria-hidden="true">Sound off/);
  }
  const css = read("site.css");
  assert.match(css, /\.site-sound-toggle\s*\{[^}]*position:\s*fixed/);
  assert.match(css, /\.site-sound-toggle\s*\{[^}]*bottom:\s*max\(16px, env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.site-sound-toggle\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /@media print\s*\{\s*\.site-sound-toggle \{ display: none; \}/);
});

test("interior Home buttons navigate to the homepage route while Home on the homepage scrolls", () => {
  assert.match(htmlFor(""), /<a href="#main"[^>]*>Home<\/a>/);
  for (const page of pages.filter(Boolean)) {
    assert.match(htmlFor(page), /<a href="\/">Home<\/a>/, `${page}: Home uses document navigation, not a fragment`);
  }
});

test("the presentation-only introduction exists on the homepage and nowhere else", () => {
  assert.match(htmlFor(""), /<div class="home-intro" aria-hidden="true" inert>/);
  assert.ok(htmlFor("").indexOf('/home-intro.js') < htmlFor("").indexOf('</head>'));
  for (const page of pages.filter(Boolean)) {
    assert.ok(!htmlFor(page).includes("home-intro"), `${page}: no introduction markup or script`);
  }
});

test("homepage doodles are lightweight decorative artwork", () => {
  const doodles = tags(htmlFor(""), "svg").filter((tag) => tag.class?.includes("editorial-doodle"));
  assert.equal(doodles.length, 6);
  for (const doodle of doodles) {
    assert.equal(doodle["aria-hidden"], "true");
    assert.equal(doodle.focusable, "false");
    assert.ok(doodle.viewBox);
  }
});

test("interior pages have accessible decorative accents outside legal text and form fields", () => {
  for (const page of pages.filter(Boolean)) {
    const html = htmlFor(page);
    const doodles = tags(html, "svg").filter((tag) => tag.class?.includes("editorial-doodle"));
    assert.equal(doodles.length, 2, `${page}: two restrained accents`);
    for (const doodle of doodles) {
      assert.equal(doodle["aria-hidden"], "true");
      assert.equal(doodle.focusable, "false");
    }
    const readingArea = html.match(/<(?:article|form)\b[\s\S]*?<\/(?:article|form)>/)?.[0] || "";
    assert.ok(!readingArea.includes("editorial-doodle"), `${page}: reading and input areas stay clear`);
  }
  assert.match(read("pages.css"), /@media print\s*\{\s*\.editorial-doodle, \.contact-doodles \{ display: none; \}/);
});

test("About has an editorial cover and does not reuse the homepage hero image", () => {
  const about = htmlFor("about");
  assert.match(about, /class="about-cover page-section"/);
  assert.match(about, /class="about-perspective-mark"/);
  assert.ok(!about.includes('src="/assets/spark-field.webp"'));
  assert.ok(!about.includes('as="image"'));
  assert.ok(about.includes("I\'m Lunarion, a student with a passion for programming."));
  assert.ok(about.includes("My original site, Whale, turned a portfolio into a retro desktop."));
  assert.ok(!about.includes("security researchers"));
  assert.ok(about.includes("Still exploring"));
  assert.match(about, /href="\/contact\/">Start a conversation/);
});

test("all local page links, fragments and asset references resolve", () => {
  for (const page of pages) {
    const html = htmlFor(page);
    for (const [, value] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (!value.startsWith("/") && !value.startsWith("#")) continue;
      const destination = new URL(value, `https://spark.test/${page ? `${page}/` : ""}`);
      let file = path.join(root, destination.pathname);
      if (destination.pathname.endsWith("/")) file = path.join(file, "index.html");
      assert.ok(fs.existsSync(file), `${page}: missing ${value}`);
      if (destination.hash) {
        const id = decodeURIComponent(destination.hash.slice(1));
        assert.ok(read(path.relative(root, file)).includes(`id="${id}"`), `${page}: missing anchor ${value}`);
      }
    }
  }
  for (const stylesheet of ["site.css", "pages.css"]) {
    for (const [, value] of read(stylesheet).matchAll(/url\(["']?(\/[^"')]+)["']?\)/g)) {
      assert.ok(fs.existsSync(path.join(root, value)), `${stylesheet}: missing ${value}`);
    }
  }
});

test("portfolio privacy and site notes describe the current website, not a school product", () => {
  const privacy = htmlFor("privacy");
  assert.match(privacy, /local storage/);
  assert.match(privacy, /session storage/);
  assert.match(privacy, /does not submit a form/);
  assert.match(privacy, /hosting provider/);
  assert.match(htmlFor("terms"), /repository's own license/);
  for (const page of ["privacy", "terms"]) {
    const html = htmlFor(page);
    assert.doesNotMatch(html, /FERPA|CIPA|CONTACT_FROM_EMAIL|contact@sparkforschools/);
    assert.match(html, /mailto:lunarion31@whale.lat/);
  }
});

test("contact uses verified personal links and does not submit a district form", () => {
  const html = htmlFor("contact");
  assert.doesNotMatch(html, /<form|data-contact-form|name="district"|name="devices"/);
  assert.match(html, /href="mailto:lunarion31@whale.lat"/);
  assert.match(html, /href="https:\/\/github.com\/lunarion31"/);
  assert.match(html, /href="https:\/\/bsky.app\/profile\/lunarion31.bsky.social"/);
  assert.match(html, /Nothing is sent until you send it there/);
  assert.doesNotMatch(read("script.js"), /fetch\(|\/api\/contact/);
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

test("every page identifies Lunarion in its metadata and uses the new preview image", () => {
  for (const page of pages) {
    const html = htmlFor(page);
    assert.match(html, /<title>[^<]*Lunarion/);
    assert.match(html, /property="og:site_name" content="Lunarion"/);
    assert.match(html, /https:\/\/lunarion31.dev\/assets\/lunarion-share-blue.jpg/);
    assert.doesNotMatch(html, /Request a demo|Sparking your education|contact@sparkforschools.com/);
  }
  assert.ok(fs.existsSync(path.join(root, "assets/lunarion-share-blue.jpg")));
});
