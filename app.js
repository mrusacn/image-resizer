const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const originalStage = document.querySelector("#originalStage");
const imageStage = document.querySelector("#imageStage");
const emptyHint = document.querySelector("#emptyHint");
const originalCanvas = document.querySelector("#originalCanvas");
const originalCtx = originalCanvas.getContext("2d", { alpha: false });
const canvas = document.querySelector("#previewCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const widthInput = document.querySelector("#widthInput");
const heightInput = document.querySelector("#heightInput");
const lockRatio = document.querySelector("#lockRatio");
const backgroundColor = document.querySelector("#backgroundColor");
const formatSelect = document.querySelector("#formatSelect");
const dpiSelect = document.querySelector("#dpiSelect");
const qualityRange = document.querySelector("#qualityRange");
const qualityValue = document.querySelector("#qualityValue");
const targetSizeSelect = document.querySelector("#targetSizeSelect");
const customSizeWrap = document.querySelector("#customSizeWrap");
const customSizeInput = document.querySelector("#customSizeInput");
const downloadButton = document.querySelector("#downloadButton");
const shareButton = document.querySelector("#shareButton");
const batchButton = document.querySelector("#batchButton");
const resetButton = document.querySelector("#resetButton");
const imageMeta = document.querySelector("#imageMeta");
const fileList = document.querySelector("#fileList");
const statusLine = document.querySelector("#statusLine");
const saveModal = document.querySelector("#saveModal");
const closeSaveModal = document.querySelector("#closeSaveModal");
const savePreviewImage = document.querySelector("#savePreviewImage");
const modalShareButton = document.querySelector("#modalShareButton");
const modalDownloadButton = document.querySelector("#modalDownloadButton");

let images = [];
let activeIndex = -1;
let activeFit = "contain";
let lastEditedAxis = "width";
let anchorX = 0.5;
let anchorY = 0.5;
let lastSaveBlob = null;
let lastSaveFilename = "";

function clampDimension(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(12000, Math.max(1, parsed));
}

function formatBytes(bytes) {
  if (!bytes) return "--";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getCurrentItem() {
  return images[activeIndex] || null;
}

function getExtension(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

function getTargetBytes() {
  const selected = targetSizeSelect.value;
  if (selected === "0") return 0;
  if (selected === "custom") return Math.max(20, Number(customSizeInput.value) || 300) * 1024;
  return Number(selected) * 1024;
}

function setCanvasSize(targetCanvas, width, height) {
  targetCanvas.width = width;
  targetCanvas.height = height;
  targetCanvas.style.aspectRatio = `${width} / ${height}`;
}

function getDrawBox(item, targetWidth, targetHeight) {
  if (activeFit === "stretch") {
    return { x: 0, y: 0, width: targetWidth, height: targetHeight };
  }

  const sourceRatio = item.width / item.height;
  const targetRatio = targetWidth / targetHeight;
  let drawWidth = targetWidth;
  let drawHeight = targetHeight;

  if (activeFit === "contain") {
    if (sourceRatio > targetRatio) {
      drawHeight = targetWidth / sourceRatio;
    } else {
      drawWidth = targetHeight * sourceRatio;
    }
  }

  if (activeFit === "cover") {
    if (sourceRatio > targetRatio) {
      drawWidth = targetHeight * sourceRatio;
    } else {
      drawHeight = targetWidth / sourceRatio;
    }
  }

  return {
    x: (targetWidth - drawWidth) * anchorX,
    y: (targetHeight - drawHeight) * anchorY,
    width: drawWidth,
    height: drawHeight,
  };
}

function drawOutput(targetCanvas, item) {
  const targetWidth = clampDimension(widthInput.value);
  const targetHeight = clampDimension(heightInput.value);
  const targetCtx = targetCanvas.getContext("2d", { alpha: false });
  setCanvasSize(targetCanvas, targetWidth, targetHeight);

  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = "high";
  targetCtx.fillStyle = backgroundColor.value;
  targetCtx.fillRect(0, 0, targetWidth, targetHeight);

  const box = getDrawBox(item, targetWidth, targetHeight);
  targetCtx.drawImage(item.image, box.x, box.y, box.width, box.height);
}

function drawOriginalPreview(item) {
  const maxEdge = 1400;
  const scale = Math.min(1, maxEdge / Math.max(item.width, item.height));
  const previewWidth = Math.max(1, Math.round(item.width * scale));
  const previewHeight = Math.max(1, Math.round(item.height * scale));

  setCanvasSize(originalCanvas, previewWidth, previewHeight);
  originalCtx.imageSmoothingEnabled = true;
  originalCtx.imageSmoothingQuality = "high";
  originalCtx.fillStyle = "#ffffff";
  originalCtx.fillRect(0, 0, previewWidth, previewHeight);
  originalCtx.drawImage(item.image, 0, 0, previewWidth, previewHeight);
}

function drawPreview() {
  const item = getCurrentItem();
  const targetWidth = clampDimension(widthInput.value);
  const targetHeight = clampDimension(heightInput.value);
  widthInput.value = targetWidth;
  heightInput.value = targetHeight;

  if (!item) {
    updateMeta();
    return;
  }

  originalStage.classList.remove("is-empty");
  imageStage.classList.remove("is-empty");
  emptyHint.hidden = true;
  drawOriginalPreview(item);
  drawOutput(canvas, item);
  updateMeta();
}

function updateMeta(exportBlob = null) {
  const item = getCurrentItem();
  const targetWidth = clampDimension(widthInput.value);
  const targetHeight = clampDimension(heightInput.value);
  const dpi = dpiSelect.value;
  const scale = item ? `${(targetWidth / item.width).toFixed(2)}× / ${(targetHeight / item.height).toFixed(2)}×` : "--";

  imageMeta.innerHTML = `
    <span>原图：${item ? `${item.width}×${item.height}，${formatBytes(item.file.size)}` : "--"}</span>
    <span>输出：${targetWidth}×${targetHeight}，${dpi} DPI，${scale}</span>
    <span>导出：${exportBlob ? formatBytes(exportBlob.size) : "--"}</span>
  `;
}

function renderFileList() {
  fileList.innerHTML = "";
  images.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `file-row${index === activeIndex ? " is-active" : ""}`;

    const textWrap = document.createElement("div");
    const name = document.createElement("div");
    const detail = document.createElement("div");
    const button = document.createElement("button");

    name.className = "file-name";
    name.textContent = item.name;
    detail.className = "file-detail";
    detail.textContent = `${item.width}×${item.height} · ${formatBytes(item.file.size)}`;
    button.type = "button";
    button.textContent = "预览";
    button.addEventListener("click", () => setActiveImage(index));

    textWrap.appendChild(name);
    textWrap.appendChild(detail);
    row.appendChild(textWrap);
    row.appendChild(button);
    fileList.appendChild(row);
  });
}

function syncRatio(axis) {
  const item = getCurrentItem();
  if (!lockRatio.checked || !item) return;
  const ratio = item.width / item.height;

  if (axis === "width") {
    heightInput.value = Math.max(1, Math.round(clampDimension(widthInput.value) / ratio));
  } else {
    widthInput.value = Math.max(1, Math.round(clampDimension(heightInput.value) * ratio));
  }
}

function setActiveImage(index) {
  activeIndex = index;
  const item = getCurrentItem();
  if (!item) return;

  widthInput.value = item.width;
  heightInput.value = item.height;
  downloadButton.disabled = false;
  shareButton.disabled = false;
  batchButton.disabled = images.length === 0;
  renderFileList();
  drawPreview();
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("error", reject);
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", reject);
      image.addEventListener("load", () => {
        resolve({
          file,
          image,
          name: file.name.replace(/\.[^.]+$/, "") || "resized-image",
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      });
      image.src = reader.result;
    });
    reader.readAsDataURL(file);
  });
}

