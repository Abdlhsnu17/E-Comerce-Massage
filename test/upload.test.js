const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const test = require("node:test");
const express = require("express");

const { MAX_IMAGE_SIZE, receiveImage } = require("../server/middleware/upload");

async function withUploadServer(run) {
  const app = express();
  app.post("/upload", receiveImage, (req, res) => {
    res.status(201).json({ filename: req.file.filename, path: req.file.path });
  });
  app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));

  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("upload menerima JPEG valid dengan nama buatan server", async () => {
  await withUploadServer(async baseUrl => {
    const body = new FormData();
    body.append("image", new Blob([Buffer.from("ffd8ffe000104a464946", "hex")], { type: "image/jpeg" }), "../../evil.php");

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body });
    const payload = await response.json();

    assert.equal(response.status, 201);
    assert.match(payload.filename, /^\d{13}-[a-f0-9]{32}\.jpg$/);
    assert.doesNotMatch(payload.filename, /evil|php|\.\./);
    await fs.unlink(payload.path);
  });
});

test("upload menolak MIME gambar dengan signature palsu", async () => {
  await withUploadServer(async baseUrl => {
    const body = new FormData();
    body.append("image", new Blob(["not really an image"], { type: "image/png" }), "fake.png");

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body });
    assert.equal(response.status, 415);
  });
});

test("upload menolak file yang lebih besar dari 5 MB", async () => {
  await withUploadServer(async baseUrl => {
    const body = new FormData();
    body.append("image", new Blob([Buffer.alloc(MAX_IMAGE_SIZE + 1)], { type: "image/jpeg" }), "large.jpg");

    const response = await fetch(`${baseUrl}/upload`, { method: "POST", body });
    assert.equal(response.status, 413);
  });
});
