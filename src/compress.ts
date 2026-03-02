export async function compress(
  data: ArrayBuffer | Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const readableStream = new Blob([data]).stream();

  const compressionStream = new CompressionStream("deflate");
  const reader = readableStream
    .pipeThrough<Uint8Array>(compressionStream)
    .getReader();

  const output: Uint8Array[] = [];
  while (true) {
    const result = await reader.read();
    if (result.value) output.push(result.value);
    if (result.done) break;
  }

  const totalLength = output.reduce((sum, value) => sum + value.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of output) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}