async function loadFiles(fileListValue) {
  const files = Array.from(fileListValue || []);
  if (!files.length) return;

  statusLine.textContent = "正在读取图片...";
  const loaded = (await Promise.all(files.map(readImageFile))).filter(Boolean);
  images = [...images, ...loaded];

  if (activeIndex === -1 && images.length) {
    setActiveImage(0);
  } else {
    renderFileList();
    drawPreview();
  }

  statusLine.textContent = `已载入 ${images.length} 张图片。`;
}

function canvasToBlob(targetCanvas, type, quality) {
  return new Promise((resolve) => {
    targetCanvas.toBlob(resolve, type, quality);
  });
}

async function createExportBlob(targetCanvas, type, maxQuality, targetBytes) {
  if (type === "image/png" || !targetBytes) {
    return canvasToBlob(targetCanvas, type, maxQuality);
  }

  let low = 0.35;
  let high = Math.max(low, maxQuality);
  let best = await canvasToBlob(targetCanvas, type, high);

  if (best && best.size <= targetBytes) return best;

  for (let i = 0; i < 8; i += 1) {
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(targetCanvas, type, mid);
    if (!blob) break;

    if (blob.size <= targetBytes) {
      best = blob;
      low = mid;
    } else {
      high = mid;
    }
  }

  return best;
}

function makeExportCanvas(item) {
  const exportCanvas = document.createElement("canvas");
  drawOutput(exportCanvas, item);
  return exportCanvas;
}

