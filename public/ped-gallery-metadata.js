(function registerPedGalleryMetadata(globalScope) {
  "use strict";

  const JPEG_SOI = 0xd8;
  const JPEG_APP1 = 0xe1;
  const JPEG_SOS = 0xda;
  const JPEG_EOI = 0xd9;
  const EXIF_SIGNATURE = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  const QUICKTIME_EPOCH_OFFSET = 2082844800;
  const QUICKTIME_CONTAINERS = new Set(["moov", "trak", "mdia", "udta", "meta"]);
  const QUICKTIME_DATE_HEADERS = new Set(["mvhd", "tkhd", "mdhd"]);

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

  function fourCharacterCode(bytes, offset) {
    return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
  }

  function isIsoBaseMedia(bytes) {
    return bytes.length >= 12 && fourCharacterCode(bytes, 4) === "ftyp";
  }

  function isoBoxSize(view, offset, limit) {
    const compactSize = view.getUint32(offset, false);
    if (compactSize === 0) return { size: limit - offset, headerSize: 8 };
    if (compactSize !== 1) return { size: compactSize, headerSize: 8 };
    if (offset + 16 > limit) return null;
    const extendedSize = view.getBigUint64(offset + 8, false);
    if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return { size: Number(extendedSize), headerSize: 16 };
  }

  function walkIsoBoxes(bytes, start, end, visit) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = start;
    while (offset + 8 <= end) {
      const sizeInfo = isoBoxSize(view, offset, end);
      if (!sizeInfo || sizeInfo.size < sizeInfo.headerSize || offset + sizeInfo.size > end) return;
      const type = fourCharacterCode(bytes, offset + 4);
      const box = {
        start: offset,
        end: offset + sizeInfo.size,
        payloadStart: offset + sizeInfo.headerSize,
        type
      };
      visit(box, view);
      if (QUICKTIME_CONTAINERS.has(type)) {
        const fullBoxBytes = type === "meta" ? 4 : 0;
        const childStart = box.payloadStart + fullBoxBytes;
        if (childStart < box.end) walkIsoBoxes(bytes, childStart, box.end, visit);
      }
      offset = box.end;
    }
  }

  function quickTimeSeconds(value) {
    return Math.floor(value.getTime() / 1000) + QUICKTIME_EPOCH_OFFSET;
  }

  function patchQuickTimeDateHeader(view, box, takenAt) {
    const versionOffset = box.payloadStart;
    if (versionOffset + 12 > box.end) return false;
    const version = view.getUint8(versionOffset);
    const creationOffset = versionOffset + 4;
    const seconds = quickTimeSeconds(takenAt);
    if (version === 0 && creationOffset + 8 <= box.end) {
      view.setUint32(creationOffset, seconds, false);
      view.setUint32(creationOffset + 4, seconds, false);
      return true;
    }
    if (version === 1 && creationOffset + 16 <= box.end) {
      view.setBigUint64(creationOffset, BigInt(seconds), false);
      view.setBigUint64(creationOffset + 8, BigInt(seconds), false);
      return true;
    }
    return false;
  }

  function isAsciiDigit(value) {
    return value >= 0x30 && value <= 0x39;
  }

  function isIsoDateAt(bytes, offset, end) {
    if (offset + 19 > end) return false;
    const separators = new Map([[4, 0x2d], [7, 0x2d], [10, 0x54], [13, 0x3a], [16, 0x3a]]);
    for (let index = 0; index < 19; index += 1) {
      const separator = separators.get(index);
      if (separator !== undefined) {
        if (bytes[offset + index] !== separator) return false;
      } else if (!isAsciiDigit(bytes[offset + index])) return false;
    }
    return true;
  }

  function formatIsoDate(value) {
    return value.toISOString().slice(0, 19);
  }

  function replaceIsoTimezone(bytes, offset, end) {
    const timezoneOffset = offset + 19;
    if (timezoneOffset >= end || bytes[timezoneOffset] === 0x5a) return;
    const sign = bytes[timezoneOffset];
    if (sign !== 0x2b && sign !== 0x2d) return;
    if (
      timezoneOffset + 5 <= end
      && isAsciiDigit(bytes[timezoneOffset + 1])
      && isAsciiDigit(bytes[timezoneOffset + 2])
      && isAsciiDigit(bytes[timezoneOffset + 3])
      && isAsciiDigit(bytes[timezoneOffset + 4])
    ) {
      bytes.set([0x2b, 0x30, 0x30, 0x30, 0x30], timezoneOffset);
      return;
    }
    if (
      timezoneOffset + 6 <= end
      && isAsciiDigit(bytes[timezoneOffset + 1])
      && isAsciiDigit(bytes[timezoneOffset + 2])
      && bytes[timezoneOffset + 3] === 0x3a
      && isAsciiDigit(bytes[timezoneOffset + 4])
      && isAsciiDigit(bytes[timezoneOffset + 5])
    ) bytes.set([0x2b, 0x30, 0x30, 0x3a, 0x30, 0x30], timezoneOffset);
  }

  function patchIsoDates(bytes, start, end, takenAt) {
    const replacement = formatIsoDate(takenAt);
    let patched = 0;
    for (let offset = start; offset + 19 <= end; offset += 1) {
      if (!isIsoDateAt(bytes, offset, end)) continue;
      for (let index = 0; index < replacement.length; index += 1) bytes[offset + index] = replacement.charCodeAt(index);
      replaceIsoTimezone(bytes, offset, end);
      patched += 1;
      offset += replacement.length - 1;
    }
    return patched;
  }

  async function findIsoBlobBox(blob, targetType) {
    let offset = 0;
    while (offset + 8 <= blob.size) {
      const headerBytes = new Uint8Array(await blob.slice(offset, Math.min(blob.size, offset + 16)).arrayBuffer());
      if (headerBytes.length < 8) return null;
      const view = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);
      const compactSize = view.getUint32(0, false);
      const type = fourCharacterCode(headerBytes, 4);
      let size = compactSize;
      if (compactSize === 0) size = blob.size - offset;
      if (compactSize === 1) {
        if (headerBytes.length < 16) return null;
        const extendedSize = view.getBigUint64(8, false);
        if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
        size = Number(extendedSize);
      }
      const headerSize = compactSize === 1 ? 16 : 8;
      if (size < headerSize || offset + size > blob.size) return null;
      if (type === targetType) return { start: offset, end: offset + size };
      offset += size;
    }
    return null;
  }

  async function orderQuickTimeMedia(blob, takenAt) {
    const moovBox = await findIsoBlobBox(blob, "moov");
    if (!moovBox) return { blob, metadataApplied: false, metadataKind: "quicktime" };
    const bytes = new Uint8Array(await blob.slice(moovBox.start, moovBox.end).arrayBuffer());
    let headerDatesPatched = 0;
    let textDatesPatched = 0;
    walkIsoBoxes(bytes, 0, bytes.length, (box, view) => {
      if (QUICKTIME_DATE_HEADERS.has(box.type) && patchQuickTimeDateHeader(view, box, takenAt)) headerDatesPatched += 1;
      if (box.type === "moov") textDatesPatched += patchIsoDates(bytes, box.payloadStart, box.end, takenAt);
    });
    return {
      blob: new Blob([
        blob.slice(0, moovBox.start),
        bytes,
        blob.slice(moovBox.end)
      ], { type: blob.type || "video/mp4" }),
      metadataApplied: headerDatesPatched > 0 || textDatesPatched > 0,
      metadataKind: "quicktime"
    };
  }

  async function orderGalleryMediaBlob(blob, { filename, takenAt }) {
    const signature = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    if (isJpeg(signature)) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const orientation = jpegOrientation(bytes);
      const exifSegment = orderedExifSegment({ filename, takenAt, orientation });
      return {
        blob: replaceJpegExif(bytes, exifSegment),
        metadataApplied: true,
        metadataKind: "jpeg"
      };
    }
    if (isIsoBaseMedia(signature)) return orderQuickTimeMedia(blob, takenAt);
    return { blob, metadataApplied: false, metadataKind: "" };
  }

  globalScope.BmgPedGalleryMetadata = Object.freeze({
    formatExifDate,
    jpegOrientation,
    orderGalleryMediaBlob
  });
})(typeof window === "undefined" ? globalThis : window);
