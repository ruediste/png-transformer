import type { BlobPart } from "buffer";
import { crc32 } from "./crc32";
import type { Chunk } from "./types";

export interface OnChunkArgs {
  chunk: Chunk;
  passThrough: () => void;
  addChunk: (chunk: Chunk) => void;
  addRaw: (data: ArrayBuffer) => void;
}

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export async function transformPng(
  inputData: Blob | ArrayBufferLike,
  onChunk: (args: OnChunkArgs) => Promise<void> | undefined,
) {
  const input = new DataView(
    inputData instanceof Blob ? await inputData.arrayBuffer() : inputData,
  );
  const writer = new PngWriter();

  let pos = 0;
  // check PNG signature
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (input.getUint8(pos) !== PNG_SIGNATURE[i]) {
      throw new Error("Not a valid PNG file");
    }
    pos += 1;
  }

  // process chunks
  while (pos < input.byteLength) {
    const chunkStart = pos;
    const length = input.getUint32(pos);
    const type = String.fromCharCode(
      input.getUint8(pos + 4),
      input.getUint8(pos + 5),
      input.getUint8(pos + 6),
      input.getUint8(pos + 7),
    );
    pos += 8;
    const dataStart = pos;
    pos += length;
    const dataEnd = pos;
    const crcStart = dataEnd;
    pos += 4;
    const crcEnd = pos;
    const data = input.buffer.slice(dataStart, dataEnd);
    const crc = input.getUint32(crcStart);
    // validate CRC
    if (crc !== crc32(type, data)) {
      throw new Error(`Invalid CRC for chunk ${type}`);
    }

    var result = onChunk({
      chunk: {
        type,
        data,
      },
      passThrough: () => writer.addRaw(input.buffer.slice(chunkStart, crcEnd)),
      addChunk: (newChunk) => writer.addChunk(newChunk),
      addRaw: (newData) => {
        writer.addRaw(newData);
      },
    });
    if (result instanceof Promise) {
      await result;
    }
  }
  return writer.toBlob();
}

export class PngWriter {
  private chunks: BlobPart[] = [];

  constructor() {
    this.chunks.push(PNG_SIGNATURE.buffer);
  }

  addRaw(data: ArrayBuffer) {
    this.chunks.push(data);
  }
  addChunk(chunk: Chunk) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, chunk.data.byteLength);
    for (let i = 0; i < 4; i += 1) {
      view.setUint8(4 + i, chunk.type.charCodeAt(i));
    }
    this.chunks.push(buffer);
    this.chunks.push(chunk.data);
    const crc = crc32(chunk.type, chunk.data);
    const crcBuffer = new ArrayBuffer(4);
    const crcView = new DataView(crcBuffer);
    crcView.setUint32(0, crc);
    this.chunks.push(crcBuffer);
  }

  toBlob() {
    return new Blob(this.chunks, { type: "image/png" });
  }
}