async function exportItem(item) {
  const type = formatSelect.value;
  const dpi = Number(dpiSelect.value);
  const quality = Number(qualityRange.value) / 100;
  const targetBytes = getTargetBytes();
  const exportCanvas = makeExportCanvas(item);
  const blob = await createExportBlob(exportCanvas, type, quality, targetBytes);
  if (!blob) throw new Error("导出失败，请换一种格式再试。");
  return applyDpiMetadata(blob, type, dpi);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function makeFile(blob, filename) {
  try {
    return new File([blob], filename, { type: blob.type || "image/png" });
  } catch {
    return null;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

async function openSaveModal(blob, filename) {
  lastSaveBlob = blob;
  lastSaveFilename = filename;
  savePreviewImage.src = await blobToDataUrl(blob);
  saveModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeAlbumModal() {
  saveModal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function downloadImage() {
  const item = getCurrentItem();
  if (!item) return;

  statusLine.textContent = "正在导出当前图片...";
  drawPreview();

  const blob = await exportItem(item);
  const extension = getExtension(formatSelect.value);
  const filename = `${item.name}-${canvas.width}x${canvas.height}-${dpiSelect.value}dpi.${extension}`;
  downloadBlob(blob, filename);
  updateMeta(blob);

  const targetBytes = getTargetBytes();
  if (targetBytes && blob.size > targetBytes) {
    statusLine.textContent = "当前设置无法压到目标大小，建议改用 JPG/WebP 或降低尺寸。";
  } else {
    statusLine.textContent = `已导出：${filename}`;
  }
}

async function shareImage() {
  const item = getCurrentItem();
  if (!item) return;

  statusLine.textContent = "正在准备手机保存...";
  drawPreview();

  const blob = await exportItem(item);
  const extension = getExtension(formatSelect.value);
  const filename = `${item.name}-${canvas.width}x${canvas.height}-${dpiSelect.value}dpi.${extension}`;
  await openSaveModal(blob, filename);
  updateMeta(blob);
  statusLine.textContent = "已生成相册保存预览，请在弹窗里长按图片保存。";
}

async function shareFromModal() {
  if (!lastSaveBlob || !lastSaveFilename) return;

  const file = makeFile(lastSaveBlob, lastSaveFilename);
  if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "清晰改图",
        text: "保存处理后的图片",
      });
      statusLine.textContent = "已打开系统分享面板；如果没有相册选项，请长按弹窗图片保存。";
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        statusLine.textContent = "已取消分享。";
        return;
      }
    }
  }

  statusLine.textContent = "当前浏览器不支持图片文件分享，请长按弹窗图片保存。";
}

function downloadFromModal() {
  if (!lastSaveBlob || !lastSaveFilename) return;
  downloadBlob(lastSaveBlob, lastSaveFilename);
  statusLine.textContent = "已开始普通下载；如需进相册，请长按弹窗图片保存。";
}

async function downloadBatch() {
  if (!images.length) return;

  statusLine.textContent = "正在批量处理，请稍等...";
  const extension = getExtension(formatSelect.value);
  const entries = [];

  for (let i = 0; i < images.length; i += 1) {
    const item = images[i];
    statusLine.textContent = `正在处理 ${i + 1}/${images.length}：${item.name}`;
    const blob = await exportItem(item);
    const arrayBuffer = await blob.arrayBuffer();
    entries.push({
      name: `${item.name}-${clampDimension(widthInput.value)}x${clampDimension(heightInput.value)}.${extension}`,
      data: new Uint8Array(arrayBuffer),
    });
  }

  const zip = createZip(entries);
  downloadBlob(zip, `image-resizer-${Date.now()}.zip`);
  statusLine.textContent = `已打包 ${entries.length} 张图片。`;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function getDosTimeDate() {
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  return { time, date };
}

function createZip(entries) {
  const encoder = new TextEncoder();
  const { time, date } = getDosTimeDate();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);

    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, date);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, entry.data.length);
    writeUint32(localView, 22, entry.data.length);
    writeUint16(localView, 26, nameBytes.length);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, time);
    writeUint16(centralView, 14, date);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, entry.data.length);
    writeUint32(centralView, 24, entry.data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, entries.length);
  writeUint16(endView, 10, entries.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);

  return new Blob([...localParts, ...centralParts, endHeader], { type: "application/zip" });
}

async function applyDpiMetadata(blob, type, dpi) {
  if (type === "image/png") return patchPngDpi(blob, dpi);
  if (type === "image/jpeg") return patchJpegDpi(blob, dpi);
  return blob;
}

function writeBigUint32(target, offset, value) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

