import type { Chunk } from "./types";

export type BlobEntry = {
  key: string;
  data: ArrayBuffer;
};

export function toBlobChunk(key: string, data: ArrayBuffer): Chunk {
  // null -terminated UTF-8 key + binary data
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const combinedData = new Uint8Array(keyData.byteLength + 1 + data.byteLength);
  combinedData.set(keyData, 0);
  combinedData[keyData.byteLength] = 0; // null separator
  combinedData.set(new Uint8Array(data), keyData.byteLength + 1);
  return {
    type: "blob",
    data: combinedData.buffer,
  };
}

export function parseBlobEntry(chunk: Chunk): BlobEntry | undefined {
  if (chunk.type !== "blob") {
    return undefined;
  }
  const uint8Array = new Uint8Array(chunk.data);
  let nullPos = uint8Array.indexOf(0);
  if (nullPos === -1) {
    nullPos = uint8Array.length;
  }
  const decoder = new TextDecoder("utf-8");
  const key = decoder.decode(uint8Array.slice(0, nullPos));
  const data = chunk.data.slice(nullPos + 1);
  return { key, data };
}
