import JSZip from 'jszip';

import { db } from '@/lib/db/database';
import {
  loadFloorplan,
  loadPhoto,
  mediaBytes,
  type StoredFloorplan,
  type StoredPhoto,
} from '@/lib/db/media';
import type { ProjectBundle } from '@/lib/types/project';
import {
  durableBlob,
  extensionFor,
  optimizePhotoForExport,
  recoverRenderedImage,
  safeFilename,
} from '@/lib/utils/files';
import { createId } from '@/lib/utils/id';

const MANIFEST = 'projekt.json';

export async function exportProject(projectId: string): Promise<File> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('Projekt nicht gefunden.');

  const [
    levels,
    areas,
    storedPhotos,
    measurements,
    storedFloorplans,
    hotspots,
  ] = await Promise.all([
    db.levels.where('projectId').equals(projectId).sortBy('sortOrder'),
    db.areas.where('projectId').equals(projectId).sortBy('sortOrder'),
    db.photos.where('projectId').equals(projectId).sortBy('sortOrder'),
    db.measurements.where('projectId').equals(projectId).toArray(),
    db.floorplans.where('projectId').equals(projectId).toArray(),
    db.hotspots.where('projectId').equals(projectId).toArray(),
  ]);
  const photos = storedPhotos.map(loadPhoto);
  const floorplans = storedFloorplans.map(loadFloorplan);

  const bundle: ProjectBundle = {
    format: 'ploskowscan',
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    levels,
    areas,
    photos: photos.map(({ blob: _, ...photo }) => photo),
    measurements,
    floorplans: floorplans.map(({ blob: _, ...plan }) => plan),
    hotspots,
  };

  const zip = new JSZip();
  zip.file(MANIFEST, JSON.stringify(bundle, null, 2));
  for (const photo of photos) {
    let media: Blob;
    try {
      media = await durableBlob(photo.blob);
    } catch {
      const recovered = await recoverRenderedImage(
        `photo:${photo.id}`,
        photo.blob.type,
      );
      if (!recovered)
        throw new Error(
          `Das Foto „${photo.title}“ ist in Safari nicht mehr direkt lesbar. ` +
            'Öffne zuerst den Bereich, in dem das Bild sichtbar ist, und starte dort den Export erneut.',
        );
      media = recovered;
      await db.photos.update(photo.id, {
        ...(await mediaBytes(media)),
        blob: undefined,
      });
    }
    const optimized = await optimizePhotoForExport(media);
    zip.file(`medien/fotos/${photo.id}.${extensionFor(optimized)}`, optimized);
  }
  for (const plan of floorplans) {
    let media: Blob;
    try {
      media = await durableBlob(plan.blob);
    } catch {
      const recovered = await recoverRenderedImage(
        `floorplan:${plan.id}`,
        plan.blob.type,
      );
      if (!recovered)
        throw new Error(
          'Ein Grundriss ist in Safari nicht mehr direkt lesbar. Zeige ihn an und starte den Export erneut.',
        );
      media = recovered;
      await db.floorplans.update(plan.id, {
        ...(await mediaBytes(media)),
        blob: undefined,
      });
    }
    zip.file(`medien/grundrisse/${plan.id}.${extensionFor(media)}`, media);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return new File([blob], `${safeFilename(project.name)}.ploskowscan.zip`, {
    type: 'application/zip',
    lastModified: Date.now(),
  });
}

function findMedia(
  zip: JSZip,
  directory: string,
  id: string,
): JSZip.JSZipObject | undefined {
  return Object.values(zip.files).find(
    (entry) => !entry.dir && entry.name.startsWith(`${directory}/${id}.`),
  );
}

async function archiveMedia(
  entry: JSZip.JSZipObject,
): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
  const bytes = await entry.async('arraybuffer');
  return { bytes, mimeType: detectImageType(entry.name, bytes) };
}

