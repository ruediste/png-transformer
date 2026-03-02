export function bufferToBase64(buffer: ArrayBufferLike | Uint8Array): string {
  const uint8Array =
    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof (uint8Array as any).toBase64 === "function") {
    return (uint8Array as any).toBase64();
  } else {
    return Buffer.from(uint8Array).toString("base64");
  }
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  if (typeof (Uint8Array as any).fromBase64 === "function") {
    return (Uint8Array as any).fromBase64(base64).buffer;
  } else {
    return new Uint8Array(Buffer.from(base64, "base64")).buffer;
  }
}
