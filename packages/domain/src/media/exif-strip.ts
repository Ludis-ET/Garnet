/**
 * Pure-TypeScript EXIF and Metadata Stripping (P-21).
 *
 * Product guardrail (§5, P-21):
 * Photos must never leak geolocation (GPS latitude/longitude) or camera serial/device
 * identifiers over transport or to the partner.
 *
 * Implemented in pure TypeScript with zero native C++ binaries, satisfying
 * supply-chain hygiene (onlyBuiltDependencies: []) and cross-platform stability.
 */

const JPEG_SOI = 0xffd8;
const JPEG_APP1 = 0xffe1; // EXIF and XMP metadata
const JPEG_APP2 = 0xffe2; // ICC / FlashPix / Extended EXIF
const JPEG_COM = 0xfffe; // JPEG comment
const JPEG_SOS = 0xffda; // Start of Scan (entropy-coded data follows)

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Strips APP1 (EXIF / XMP), APP2, and COM comment segments from a JPEG byte stream.
 * Preserves image raster, quantization tables, Huffman tables, and SOS entropy data.
 */
export function stripJpegExif(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (view.getUint16(0) !== JPEG_SOI) {
    return bytes; // Not a valid JPEG
  }

  const chunks: Uint8Array[] = [bytes.subarray(0, 2)]; // Keep SOI (0xFF, 0xD8)
  let offset = 2;
  let modified = false;

  while (offset + 1 < bytes.length) {
    // Look for next marker 0xFF, 0xXX
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = view.getUint16(offset);

    // Stand-alone markers without length: RST0..RST7, SOI
    if ((marker >= 0xffd0 && marker <= 0xffd7) || marker === 0xffd8) {
      chunks.push(bytes.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    // End of Image
    if (marker === 0xffd9) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    // Start of Scan: the rest of the stream is entropy-coded image scan data
    if (marker === JPEG_SOS) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    // Segment with 2-byte length
    if (offset + 3 >= bytes.length) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    const segmentLength = view.getUint16(offset + 2);
    const totalSegmentLength = 2 + segmentLength; // 2 marker bytes + length

    if (offset + totalSegmentLength > bytes.length) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    // Strip APP1 (EXIF), APP2, and COM segments
    if (marker === JPEG_APP1 || marker === JPEG_APP2 || marker === JPEG_COM) {
      modified = true;
      offset += totalSegmentLength;
    } else {
      chunks.push(bytes.subarray(offset, offset + totalSegmentLength));
      offset += totalSegmentLength;
    }
  }

  if (!modified) {
    return bytes;
  }

  // Concatenate kept chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

/**
 * Strips metadata chunks (eXIf, tEXt, zTXt, iTXt) from a PNG byte stream.
 */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 8) return bytes;

  // Check PNG signature
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return bytes;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Uint8Array[] = [bytes.subarray(0, 8)]; // Keep PNG signature
  let offset = 8;
  let modified = false;

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const chunkType = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0,
    );
    const totalChunkLength = 4 + 4 + length + 4; // length + type + data + CRC

    if (offset + totalChunkLength > bytes.length) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    // Strip EXIF and textual metadata chunks
    if (
      chunkType === "eXIf" ||
      chunkType === "tEXt" ||
      chunkType === "zTXt" ||
      chunkType === "iTXt"
    ) {
      modified = true;
      offset += totalChunkLength;
    } else {
      chunks.push(bytes.subarray(offset, offset + totalChunkLength));
      offset += totalChunkLength;
      if (chunkType === "IEND") break;
    }
  }

  if (!modified) {
    return bytes;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

/**
 * Strips location and device metadata according to content type (P-21).
 */
export function stripImageMetadata(bytes: Uint8Array, contentType: string): Uint8Array {
  if (contentType === "image/jpeg" || contentType === "image/jpg") {
    return stripJpegExif(bytes);
  }
  if (contentType === "image/png") {
    return stripPngMetadata(bytes);
  }
  return bytes;
}