function detectImageType(name: string, buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'image/png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP')
    return 'image/webp';
  if (ascii(bytes, 0, 3) === 'GIF') return 'image/gif';
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic';
    if (['heif', 'mif1', 'msf1'].includes(brand)) return 'image/heif';
  }

  const extension = name.split('.').pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return (extension && byExtension[extension]) || 'application/octet-stream';
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function importedCopy(bundle: ProjectBundle): ProjectBundle {
  const projectId = createId();
  const levelIds = new Map(bundle.levels.map((item) => [item.id, createId()]));
  const areaIds = new Map(bundle.areas.map((item) => [item.id, createId()]));
  const photoIds = new Map(bundle.photos.map((item) => [item.id, createId()]));
  const floorplanIds = new Map(
    bundle.floorplans.map((item) => [item.id, createId()]),
  );

  const mapped = (ids: Map<string, string>, id: string): string => {
    const result = ids.get(id);
    if (!result)
      throw new Error('Das Projektarchiv enthält ungültige Verweise.');
    return result;
  };

  return {
    ...bundle,
    project: {
      ...bundle.project,
      id: projectId,
      name: `${bundle.project.name} (Import)`,
    },
    levels: bundle.levels.map((item) => ({
      ...item,
      id: mapped(levelIds, item.id),
      projectId,
    })),
    areas: bundle.areas.map((item) => ({
      ...item,
      id: mapped(areaIds, item.id),
      projectId,
      levelId: mapped(levelIds, item.levelId),
    })),
    photos: bundle.photos.map((item) => ({
      ...item,
      id: mapped(photoIds, item.id),
      projectId,
      areaId: mapped(areaIds, item.areaId),
    })),
    measurements: bundle.measurements.map((item) => ({
      ...item,
      id: createId(),
      projectId,
      photoId: mapped(photoIds, item.photoId),
    })),
    floorplans: bundle.floorplans.map((item) => ({
      ...item,
      id: mapped(floorplanIds, item.id),
      projectId,
      levelId: mapped(levelIds, item.levelId),
    })),
    hotspots: bundle.hotspots.map((item) => ({
      ...item,
      id: createId(),
      projectId,
      floorplanId: mapped(floorplanIds, item.floorplanId),
      areaId: mapped(areaIds, item.areaId),
    })),
  };
}

export async function importProject(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file(MANIFEST);
  if (!manifestFile) throw new Error('Keine gültige PloskowScan-Datei.');
  const bundle = JSON.parse(await manifestFile.async('text')) as ProjectBundle;
  if (
    bundle.format !== 'ploskowscan' ||
    bundle.version !== 1 ||
    !bundle.project?.id
  )
    throw new Error('Dieses Projektformat wird nicht unterstützt.');

  const target = (await db.projects.get(bundle.project.id))
    ? importedCopy(bundle)
    : bundle;

  // Read and convert every file before opening the IndexedDB transaction.
  // Awaiting Blob/ZIP work inside a transaction lets browsers auto-commit it.
  const photos: StoredPhoto[] = [];
  for (let index = 0; index < bundle.photos.length; index += 1) {
    const source = bundle.photos[index];
    const item = target.photos[index];
    const media = findMedia(zip, 'medien/fotos', source.id);
    if (!media) throw new Error(`Foto „${item.title}“ fehlt im Archiv.`);
    photos.push({ ...item, ...(await archiveMedia(media)) });
  }
  const floorplans: StoredFloorplan[] = [];
  for (let index = 0; index < bundle.floorplans.length; index += 1) {
    const source = bundle.floorplans[index];
    const item = target.floorplans[index];
    const media = findMedia(zip, 'medien/grundrisse', source.id);
    if (!media) throw new Error('Ein Grundriss fehlt im Archiv.');
    floorplans.push({ ...item, ...(await archiveMedia(media)) });
  }

  await db.transaction(
    'rw',
    [
      db.projects,
      db.levels,
      db.areas,
      db.photos,
      db.measurements,
      db.floorplans,
      db.hotspots,
    ],
    async () => {
      // Only adds are used: an unexpected ID collision aborts the complete
      // transaction instead of replacing any existing user data.
      await db.projects.add(target.project);
      if (target.levels.length) await db.levels.bulkAdd(target.levels);
      if (target.areas.length) await db.areas.bulkAdd(target.areas);
      if (photos.length) await db.photos.bulkAdd(photos);
      if (target.measurements.length)
        await db.measurements.bulkAdd(target.measurements);
      if (floorplans.length) await db.floorplans.bulkAdd(floorplans);
      if (target.hotspots.length) await db.hotspots.bulkAdd(target.hotspots);
    },
  );
  return target.project.id;
}