async function patchPngDpi(blob, dpi) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const typeBytes = new TextEncoder().encode("pHYs");
  const data = new Uint8Array(9);
  writeBigUint32(data, 0, ppm);
  writeBigUint32(data, 4, ppm);
  data[8] = 1;

  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);

  const chunk = new Uint8Array(21);
  writeBigUint32(chunk, 0, 9);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeBigUint32(chunk, 17, crc32(crcInput));

  const parts = [bytes.slice(0, 8)];
  let offset = 8;
  let inserted = false;

  while (offset < bytes.length) {
    const length =
      (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const next = offset + 12 + length;

    if (type !== "pHYs") {
      parts.push(bytes.slice(offset, next));
    }

    if (type === "IHDR" && !inserted) {
      parts.push(chunk);
      inserted = true;
    }

    offset = next;
  }

  return new Blob(parts, { type: "image/png" });
}

async function patchJpegDpi(blob, dpi) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const density = Math.max(1, Math.min(65535, Math.round(dpi)));

  if (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes[3] === 0xe0 &&
    String.fromCharCode(bytes[6], bytes[7], bytes[8], bytes[9], bytes[10]) === "JFIF\0"
  ) {
    bytes[13] = 1;
    bytes[14] = (density >> 8) & 0xff;
    bytes[15] = density & 0xff;
    bytes[16] = (density >> 8) & 0xff;
    bytes[17] = density & 0xff;
  }

  return new Blob([bytes], { type: "image/jpeg" });
}

fileInput.addEventListener("change", (event) => {
  loadFiles(event.target.files);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  loadFiles(event.dataTransfer.files);
});

widthInput.addEventListener("input", () => {
  lastEditedAxis = "width";
  syncRatio("width");
  drawPreview();
});

heightInput.addEventListener("input", () => {
  lastEditedAxis = "height";
  syncRatio("height");
  drawPreview();
});

lockRatio.addEventListener("change", () => {
  syncRatio(lastEditedAxis);
  drawPreview();
});

backgroundColor.addEventListener("input", drawPreview);
dpiSelect.addEventListener("change", drawPreview);
formatSelect.addEventListener("change", drawPreview);
customSizeInput.addEventListener("input", drawPreview);

targetSizeSelect.addEventListener("change", () => {
  customSizeWrap.hidden = targetSizeSelect.value !== "custom";
  drawPreview();
});

qualityRange.addEventListener("input", () => {
  qualityValue.textContent = `${qualityRange.value}%`;
});

document.querySelectorAll("[data-fit]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-fit]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    activeFit = button.dataset.fit;
    drawPreview();
  });
});

document.querySelectorAll("[data-anchor]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-anchor]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const [x, y] = button.dataset.anchor.split(",").map(Number);
    anchorX = x;
    anchorY = y;
    drawPreview();
  });
});

document.querySelectorAll("[data-size]").forEach((button) => {
  button.addEventListener("click", () => {
    const [width, height] = button.dataset.size.split(",");
    widthInput.value = width;
    heightInput.value = height;
    if (button.dataset.dpi) dpiSelect.value = button.dataset.dpi;
    drawPreview();
  });
});

downloadButton.addEventListener("click", downloadImage);
shareButton.addEventListener("click", shareImage);
batchButton.addEventListener("click", downloadBatch);
closeSaveModal.addEventListener("click", closeAlbumModal);
modalShareButton.addEventListener("click", shareFromModal);
modalDownloadButton.addEventListener("click", downloadFromModal);
saveModal.addEventListener("click", (event) => {
  if (event.target === saveModal) closeAlbumModal();
});

resetButton.addEventListener("click", () => {
  images = [];
  activeIndex = -1;
  fileInput.value = "";
  widthInput.value = 1200;
  heightInput.value = 800;
  lockRatio.checked = true;
  backgroundColor.value = "#ffffff";
  formatSelect.value = "image/png";
  dpiSelect.value = "96";
  targetSizeSelect.value = "0";
  customSizeWrap.hidden = true;
  qualityRange.value = 100;
  qualityValue.textContent = "100%";
  downloadButton.disabled = true;
  shareButton.disabled = true;
  batchButton.disabled = true;
  originalStage.classList.add("is-empty");
  imageStage.classList.add("is-empty");
  emptyHint.hidden = false;
  fileList.innerHTML = "";
  originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasSize(originalCanvas, 1200, 800);
  setCanvasSize(canvas, 1200, 800);
  statusLine.textContent = "图片不会上传服务器，全部在浏览器本地处理。";
  updateMeta();
});

setCanvasSize(originalCanvas, 1200, 800);
setCanvasSize(canvas, 1200, 800);
updateMeta();
