import type { Floorplan, Photo } from '@/lib/types/project';

export type StoredPhoto = Omit<Photo, 'blob'> & StoredMedia;
export type StoredFloorplan = Omit<Floorplan, 'blob'> & StoredMedia;

interface StoredMedia {
  bytes?: ArrayBuffer;
  mimeType?: string;
  // Read-only compatibility with projects created before the ArrayBuffer
  // storage format. New writes never include this field.
  blob?: Blob;
}

export async function mediaBytes(blob: Blob): Promise<{
  bytes: ArrayBuffer;
  mimeType: string;
}> {
  return {
    bytes: await blob.arrayBuffer(),
    mimeType: blob.type || 'application/octet-stream',
  };
}

export async function storePhoto(photo: Photo): Promise<StoredPhoto> {
  const { blob, ...metadata } = photo;
  return { ...metadata, ...(await mediaBytes(blob)) };
}

export async function storeFloorplan(
  floorplan: Floorplan,
): Promise<StoredFloorplan> {
  const { blob, ...metadata } = floorplan;
  return { ...metadata, ...(await mediaBytes(blob)) };
}

export function loadPhoto(photo: StoredPhoto): Photo {
  const { bytes, mimeType, blob, ...metadata } = photo;
  return {
    ...metadata,
    blob: bytes
      ? new Blob([bytes], { type: mimeType || 'application/octet-stream' })
      : requireLegacyBlob(blob),
  };
}

export function loadFloorplan(floorplan: StoredFloorplan): Floorplan {
  const { bytes, mimeType, blob, ...metadata } = floorplan;
  return {
    ...metadata,
    blob: bytes
      ? new Blob([bytes], { type: mimeType || 'application/octet-stream' })
      : requireLegacyBlob(blob),
  };
}

function requireLegacyBlob(blob?: Blob): Blob {
  if (blob instanceof Blob) return blob;
  throw new Error('Gespeicherte Bilddaten fehlen.');
}
