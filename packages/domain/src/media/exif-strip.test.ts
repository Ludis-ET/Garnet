import { describe, expect, it } from "vitest";
import { stripImageMetadata, stripJpegExif, stripPngMetadata } from "./exif-strip";

describe("Pure-TS EXIF & Metadata Stripper (P-21)", () => {
  it("strips APP1 (EXIF/GPS) and COM segments from a JPEG stream", () => {
    // Construct a synthetic JPEG:
    // SOI (0xFF, 0xD8)
    // APP1 segment: 0xFF, 0xE1, len=8 (0x00, 0x08), "Exif\0\0" (contains simulated GPS data)
    // DQT segment: 0xFF, 0xDB, len=5 (0x00, 0x05), 1, 2, 3
    // SOS segment: 0xFF, 0xDA, len=4 (0x00, 0x04), 9, 9
    // Scan bytes: 0x12, 0x34
    // EOI: 0xFF, 0xD9
    const jpeg = new Uint8Array([
      0xff,
      0xd8, // SOI
      0xff,
      0xe1,
      0x00,
      0x08,
      0x45,
      0x78,
      0x69,
      0x66,
      0x00,
      0x00, // APP1 with 'Exif\0\0'
      0xff,
      0xdb,
      0x00,
      0x05,
      0x01,
      0x02,
      0x03, // DQT
      0xff,
      0xda,
      0x00,
      0x04,
      0x09,
      0x09, // SOS
      0x12,
      0x34, // scan data
      0xff,
      0xd9, // EOI
    ]);

    const stripped = stripJpegExif(jpeg);

    // Should NOT contain the APP1 marker (0xFF, 0xE1) or 'Exif' ASCII string
    const stringView = String.fromCharCode(...stripped);
    expect(stringView).not.toContain("Exif");
    expect(stripped.length).toBe(jpeg.length - 10); // Exactly 10 bytes stripped

    // Starts with SOI and ends with EOI
    expect(stripped[0]).toBe(0xff);
    expect(stripped[1]).toBe(0xd8);
    expect(stripped[stripped.length - 2]).toBe(0xff);
    expect(stripped[stripped.length - 1]).toBe(0xd9);
  });

  it("leaves a JPEG without APP1 unchanged", () => {
    const cleanJpeg = new Uint8Array([
      0xff,
      0xd8, // SOI
      0xff,
      0xdb,
      0x00,
      0x05,
      0x01,
      0x02,
      0x03, // DQT
      0xff,
      0xda,
      0x00,
      0x04,
      0x09,
      0x09, // SOS
      0x12,
      0x34, // scan
      0xff,
      0xd9, // EOI
    ]);

    const result = stripJpegExif(cleanJpeg);
    expect(result).toBe(cleanJpeg); // Same reference when unmodified
  });

  it("strips eXIf and tEXt chunks from a PNG stream", () => {
    // Construct a synthetic PNG:
    // Signature: 8 bytes
    // IHDR chunk: 4 len (0,0,0,13), 4 type ('IHDR'), 13 data, 4 CRC = 25 bytes
    // eXIf chunk: 4 len (0,0,0,4), 4 type ('eXIf'), 4 data, 4 CRC = 16 bytes
    // IEND chunk: 4 len (0,0,0,0), 4 type ('IEND'), 0 data, 4 CRC = 12 bytes
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const ihdr = [
      0x00,
      0x00,
      0x00,
      0x0d, // len: 13
      0x49,
      0x48,
      0x44,
      0x52, // 'IHDR'
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1,
      8,
      2,
      0,
      0,
      0, // 13 data bytes
      0x90,
      0x77,
      0x53,
      0xde, // CRC
    ];
    const exif = [
      0x00,
      0x00,
      0x00,
      0x04, // len: 4
      0x65,
      0x58,
      0x49,
      0x66, // 'eXIf'
      0xaa,
      0xbb,
      0xcc,
      0xdd, // 4 data bytes
      0x11,
      0x22,
      0x33,
      0x44, // CRC
    ];
    const iend = [
      0x00,
      0x00,
      0x00,
      0x00, // len: 0
      0x49,
      0x45,
      0x4e,
      0x44, // 'IEND'
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ];

    const png = new Uint8Array([...pngSignature, ...ihdr, ...exif, ...iend]);
    const stripped = stripPngMetadata(png);

    const stringView = String.fromCharCode(...stripped);
    expect(stringView).not.toContain("eXIf");
    expect(stripped.length).toBe(png.length - exif.length);

    // Verify IHDR and IEND are still intact
    expect(stringView).toContain("IHDR");
    expect(stringView).toContain("IEND");
  });

  it("routes through stripImageMetadata safely", () => {
    const raw = new Uint8Array([0x01, 0x02, 0x03]);
    // Non-image types pass through untouched
    expect(stripImageMetadata(raw, "audio/mp4")).toBe(raw);
    expect(stripImageMetadata(raw, "video/mp4")).toBe(raw);
  });
});
