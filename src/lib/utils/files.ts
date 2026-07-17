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
