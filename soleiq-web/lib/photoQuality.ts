export interface PreparedPhoto {
  dataUrl: string;
  quality: {
    passed: boolean;
    brightness: number;
    sharpness: number;
    width: number;
    height: number;
    issues: string[];
  };
}

const MAX_EDGE = 1400;
const HEIC_NAME = /\.(heic|heif)$/i;
const SUPPORTED_NAME = /\.(jpe?g|png|webp|heic|heif)$/i;

export async function prepareFootPhoto(file: File): Promise<PreparedPhoto> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    HEIC_NAME.test(file.name);
  if (!isHeic && !file.type.startsWith("image/") && !SUPPORTED_NAME.test(file.name)) {
    throw new Error("Choose a JPEG, PNG, WebP, HEIC, or HEIF image.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("This image is larger than 15 MB. Choose a smaller photo.");
  }

  const browserImage = isHeic ? await convertHeicToJpeg(file) : file;
  const image = await loadImage(browserImage);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The browser could not read this image.");
  context.drawImage(image, 0, 0, width, height);

  const sample = document.createElement("canvas");
  sample.width = 120;
  sample.height = 120;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("The browser could not check this image.");
  sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height);
  const gray = new Float32Array(sample.width * sample.height);
  let brightness = 0;
  for (let i = 0; i < gray.length; i++) {
    const value =
      pixels.data[i * 4] * 0.299 +
      pixels.data[i * 4 + 1] * 0.587 +
      pixels.data[i * 4 + 2] * 0.114;
    gray[i] = value;
    brightness += value;
  }
  brightness /= gray.length;

  let lapSum = 0;
  let lapSquareSum = 0;
  let count = 0;
  for (let y = 1; y < sample.height - 1; y++) {
    for (let x = 1; x < sample.width - 1; x++) {
      const i = y * sample.width + x;
      const lap =
        -4 * gray[i] +
        gray[i - 1] +
        gray[i + 1] +
        gray[i - sample.width] +
        gray[i + sample.width];
      lapSum += lap;
      lapSquareSum += lap * lap;
      count++;
    }
  }
  const mean = lapSum / count;
  const sharpness = lapSquareSum / count - mean * mean;
  const issues: string[] = [];

  if (image.width < 600 || image.height < 600) {
    issues.push("The photo is too small. Use the original camera photo.");
  }
  if (brightness < 45) {
    issues.push("The photo is too dark. Move to brighter, even lighting.");
  } else if (brightness > 225) {
    issues.push("The photo is overexposed. Turn off flash and avoid glare.");
  }
  if (sharpness < 35) {
    issues.push("The photo looks blurry. Hold the phone steady and tap to focus.");
  }

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.84),
    quality: {
      passed: issues.length === 0,
      brightness,
      sharpness,
      width: image.width,
      height: image.height,
      issues,
    },
  };
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    return Array.isArray(converted) ? converted[0] : converted;
  } catch {
    throw new Error(
      "This HEIC photo could not be converted. Try exporting it as JPEG and upload it again."
    );
  }
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened."));
    };
    image.src = url;
  });
}
