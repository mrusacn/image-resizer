const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const imageStage = document.querySelector("#imageStage");
const emptyHint = document.querySelector("#emptyHint");
const canvas = document.querySelector("#previewCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const widthInput = document.querySelector("#widthInput");
const heightInput = document.querySelector("#heightInput");
const lockRatio = document.querySelector("#lockRatio");
const backgroundColor = document.querySelector("#backgroundColor");
const formatSelect = document.querySelector("#formatSelect");
const qualityRange = document.querySelector("#qualityRange");
const qualityValue = document.querySelector("#qualityValue");
const downloadButton = document.querySelector("#downloadButton");
const resetButton = document.querySelector("#resetButton");
const imageMeta = document.querySelector("#imageMeta");

let sourceImage = null;
let sourceFileName = "resized-image";
let originalWidth = 0;
let originalHeight = 0;
let activeFit = "contain";
let lastEditedAxis = "width";

function clampDimension(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(12000, Math.max(1, parsed));
}

function setCanvasSize(width, height) {
  canvas.width = width;
  canvas.height = height;
  canvas.style.aspectRatio = `${width} / ${height}`;
}

function drawPreview() {
  const targetWidth = clampDimension(widthInput.value);
  const targetHeight = clampDimension(heightInput.value);
  widthInput.value = targetWidth;
  heightInput.value = targetHeight;

  setCanvasSize(targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = backgroundColor.value;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  if (!sourceImage) {
    updateMeta();
    return;
  }

  const sourceRatio = originalWidth / originalHeight;
  const targetRatio = targetWidth / targetHeight;
  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  let drawX = 0;
  let drawY = 0;

  if (activeFit === "contain") {
    if (sourceRatio > targetRatio) {
      drawWidth = targetWidth;
      drawHeight = targetWidth / sourceRatio;
    } else {
      drawHeight = targetHeight;
      drawWidth = targetHeight * sourceRatio;
    }
    drawX = (targetWidth - drawWidth) / 2;
    drawY = (targetHeight - drawHeight) / 2;
  }

  if (activeFit === "cover") {
    if (sourceRatio > targetRatio) {
      drawHeight = targetHeight;
      drawWidth = targetHeight * sourceRatio;
    } else {
      drawWidth = targetWidth;
      drawHeight = targetWidth / sourceRatio;
    }
    drawX = (targetWidth - drawWidth) / 2;
    drawY = (targetHeight - drawHeight) / 2;
  }

  ctx.drawImage(sourceImage, drawX, drawY, drawWidth, drawHeight);
  updateMeta();
}

function updateMeta() {
  const targetWidth = clampDimension(widthInput.value);
  const targetHeight = clampDimension(heightInput.value);
  const bytes = targetWidth * targetHeight * 4;
  const sizeText =
    bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(bytes / 1024)} KB`;

  imageMeta.innerHTML = `
    <span>原图：${sourceImage ? `${originalWidth}×${originalHeight}` : "--"}</span>
    <span>输出：${targetWidth}×${targetHeight}</span>
    <span>画布数据：${sizeText}</span>
  `;
}

function syncRatio(axis) {
  if (!lockRatio.checked || !originalWidth || !originalHeight) return;
  const ratio = originalWidth / originalHeight;

  if (axis === "width") {
    heightInput.value = Math.max(1, Math.round(clampDimension(widthInput.value) / ratio));
  } else {
    widthInput.value = Math.max(1, Math.round(clampDimension(heightInput.value) * ratio));
  }
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const image = new Image();
    image.addEventListener("load", () => {
      sourceImage = image;
      originalWidth = image.naturalWidth;
      originalHeight = image.naturalHeight;
      sourceFileName = file.name.replace(/\.[^.]+$/, "") || "resized-image";
      widthInput.value = originalWidth;
      heightInput.value = originalHeight;
      imageStage.classList.remove("is-empty");
      emptyHint.hidden = true;
      downloadButton.disabled = false;
      drawPreview();
    });
    image.src = reader.result;
  });
  reader.readAsDataURL(file);
}

function canvasToBlob(type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function downloadImage() {
  if (!sourceImage) return;
  drawPreview();

  const type = formatSelect.value;
  const quality = Number(qualityRange.value) / 100;
  const blob = await canvasToBlob(type, quality);
  if (!blob) return;

  const extension = type === "image/jpeg" ? "jpg" : type.split("/")[1];
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sourceFileName}-${canvas.width}x${canvas.height}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

fileInput.addEventListener("change", (event) => {
  loadFile(event.target.files[0]);
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
  loadFile(event.dataTransfer.files[0]);
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
formatSelect.addEventListener("change", drawPreview);

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

document.querySelectorAll("[data-size]").forEach((button) => {
  button.addEventListener("click", () => {
    const [width, height] = button.dataset.size.split(",");
    widthInput.value = width;
    heightInput.value = height;
    drawPreview();
  });
});

downloadButton.addEventListener("click", downloadImage);

resetButton.addEventListener("click", () => {
  sourceImage = null;
  sourceFileName = "resized-image";
  originalWidth = 0;
  originalHeight = 0;
  fileInput.value = "";
  widthInput.value = 1200;
  heightInput.value = 800;
  lockRatio.checked = true;
  backgroundColor.value = "#ffffff";
  formatSelect.value = "image/png";
  qualityRange.value = 100;
  qualityValue.textContent = "100%";
  downloadButton.disabled = true;
  imageStage.classList.add("is-empty");
  emptyHint.hidden = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasSize(1200, 800);
  updateMeta();
});

setCanvasSize(1200, 800);
updateMeta();
