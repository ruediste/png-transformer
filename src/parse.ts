import type { Chunk } from "./types";

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
