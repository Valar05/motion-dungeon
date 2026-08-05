import assert from "node:assert/strict";
import test from "node:test";

test("renders the Sherman model lab route", async () => {
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
  assert.match(html, /Procedural control/i);
  assert.match(html, /Drop \/ choose GLB/i);
  assert.match(html, /Meshy 6/i);
  assert.match(html, /4 GB GPU below spec/i);
});
