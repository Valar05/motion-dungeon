import assert from "node:assert/strict";
import test from "node:test";

test("renders the browser-only Sherman model lab shell", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const {default: worker} = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/sherman", {headers: {accept: "text/html"}}),
    {ASSETS: {fetch: async () => new Response("Not found", {status: 404})}},
    {waitUntil() {}, passThroughOnException() {}},
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Sherman Model Lab/i);
  assert.match(html, /Loading the browser renderer/i);
});

test("renders the Ferravine vivisection motion lab", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `ferravine-${process.pid}-${Date.now()}`);
  const {default: worker} = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/ferravine", {headers: {accept: "text/html"}}),
    {ASSETS: {fetch: async () => new Response("Not found", {status: 404})}},
    {waitUntil() {}, passThroughOnException() {}},
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Ferravine/i);
  assert.match(html, /Vivisection/i);
  assert.match(html, /Peel spread/i);
});

test("renders the source-locked Lexen cage carrier", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("lexen-test", `${process.pid}-${Date.now()}`);
  const {default: worker} = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/scenes/lexen-cage-with-glass-walls", {headers: {accept: "text/html"}}),
    {ASSETS: {fetch: async () => new Response("Not found", {status: 404})}},
    {waitUntil() {}, passThroughOnException() {}},
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /THE CAGE WITH GLASS WALLS/i);
  assert.match(html, /SOURCE-LOCKED SCENE DOCUMENT/i);
  assert.match(html, /STOP SCENE/i);
  assert.match(html, /unknown fields preserved/i);
});
