export function safeFilename(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'projekt'
  );
}

export async function durableBlob(blob: Blob): Promise<Blob> {
  // Safari can persist a File from the camera picker as a reference to a
  // temporary WebKit object. Reading it once and constructing a plain Blob
  // makes IndexedDB store the actual bytes instead of that short-lived handle.
  return new Blob([await blob.arrayBuffer()], {
    type: blob.type || 'application/octet-stream',
  });
}

export async function recoverRenderedImage(
  mediaId: string,
  originalType: string,
): Promise<Blob | undefined> {
  const image = Array.from(
    document.querySelectorAll<HTMLImageElement>('img[data-media-id]'),
  ).find((item) => item.dataset.mediaId === mediaId);
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight)
    return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.drawImage(image, 0, 0);

  const type = originalType === 'image/png' ? 'image/png' : 'image/jpeg';
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.95),
  ).then((blob) => blob ?? undefined);
}

const EXPORT_PHOTO_MAX_EDGE = 2560;
const EXPORT_PHOTO_QUALITY = 0.85;

export async function optimizePhotoForExport(source: Blob): Promise<Blob> {
  const type = await detectedImageType(source);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return source;

  const typedSource =
    source.type === type ? source : new Blob([source], { type });
  const url = URL.createObjectURL(typedSource);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    if (longestEdge <= EXPORT_PHOTO_MAX_EDGE) return typedSource;

    const scale = Math.min(1, EXPORT_PHOTO_MAX_EDGE / longestEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return typedSource;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const outputType = type === 'image/png' ? 'image/png' : 'image/jpeg';
    const optimized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, EXPORT_PHOTO_QUALITY),
    );
    return optimized && optimized.size < typedSource.size
      ? optimized
      : typedSource;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function detectedImageType(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'image/png';
  if (
    String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  return blob.type;
}

export function extensionFor(blob: Blob): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return extensions[blob.type] ?? 'bin';
}
