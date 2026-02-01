# PNG Transformer

Library to transform PNG images data. It processes all chunks in a PNG file and allows for modification of chunk data. It does not yet support any modification of the image data itself.

## Features

- Read and write PNG chunks
- Add custom chunks (e.g., text or binary data)
- Parse the header
- Parse text chunks
- Create and read custom blob chunks

Basic usage:

```ts
// add custom data chunk
const outputPngBlob = await transformPng(inputPngBlob, async (args) => {
  args.passThrough(); // keep existing chunks

  if (args.chunk.type === "IHDR") {
    args.addChunk(toBlobChunk("myCustomChunk", myArrayBufferData));
  }
});

// read custom data chunk
await transformPng(outputPngBlob, async (args) => {
  const blobEntry = parseBlobEntry(args.chunk);
  if (blobEntry?.key === "myCustomChunk") {
    const myData = blobEntry.data;
    // do something with myData
  }
});
```
