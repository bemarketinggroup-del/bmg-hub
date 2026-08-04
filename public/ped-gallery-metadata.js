(function registerPedGalleryMetadata(globalScope) {
  "use strict";

  const JPEG_SOI = 0xd8;
  const JPEG_APP1 = 0xe1;
  const JPEG_SOS = 0xda;
  const JPEG_EOI = 0xd9;
  const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];

  function isJpeg(bytes) {
    return bytes.length > 4 && bytes[0] === 0xff && bytes[1] === JPEG_SOI;
  }

  function isStandaloneJpegMarker(marker) {
    return marker === 0x01 || (marker >= 0xd0 && marker <= JPEG_EOI);
  }

  function jpegSegments(bytes) {
    const segments = [];
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        segments.push({ start: offset, end: bytes.length, marker: -1, payloadStart: offset });
        break;
      }
      const start = offset;
      let markerOffset = offset + 1;
      while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) markerOffset += 1;
      if (markerOffset >= bytes.length) break;
      const marker = bytes[markerOffset];
      if (marker === JPEG_SOS || marker === JPEG_EOI) {
        segments.push({ start, end: bytes.length, marker, payloadStart: markerOffset + 1 });
        break;
      }
      if (isStandaloneJpegMarker(marker)) {
        const end = markerOffset + 1;
        segments.push({ start, end, marker, payloadStart: end });
        offset = end;
        continue;
      }
      const lengthOffset = markerOffset + 1;
      if (lengthOffset + 1 >= bytes.length) break;
      const length = (bytes[lengthOffset] << 8) | bytes[lengthOffset + 1];
      const end = lengthOffset + length;
      if (length < 2 || end > bytes.length) break;
      segments.push({ start, end, marker, payloadStart: lengthOffset + 2 });
      offset = end;
    }
    return segments;
  }

  function hasExifSignature(bytes, payloadStart) {
    return EXIF_SIGNATURE.every((value, index) => bytes[payloadStart + index] === value);
  }

  function jpegOrientation(bytes) {
    if (!isJpeg(bytes)) return 1;
    for (const segment of jpegSegments(bytes)) {
      if (segment.marker !== JPEG_APP1 || !hasExifSignature(bytes, segment.payloadStart)) continue;
      const tiffStart = segment.payloadStart + EXIF_SIGNATURE.length;
      if (tiffStart + 8 > segment.end) continue;
      const littleEndian = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
      const bigEndian = bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d;
      if (!littleEndian && !bigEndian) continue;
      const view = new DataView(bytes.buffer, bytes.byteOffset + tiffStart, segment.end - tiffStart);
      const ifdOffset = view.getUint32(4, littleEndian);
      if (ifdOffset + 2 > view.byteLength) continue;
      const entryCount = view.getUint16(ifdOffset, littleEndian);
      for (let index = 0; index < entryCount; index += 1) {
        const entryOffset = ifdOffset + 2 + (index * 12);
        if (entryOffset + 12 > view.byteLength) break;
        if (view.getUint16(entryOffset, littleEndian) !== 0x0112) continue;
        const value = view.getUint16(entryOffset + 8, littleEndian);
        return value >= 1 && value <= 8 ? value : 1;
      }
    }
    return 1;
  }

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function formatExifDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return `${date.getFullYear()}:${padDatePart(date.getMonth() + 1)}:${padDatePart(date.getDate())} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
  }

  function asciiMetadataText(value, fallback = "BMG Hub") {
    const normalized = String(value || fallback)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7e]/g, "-")
      .trim();
    return (normalized || fallback).slice(0, 220);
  }

  function alignEven(value) {
    return value % 2 === 0 ? value : value + 1;
  }

  function writeAscii(view, offset, value) {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    view.setUint8(offset + value.length, 0);
  }

  function writeIfdEntry(view, offset, tag, type, count, value, { short = false } = {}) {
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, type, true);
    view.setUint32(offset + 4, count, true);
    if (short) view.setUint16(offset + 8, value, true);
    else view.setUint32(offset + 8, value, true);
  }

  function orderedExifSegment({ filename, takenAt, orientation }) {
    const description = `${asciiMetadataText(filename)}\u0000`;
    const dateText = `${formatExifDate(takenAt)}\u0000`;
    const ifd0Offset = 8;
    const ifd0EntryCount = 5;
    const ifd0End = ifd0Offset + 2 + (ifd0EntryCount * 12) + 4;
    const descriptionOffset = ifd0End;
    const dateOffset = alignEven(descriptionOffset + description.length);
    const exifIfdOffset = alignEven(dateOffset + dateText.length);
    const exifEntryCount = 2;
    const exifIfdEnd = exifIfdOffset + 2 + (exifEntryCount * 12) + 4;
    const originalDateOffset = exifIfdEnd;
    const digitizedDateOffset = originalDateOffset + dateText.length;
    const tiffLength = digitizedDateOffset + dateText.length;
    const payloadLength = EXIF_SIGNATURE.length + tiffLength;
    const segment = new Uint8Array(4 + payloadLength);
    segment[0] = 0xff;
    segment[1] = JPEG_APP1;
    const jpegLength = payloadLength + 2;
    segment[2] = (jpegLength >> 8) & 0xff;
    segment[3] = jpegLength & 0xff;
    EXIF_SIGNATURE.forEach((value, index) => { segment[4 + index] = value; });

    const view = new DataView(segment.buffer, 4 + EXIF_SIGNATURE.length, tiffLength);
    view.setUint8(0, 0x49);
    view.setUint8(1, 0x49);
    view.setUint16(2, 0x002a, true);
    view.setUint32(4, ifd0Offset, true);
    view.setUint16(ifd0Offset, ifd0EntryCount, true);
    let entryOffset = ifd0Offset + 2;
    writeIfdEntry(view, entryOffset, 0x010d, 2, description.length, descriptionOffset);
    entryOffset += 12;
    writeIfdEntry(view, entryOffset, 0x010e, 2, description.length, descriptionOffset);
    entryOffset += 12;
    writeIfdEntry(view, entryOffset, 0x0112, 3, 1, orientation, { short: true });
    entryOffset += 12;
    writeIfdEntry(view, entryOffset, 0x0132, 2, dateText.length, dateOffset);
    entryOffset += 12;
    writeIfdEntry(view, entryOffset, 0x8769, 4, 1, exifIfdOffset);
    view.setUint32(ifd0Offset + 2 + (ifd0EntryCount * 12), 0, true);
    writeAscii(view, descriptionOffset, description.slice(0, -1));
    writeAscii(view, dateOffset, dateText.slice(0, -1));

    view.setUint16(exifIfdOffset, exifEntryCount, true);
    entryOffset = exifIfdOffset + 2;
    writeIfdEntry(view, entryOffset, 0x9003, 2, dateText.length, originalDateOffset);
    entryOffset += 12;
    writeIfdEntry(view, entryOffset, 0x9004, 2, dateText.length, digitizedDateOffset);
    view.setUint32(exifIfdOffset + 2 + (exifEntryCount * 12), 0, true);
    writeAscii(view, originalDateOffset, dateText.slice(0, -1));
    writeAscii(view, digitizedDateOffset, dateText.slice(0, -1));
    return segment;
  }

  function replaceJpegExif(bytes, exifSegment) {
    const parts = [bytes.subarray(0, 2), exifSegment];
    let coveredUntil = 2;
    for (const segment of jpegSegments(bytes)) {
      if (segment.start > coveredUntil) parts.push(bytes.subarray(coveredUntil, segment.start));
      const isExif = segment.marker === JPEG_APP1 && hasExifSignature(bytes, segment.payloadStart);
      if (!isExif) parts.push(bytes.subarray(segment.start, segment.end));
      coveredUntil = segment.end;
      if (segment.marker === JPEG_SOS || segment.marker === JPEG_EOI || segment.marker === -1) break;
    }
    if (coveredUntil < bytes.length) parts.push(bytes.subarray(coveredUntil));
    return new Blob(parts, { type: "image/jpeg" });
  }

  async function orderGalleryMediaBlob(blob, { filename, takenAt }) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!isJpeg(bytes)) return { blob, metadataApplied: false };
    const orientation = jpegOrientation(bytes);
    const exifSegment = orderedExifSegment({ filename, takenAt, orientation });
    return {
      blob: replaceJpegExif(bytes, exifSegment),
      metadataApplied: true
    };
  }

  globalScope.BmgPedGalleryMetadata = Object.freeze({
    formatExifDate,
    jpegOrientation,
    orderGalleryMediaBlob
  });
})(typeof window === "undefined" ? globalThis : window);
