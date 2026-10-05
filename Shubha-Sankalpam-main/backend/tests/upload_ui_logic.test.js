/**
 * upload_ui_logic.test.js
 *
 * Exercises the REAL uploader section of frontend/assets/js/admin.js by
 * running it inside a Node vm context with:
 *   - a minimal, hand-rolled DOM stub
 *   - a mocked fetch whose response is configurable per test
 *   - a spy FormData that records every appended key-value pair
 *
 * No helper logic is copied or replicated from admin.js.
 * The actual production code runs and mutates fake DOM elements;
 * tests inspect those elements afterwards.
 */

"use strict";

const vm   = require("vm");
const fs   = require("fs");
const path = require("path");

// ============================================================
//  1. Extract the real uploader section from admin.js
// ============================================================
const ADMIN_JS = path.join(__dirname, "../../frontend/assets/js/admin.js");
const fullSrc  = fs.readFileSync(ADMIN_JS, "utf8");

const MARKER   = "// IMAGE UPLOADER (Phase 2";
const sliceAt  = fullSrc.indexOf(MARKER);
if (sliceAt === -1) {
    console.error("FATAL: '" + MARKER + "' not found in admin.js");
    process.exit(1);
}
const uploaderCode = fullSrc.slice(sliceAt);

// ============================================================
//  2. Minimal DOM stub
// ============================================================

class FakeElement {
    constructor(id) {
        this.id          = id;
        this.value       = "";
        this.src         = "";
        this.style       = { display: "", color: "" };
        this.textContent = "";
        this.disabled    = false;
        this.files       = null;
        this.onload      = null;
        this.onerror     = null;
        this._listeners  = {};
    }

    addEventListener(event, fn) {
        (this._listeners[event] || (this._listeners[event] = [])).push(fn);
    }

    async _trigger(event) {
        for (const fn of (this._listeners[event] || [])) {
            await fn();
        }
    }
}

// All element IDs the uploader touches
const ELEMENT_IDS = [
    "filePujaImage",    "editPujaImage",    "prevPujaImage",    "statusPujaImage",
    "filePackageImage", "editPackageImage", "prevPackageImage", "statusPackageImage",
    "fileTempleImage",  "editTempleImage",  "prevTempleImage",  "statusTempleImage",
];
const elements = {};
for (const id of ELEMENT_IDS) elements[id] = new FakeElement(id);

// Upload buttons found via querySelector('[data-file="X"]')
const uploadBtns = {
    filePujaImage:    new FakeElement("uploadBtn-puja"),
    filePackageImage: new FakeElement("uploadBtn-package"),
    fileTempleImage:  new FakeElement("uploadBtn-temple"),
};

// Collects DOMContentLoaded handlers
const domListeners = [];

// ============================================================
//  3. Spy FormData
// ============================================================
class FakeFormData {
    constructor() {
        this._fields = [];
        FakeFormData.lastInstance = this;
    }

    append(key, value) {
        this._fields.push([key, value]);
    }

    getField(key) {
        const pair = this._fields.find(([k]) => k === key);
        return pair ? pair[1] : undefined;
    }

    hasField(key) {
        return this._fields.some(([k]) => k === key);
    }
}
FakeFormData.lastInstance = null;

// ============================================================
//  4. Mutable fetch
// ============================================================
let currentFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

function setFetch({ ok, status, body }) {
    currentFetch = async () => ({ ok, status, json: async () => body });
}

