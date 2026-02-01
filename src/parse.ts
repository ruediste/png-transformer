import { decompress } from "./decompress";
import type { Chunk } from "./types";

export async function parseTextChunk(
  chunk: Chunk,
): Promise<{ key: string; text: string } | undefined> {
  switch (chunk.type) {
    case "tEXt": {
      // null-terminated Latin-1 key + Latin-1 text
      const uint8Array = new Uint8Array(chunk.data);
      let nullPos = uint8Array.indexOf(0);
      if (nullPos === -1) {
        nullPos = uint8Array.length;
      }
      const decoder = new TextDecoder("latin1");
      const key = decoder.decode(uint8Array.slice(0, nullPos));
      const textData = uint8Array.slice(nullPos + 1);
      return { key, text: decoder.decode(textData) };
    }
    case "zTXt": {
      // null-terminated Latin-1 key + compressed Latin-1 text
      const uint8Array = new Uint8Array(chunk.data);
      let nullPos = uint8Array.indexOf(0);
      if (nullPos === -1) {
        nullPos = uint8Array.length;
      }
      const decoder = new TextDecoder("latin1");
      const key = decoder.decode(uint8Array.slice(0, nullPos));
      const compressedData = uint8Array.slice(nullPos + 2); // skip compression method byte
      const decompressedData = await decompress(compressedData);
      return { key, text: decoder.decode(decompressedData) };
    }
    case "iTXt": {
      // null-terminated UTF-8 key + compression flag + compression method + null-terminated UTF-8 language tag + null-terminated UTF-8 translated keyword + UTF-8 text (compressed or not)
      const uint8Array = new Uint8Array(chunk.data);
      let pos = 0;
      let nullPos = uint8Array.indexOf(0, pos);
      if (nullPos === -1) {
        nullPos = uint8Array.length;
      }
      const decoder = new TextDecoder("utf-8");
      const key = decoder.decode(uint8Array.slice(pos, nullPos));
      pos = nullPos + 1;
      const compressionFlag = uint8Array[pos];
      pos += 1;
      const compressionMethod = uint8Array[pos];
      pos += 1;
      nullPos = uint8Array.indexOf(0, pos);
      if (nullPos === -1) {
        nullPos = uint8Array.length;
      }
      pos = nullPos + 1;
      nullPos = uint8Array.indexOf(0, pos);
      if (nullPos === -1) {
        nullPos = uint8Array.length;
      }
      pos = nullPos + 1;
      const textData = uint8Array.slice(pos);
      let finalData: Uint8Array;
      if (compressionFlag === 1) {
        // compressed
        finalData = new Uint8Array(await decompress(textData));
      } else {
        finalData = textData;
      }
      return { key, text: decoder.decode(finalData) };
    }
    default: {
      return undefined;
    }
  }
}

export type ColorType =
  | number
  | "greyscale"
  | "truecolor"
  | "indexedColor"
  | "grayscaleAlpha"
  | "truecolorAlpha";

export interface Header {
  width: number;
  height: number;
  bitDepth: number;
  colorType: ColorType;
  compressionMethod: number;
  filterMethod: number;
  interlaceMethod: number;
}

export function toColorType(value: number): ColorType {
  switch (value) {
    case 0:
      return "greyscale";
    case 2:
      return "truecolor";
    case 3:
      return "indexedColor";
    case 4:
      return "grayscaleAlpha";
    case 6:
      return "truecolorAlpha";
    default:
      return value;
  }
}

export function fromColorType(value: ColorType): number {
  switch (value) {
    case "greyscale":
      return 0;
    case "truecolor":
      return 2;
    case "indexedColor":
      return 3;
    case "grayscaleAlpha":
      return 4;
    case "truecolorAlpha":
      return 6;
    default:
      return value;
  }
}

export function parseHeader(chunk: Chunk): Header | undefined {
  if (chunk.type !== "IHDR") {
    return undefined;
  }
  const dataView = new DataView(chunk.data);

  return {
    width: dataView.getUint32(0),
    height: dataView.getUint32(4),
    bitDepth: dataView.getUint8(8),
    colorType: toColorType(dataView.getUint8(9)),
    compressionMethod: dataView.getUint8(10),
    filterMethod: dataView.getUint8(11),
    interlaceMethod: dataView.getUint8(12),
  };
}
