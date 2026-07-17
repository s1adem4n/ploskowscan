import JSZip from 'jszip';

import { db } from '@/lib/db/database';
import {
  loadFloorplan,
  loadPhoto,
  mediaBytes,
  storeFloorplan,
  storePhoto,
} from '@/lib/db/media';
import type { Floorplan, Photo, ProjectBundle } from '@/lib/types/project';
import {
  durableBlob,
  extensionFor,
  recoverRenderedImage,
  safeFilename,
} from '@/lib/utils/files';

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
    zip.file(`medien/fotos/${photo.id}.${extensionFor(media)}`, media);
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

  const photos: Photo[] = [];
  for (const item of bundle.photos) {
    const media = findMedia(zip, 'medien/fotos', item.id);
    if (!media) throw new Error(`Foto „${item.title}“ fehlt im Archiv.`);
    photos.push({ ...item, blob: await media.async('blob') });
  }
  const floorplans: Floorplan[] = [];
  for (const item of bundle.floorplans) {
    const media = findMedia(zip, 'medien/grundrisse', item.id);
    if (!media) throw new Error('Ein Grundriss fehlt im Archiv.');
    floorplans.push({ ...item, blob: await media.async('blob') });
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
      const id = bundle.project.id;
      await Promise.all([
        db.measurements.where('projectId').equals(id).delete(),
        db.hotspots.where('projectId').equals(id).delete(),
        db.photos.where('projectId').equals(id).delete(),
        db.floorplans.where('projectId').equals(id).delete(),
        db.areas.where('projectId').equals(id).delete(),
        db.levels.where('projectId').equals(id).delete(),
      ]);
      await db.projects.put(bundle.project);
      await db.levels.bulkPut(bundle.levels);
      await db.areas.bulkPut(bundle.areas);
      await db.photos.bulkPut(await Promise.all(photos.map(storePhoto)));
      await db.measurements.bulkPut(bundle.measurements);
      await db.floorplans.bulkPut(
        await Promise.all(floorplans.map(storeFloorplan)),
      );
      await db.hotspots.bulkPut(bundle.hotspots);
    },
  );
  return bundle.project.id;
}