// ============================================================
//  5. vm sandbox and execution
// ============================================================
const sandbox = vm.createContext({
    KEY: "test-admin-key",      // non-empty — upload handler checks this
    Promise,
    setTimeout: (fn) => fn(),   // synchronous — no real delays in tests
    fetch: (url, opts) => { console.log("FETCH:", url); return currentFetch(url, opts); },
    FormData: FakeFormData,
    URL: {
        createObjectURL: () => "blob:fake-object-url",
        revokeObjectURL: () => {},
    },
    document: {
        getElementById:   (id)  => elements[id] || null,
        querySelector:    (sel) => {
            const m = sel.match(/\[data-file="([^"]+)"\]/);
            return m ? (uploadBtns[m[1]] || null) : null;
        },
        querySelectorAll: () => ({ forEach: () => {} }),
        addEventListener: (ev, fn) => {
            if (ev === "DOMContentLoaded") domListeners.push(fn);
        },
    },
    window:    {},
    alert:     () => {},
    confirm:   () => true,
    console:   { log: () => {}, error: () => {}, warn: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    openEditPuja:    undefined,
    openEditPackage: undefined,
    openEditTemple:  undefined,
});

vm.runInContext(uploaderCode, sandbox);

// Fire DOMContentLoaded -> initImageUploaders wires all widgets
for (const fn of domListeners) fn();

// ============================================================
//  6. Helpers
// ============================================================
let passed = 0;
let failed = 0;

function assert(cond, label) {
    if (cond) {
        process.stdout.write("  \u2713 " + label + "\n");
        passed++;
    } else {
        process.stderr.write("  \u2717 FAIL: " + label + "\n");
        failed++;
    }
}

function resetState() {
    for (const id of ELEMENT_IDS) {
        const el = elements[id];
        el.value         = "";
        el.src           = "";
        el.style.display = "";
        el.style.color   = "";
        el.textContent   = "";
        el.disabled      = false;
        el.files         = null;
        el.onload        = null;
        el.onerror       = null;
    }
    for (const btn of Object.values(uploadBtns)) {
        btn.disabled    = false;
        btn.textContent = "Upload Image";
        btn.style.color = "";
    }
    FakeFormData.lastInstance = null;
}

// ============================================================
//  7. Tests
// ============================================================
async function runTests() {
    console.log("\n--- UPLOAD UI LOGIC TESTS (real admin.js via vm) ---\n");

    // Precondition: showPreviewIfImage must be accessible
    assert(
        typeof sandbox.showPreviewIfImage === "function",
        "Precondition: showPreviewIfImage accessible in vm sandbox"
    );

    // ------------------------------------------------------------------
    //  A. File picker: valid JPEG -> local preview shown, no fetch
    // ------------------------------------------------------------------
    console.log("\nA. File picker: valid file -> local preview, fetch NOT called");
    {
        resetState();
        let fetchCalled = false;
        currentFetch = async () => {
            fetchCalled = true;
            return { ok: true, status: 200, json: async () => ({}) };
        };

        elements["filePujaImage"].files = [{ type: "image/jpeg", size: 1024, name: "a.jpg" }];
        await elements["filePujaImage"]._trigger("change");

        assert(elements["prevPujaImage"].src === "blob:fake-object-url",
               "Preview src = blob URL");
        assert(elements["prevPujaImage"].style.display === "block",
               "Preview display:block");
        assert(elements["statusPujaImage"].textContent.includes("File selected"),
               "Status prompts to click Upload Image");
        assert(!fetchCalled, "fetch NOT called on file selection");
    }

    // ------------------------------------------------------------------
    //  B. Upload click: entity_type in FormData + success URL populates
    // ------------------------------------------------------------------
    console.log("\nB. Upload click: entity_type + success URL populates field & preview");
    {
        resetState();
        const returnedUrl = "https://cdn.supabase.co/storage/v1/object/public/pujas/uuid.jpg";
        setFetch({ ok: true, status: 200, body: { url: returnedUrl } });

        elements["filePujaImage"].files = [{ type: "image/jpeg", size: 500, name: "b.jpg" }];
        elements["editPujaImage"].value = "old/puja.jpg";

        await uploadBtns["filePujaImage"]._trigger("click");

        const fd = FakeFormData.lastInstance;
        assert(fd !== null,                          "FormData was created");
        assert(fd.getField("entity_type") === "pujas", "entity_type = 'pujas'");
        assert(!fd.hasField("entityType"),             "entityType (camelCase) absent");
        assert(fd.hasField("image"),                   "image field present");

        assert(elements["editPujaImage"].value === returnedUrl,
               "Text field updated to returned URL");
        assert(elements["prevPujaImage"].src === returnedUrl,
               "Preview src = returned URL");
        assert(elements["prevPujaImage"].style.display === "block",
               "Preview visible after success");
        assert(elements["statusPujaImage"].style.color === "green",
               "Status color = green");
        assert(elements["statusPujaImage"].textContent.includes("\u2713"),
               "Status has checkmark");
        assert(elements["filePujaImage"].value === "",
               "File picker cleared after success");
    }

    // ------------------------------------------------------------------
    //  C. 2xx with empty url string -> prior field preserved
    // ------------------------------------------------------------------
    console.log("\nC. 2xx with empty url string -> prior field preserved");
    {
        resetState();
        const prior = "assets/images/pujas/shiva.jpg";
        setFetch({ ok: true, status: 200, body: { url: "" } });

        elements["filePujaImage"].files = [{ type: "image/jpeg", size: 500, name: "c.jpg" }];
        elements["editPujaImage"].value = prior;

        await uploadBtns["filePujaImage"]._trigger("click");

        assert(elements["editPujaImage"].value === prior,
               "Field unchanged when url is empty string");
        assert(elements["statusPujaImage"].style.color !== "green",
               "Status NOT green");
        assert(elements["statusPujaImage"].textContent.includes("no URL"),
               "Status mentions no URL returned");
    }

    // ------------------------------------------------------------------
    //  D. 2xx with missing url key -> prior field preserved
    // ------------------------------------------------------------------
    console.log("\nD. 2xx with missing url key -> prior field preserved");
    {
        resetState();
        const prior = "assets/images/temples/kashi.jpg";
        setFetch({ ok: true, status: 200, body: {} });

        elements["fileTempleImage"].files = [{ type: "image/png", size: 200, name: "d.png" }];
        elements["editTempleImage"].value = prior;

        await uploadBtns["fileTempleImage"]._trigger("click");

        assert(elements["editTempleImage"].value === prior,
               "Field unchanged when url key absent");
        assert(elements["statusTempleImage"].textContent.includes("no URL"),
               "Status mentions no URL");
        assert(elements["statusTempleImage"].style.color !== "green",
               "Status NOT green");
    }

    // ------------------------------------------------------------------
    //  E. HTTP 400 -> prior field preserved, server message shown
    // ------------------------------------------------------------------
    console.log("\nE. HTTP 400 -> prior field preserved, server message shown");
    {
        resetState();
        const prior = "assets/images/packages/pkg1.jpg";
        setFetch({ ok: false, status: 400, body: { error: "Invalid image type" } });

        elements["filePackageImage"].files = [{ type: "image/webp", size: 300, name: "e.webp" }];
        elements["editPackageImage"].value = prior;

        await uploadBtns["filePackageImage"]._trigger("click");

        assert(elements["editPackageImage"].value === prior,
               "Field unchanged on HTTP error");
        assert(elements["statusPackageImage"].style.color !== "green",
               "Status NOT green on error");
        assert(elements["statusPackageImage"].textContent === "Invalid image type",
               "Server error message surfaced exactly");
    }

    // ------------------------------------------------------------------
    //  F. showPreviewIfImage: theme keywords -> no preview
    // ------------------------------------------------------------------
    console.log("\nF. showPreviewIfImage: theme keywords -> hidden, no network request");
    {
        const showFn = sandbox.showPreviewIfImage;
        for (const kw of ["ganesha", "shiva", "lakshmi", "default", "temple", "om", ""]) {
            const img = { src: "old", style: { display: "block" }, onerror: null, onload: null };
            showFn(img, kw);
            assert(img.src === "",               `"${kw}" -> src cleared`);
            assert(img.style.display === "none", `"${kw}" -> display:none`);
        }
    }

    // ------------------------------------------------------------------
    //  G. showPreviewIfImage: leading-slash path -> no double-slash
    // ------------------------------------------------------------------
    console.log("\nG. showPreviewIfImage: path with leading / -> not double-slashed");
    {
        const showFn = sandbox.showPreviewIfImage;
        const img = { src: "", style: { display: "" }, onerror: null, onload: null };
        showFn(img, "/assets/images/foo.jpg");

        assert(img.src === "/assets/images/foo.jpg",
               'src = "/assets/images/foo.jpg" (no double-slash)');
        assert(!img.src.startsWith("//"),
               "src does NOT start with //");
        assert(img.style.display === "block",
               "Preview visible for /path.jpg");
    }

    // ------------------------------------------------------------------
    //  H. showPreviewIfImage: relative path (no leading /) -> prefixed
    // ------------------------------------------------------------------
    console.log("\nH. showPreviewIfImage: relative path -> prefixed with /");
    {
        const showFn = sandbox.showPreviewIfImage;
        for (const [input, expected] of [
            ["assets/images/pujas/lakshmi.jpg", "/assets/images/pujas/lakshmi.jpg"],
            ["assets/images/temples/kashi.png", "/assets/images/temples/kashi.png"],
            ["images/pkg.webp",                 "/images/pkg.webp"],
        ]) {
            const img = { src: "", style: { display: "" }, onerror: null, onload: null };
            showFn(img, input);
            assert(img.src === expected,          `"${input}" -> src = "${expected}"`);
            assert(img.style.display === "block", `"${input}" -> display:block`);
        }
    }

    // ------------------------------------------------------------------
    //  I. showPreviewIfImage: absolute HTTPS URL -> used as-is
    // ------------------------------------------------------------------
    console.log("\nI. showPreviewIfImage: absolute HTTPS URL -> used directly");
    {
        const showFn = sandbox.showPreviewIfImage;
        const url = "https://cdn.supabase.co/storage/v1/object/public/pujas/uuid.jpg";
        const img = { src: "", style: { display: "" }, onerror: null, onload: null };
        showFn(img, url);

        assert(img.src === url,               "HTTPS URL used as-is");
        assert(img.style.display === "block", "Preview visible for HTTPS URL");
    }

    // ------------------------------------------------------------------
    //  J. showPreviewIfImage: onerror hides broken preview
    // ------------------------------------------------------------------
    console.log("\nJ. showPreviewIfImage: onerror handler hides unavailable image");
    {
        const showFn = sandbox.showPreviewIfImage;
        const img = { src: "", style: { display: "" }, onerror: null, onload: null };
        showFn(img, "https://cdn.example.com/missing.jpg");

        assert(typeof img.onerror === "function", "onerror handler attached");

        // Simulate browser firing onerror (image failed to load)
        img.onerror();

        assert(img.src === "",               "onerror clears src");
        assert(img.style.display === "none", "onerror sets display:none");
    }

    // ------------------------------------------------------------------
    //  K. Packages and Temples: entity_type wired correctly
    // ------------------------------------------------------------------
    console.log("\nK. entity_type correct for packages and temples widgets");
    {
        for (const [fileId, entity] of [
            ["filePackageImage", "packages"],
            ["fileTempleImage",  "temples"],
        ]) {
            resetState();
            setFetch({ ok: true, status: 200, body: { url: "https://cdn.example.com/img.jpg" } });

            elements[fileId].files = [{ type: "image/png", size: 200, name: "x.png" }];
            console.log("Listeners:", uploadBtns[fileId]._listeners); await uploadBtns[fileId]._trigger("click");

            const fd = FakeFormData.lastInstance;
            assert(fd !== null,                           `[${entity}] FormData created`);
            assert(fd.getField("entity_type") === entity, `[${entity}] entity_type = "${entity}"`);
            assert(!fd.hasField("entityType"),             `[${entity}] entityType (camelCase) absent`);
        }
    }

    // ------------------------------------------------------------------
    //  Summary
    // ------------------------------------------------------------------
    console.log(
        "\n--- UPLOAD UI LOGIC TESTS " +
        (failed === 0 ? "PASSED" : "FAILED") + " ---"
    );
    console.log("Passed: " + passed + "  Failed: " + failed + "\n");
    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error("Unexpected error in test runner:", err);
    process.exit(1);
});
