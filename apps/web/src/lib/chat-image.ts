/** Client-side image prep for Dealo AI vision — resize + JPEG so payloads stay small. */

export type ChatImagePayload = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  data: string;
  previewUrl: string;
};

const MAX_EDGE = 1280;
const MAX_BYTES = 900_000;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not open that image.'));
    img.src = src;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress that image.'))),
      'image/jpeg',
      quality,
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Compress a user-picked image for Gemini vision (JPEG, max edge 1280). */
export async function prepareChatImage(file: File): Promise<ChatImagePayload> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, WebP, or GIF).');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('That image is too large. Try one under 12 MB.');
  }

  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare that image.');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > MAX_BYTES && quality > 0.45) {
    quality -= 0.12;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > MAX_BYTES) {
    throw new Error('Could not shrink that image enough. Try a clearer, smaller photo.');
  }

  const data = await blobToBase64(blob);
  return {
    mimeType: 'image/jpeg',
    data,
    previewUrl: URL.createObjectURL(blob),
  };
}
