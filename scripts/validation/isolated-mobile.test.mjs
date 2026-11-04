import test from "node:test";
import assert from "node:assert/strict";
import { allowedBrowserUrl, TEST_PHOTO_PNG } from "./isolated-mobile.mjs";

test("browser network refuses source, other hosts and financial routes", () => {
  for (const url of [
    "https://jzbjpaucgckggumhowns.supabase.co/rest/v1/properties",
    "https://api.stripe.com/v1",
    "http://127.0.0.1:8787/pay/example",
    "http://127.0.0.1:8787/_serverFn/billing-canary",
    "https://mhhtnqfdkyudwyqlmnce.supabase.co/functions/v1/test",
  ])
    assert.equal(allowedBrowserUrl(url, "billing-canary"), false);
  assert.equal(allowedBrowserUrl("http://127.0.0.1:8787/app", "billing-canary"), true);
  assert.equal(
    allowedBrowserUrl(
      "https://mhhtnqfdkyudwyqlmnce.supabase.co/storage/v1/object/sign/test",
      "billing-canary",
    ),
    true,
  );
});

// PNG decoders differ in how strictly they reject corrupt chunks. Test real bytes.
import { inflateSync } from "node:zlib";
test("synthetic upload has valid PNG checksums and complete RGB pixels", () => {
  const png = TEST_PHOTO_PNG;
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  let offset = 8;
  const data = [];
  const types = [];
  while (offset < png.length) {
    const size = png.readUInt32BE(offset);
    const chunk = png.subarray(offset + 4, offset + 8 + size);
    const type = chunk.subarray(0, 4).toString();
    types.push(type);
    assert.equal(crc32(chunk), png.readUInt32BE(offset + 8 + size), type + " checksum");
    if (type === "IHDR") {
      assert.equal(chunk.readUInt32BE(4), 32);
      assert.equal(chunk.readUInt32BE(8), 32);
      assert.equal(chunk[12], 8);
      assert.equal(chunk[13], 2);
    }
    if (type === "IDAT") data.push(chunk.subarray(4));
    offset += size + 12;
  }
  assert.equal(offset, png.length);
  assert.equal(types[0], "IHDR");
  assert.equal(types.at(-1), "IEND");
  assert.equal(inflateSync(Buffer.concat(data)).length, 32 * (1 + 32 * 3));
});
