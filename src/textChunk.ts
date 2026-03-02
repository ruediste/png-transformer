import { base64ToBuffer, bufferToBase64 } from "./base64";
import { compress } from "./compress";
import { decompress } from "./decompress";
import type { Chunk } from "./types";

export async function parseTextChunk(
  chunk: Chunk,
): Promise<
  | ({ key: string; text: string } & (
      | {}
      | { languageTag: string; translatedKeyword: string }
    ))
  | undefined
> {
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
      // language tag
      nullPos = uint8Array.indexOf(0, pos);
      if (nullPos === -1) {
        nullPos = uint8Array.length;
      }
      const languageTag = decoder.decode(uint8Array.slice(pos, nullPos));
      pos = nullPos + 1;
      // translated keyword
      nullPos = uint8Array.indexOf(0, pos);
      if (nullPos === -1) {
        nullPos = uint8Array.length;
      }
      const translatedKeyword = decoder.decode(uint8Array.slice(pos, nullPos));
      pos = nullPos + 1;
      const textData = uint8Array.slice(pos);
      let finalData: Uint8Array;
      if (compressionFlag === 1) {
        // compressed
        finalData = new Uint8Array(await decompress(textData));
      } else {
        finalData = textData;
      }
      const result: any = { key, text: decoder.decode(finalData) };
      if (languageTag.length > 0) result.languageTag = languageTag;
      if (translatedKeyword.length > 0)
        result.translatedKeyword = translatedKeyword;
      return result;
    }
    default: {
      return undefined;
    }
  }
}

// Creates a zTXt chunk with the give key and data encoded as base64 in the text field.
export async function toTextChunkBase64(
  key: string,
  data: ArrayBufferLike,
): Promise<Chunk> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const textData = encoder.encode(bufferToBase64(data));
  const compressedTextData = await compress(textData);
  const combinedData = new Uint8Array(
    keyData.byteLength + 1 + 1 + compressedTextData.byteLength,
  );
  combinedData.set(keyData, 0);
  combinedData[keyData.byteLength] = 0; // null separator
  combinedData[keyData.byteLength + 1] = 0; // compression method
  combinedData.set(new Uint8Array(compressedTextData), keyData.byteLength + 2);
  return {
    type: "zTXt",
    data: combinedData.buffer,
  };
}

export async function parseTextChunkBase64(
  chunk: Chunk,
  key: string,
): Promise<{ key: string; data: ArrayBuffer } | undefined> {
  const textEntry = await parseTextChunk(chunk);
  if (textEntry?.key === key) {
    const buffer = base64ToBuffer(textEntry.text);
    return { key, data: new Uint8Array(buffer).buffer };
  }
  return undefined;
}

export async function toTextChunkITXt(
  key: string,
  text: string,
  languageTag?: string,
  translatedKeyword?: string,
  compressText: boolean = false,
): Promise<Chunk> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const languageTagData = encoder.encode(languageTag || "");
  const translatedKeywordData = encoder.encode(translatedKeyword || "");
  const textData = encoder.encode(text);
  let finalTextData: Uint8Array;
  if (compressText) {
    finalTextData = new Uint8Array(await compress(textData));
  } else {
    finalTextData = textData;
  }
  const combinedData = new Uint8Array(
    keyData.byteLength +
      1 +
      1 +
      languageTagData.byteLength +
      1 +
      translatedKeywordData.byteLength +
      1 +
      finalTextData.byteLength,
  );
  let offset = 0;
  combinedData.set(keyData, offset);
  offset += keyData.byteLength;
  combinedData[offset] = 0; // null separator
  offset += 1;
  combinedData[offset] = compressText ? 1 : 0; // compression flag
  offset += 1;
  combinedData.set(languageTagData, offset);
  offset += languageTagData.byteLength;
  combinedData[offset] = 0; // null separator
  offset += 1;
  combinedData.set(translatedKeywordData, offset);
  offset += translatedKeywordData.byteLength;
  combinedData[offset] = 0; // null separator
  offset += 1;
  combinedData.set(finalTextData, offset);
  return {
    type: "iTXt",
    data: combinedData.buffer,
  };
}
