import { readFile } from "fs/promises";
import { expect, test } from "vitest";
import {
  parseBlobChunk,
  parseHeader,
  parseTextChunk,
  parseTextChunkBase64,
  toBlobChunk,
  toTextChunkBase64,
  transformPng,
} from "../src";

test("read data", async () => {
  // read test.png from file system
  const data = await readFile("./tests/test.png");
  const texts: { [key: string]: string } = {};
  await transformPng(data.buffer, async (args) => {
    console.log(args.chunk.type, args.chunk.data.byteLength);

    const header = await parseHeader(args.chunk);
    if (header !== undefined) {
      console.log("Header:", header);
    }
    const text = await parseTextChunk(args.chunk);
    if (text !== undefined) {
      texts[text.key] = text.text;
    }
    args.passThrough();
  });
  expect(texts["Comment"]).toEqual("Created with GIMP");
  expect(texts).toHaveProperty("Raw profile type exif");
});

test("blobEntry roundtrip", async () => {
  const sampleBlobData = new TextEncoder().encode(
    "This is some sample blob data.",
  ).buffer;
  const data = await readFile("./tests/test.png");
  const pngWithBlob = await transformPng(data.buffer, async (args) => {
    args.passThrough();
    if (args.chunk.type === "IHDR") {
      args.addChunk(toBlobChunk("sampleBlob", sampleBlobData));
    }
  });

  let foundBlobData: ArrayBufferLike | undefined = undefined;
  await transformPng(pngWithBlob, async (args) => {
    const blobEntry = parseBlobChunk(args.chunk);
    if (blobEntry?.key === "sampleBlob") {
      foundBlobData = blobEntry.data;
    }
  });
  expect(foundBlobData).toBeDefined();
  expect(new Uint8Array(foundBlobData!)).toEqual(
    new Uint8Array(sampleBlobData),
  );
});

test("base64 text chunk roundtrip", async () => {
  const sampleData = new TextEncoder().encode(
    "This is some sample data for base64 encoding.",
  ).buffer;
  const data = await readFile("./tests/test.png");
  const pngWithTextChunk = await transformPng(data.buffer, async (args) => {
    args.passThrough();
    if (args.chunk.type === "IHDR") {
      const textChunk = await toTextChunkBase64("sampleKey", sampleData);
      args.addChunk(textChunk);
    }
  });

  let foundData: ArrayBuffer | undefined = undefined;
  await transformPng(pngWithTextChunk, async (args) => {
    const textEntry = await parseTextChunkBase64(args.chunk, "sampleKey");
    if (textEntry?.key === "sampleKey") {
      foundData = textEntry.data;
    }
  });
  expect(foundData).toBeDefined();
  expect(new Uint8Array(foundData!).length).toEqual(
    new Uint8Array(sampleData).length,
  );
  expect(new Uint8Array(foundData!)).toEqual(new Uint8Array(sampleData));
});
