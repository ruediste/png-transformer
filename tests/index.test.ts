import { readFile } from "fs/promises";
import { expect, test } from "vitest";
import {
  parseBlobEntry,
  parseHeader,
  parseTextChunk,
  toBlobChunk,
  transformPng,
} from "../src";

test("read data", async () => {
  // read test.png from file system
  const data = await readFile("./tests/test.png");
  const texts: { [key: string]: string } = {};
  await transformPng(new Blob([data]), async (args) => {
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
  const pngWithBlob = await transformPng(data, async (args) => {
    args.passThrough();
    if (args.chunk.type === "IHDR") {
      args.addChunk(toBlobChunk("sampleBlob", sampleBlobData));
    }
  });

  let foundBlobData: ArrayBuffer | undefined = undefined;
  await transformPng(pngWithBlob, async (args) => {
    const blobEntry = parseBlobEntry(args.chunk);
    if (blobEntry?.key === "sampleBlob") {
      foundBlobData = blobEntry.data;
    }
  });
  expect(foundBlobData).toBeDefined();
  expect(new Uint8Array(foundBlobData!)).toEqual(
    new Uint8Array(sampleBlobData),
  );
});
