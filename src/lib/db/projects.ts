import { db } from '@/lib/db/database';
import type { Area, AreaKind, Level, Project } from '@/lib/types/project';
import { createId, now } from '@/lib/utils/id';

export async function createProject(
  name: string,
  address = '',
): Promise<Project> {
  const timestamp = now();
  const project: Project = {
    id: createId(),
    name: name.trim(),
    address: address.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const level: Level = {
    id: createId(),
    projectId: project.id,
    name: 'Erdgeschoss',
    sortOrder: 0,
  };
  await db.transaction('rw', db.projects, db.levels, async () => {
    await db.projects.add(project);
    await db.levels.add(level);
  });
  return project;
}

export async function createLevel(
  projectId: string,
  name: string,
): Promise<Level> {
  const count = await db.levels.where('projectId').equals(projectId).count();
  const level: Level = {
    id: createId(),
    projectId,
    name: name.trim(),
    sortOrder: count,
  };
  await db.levels.add(level);
  await touchProject(projectId);
  return level;
}

export async function createArea(
  projectId: string,
  levelId: string,
  name: string,
  kind: AreaKind,
): Promise<Area> {
  const count = await db.areas.where('levelId').equals(levelId).count();
  const area: Area = {
    id: createId(),
    projectId,
    levelId,
    name: name.trim(),
    kind,
    sortOrder: count,
  };
  await db.areas.add(area);
  await touchProject(projectId);
  return area;
}

export async function touchProject(projectId: string): Promise<void> {
  await db.projects.update(projectId, { updatedAt: now() });
}

export async function deleteArea(area: Area): Promise<void> {
  await db.transaction(
    'rw',
    [db.projects, db.areas, db.photos, db.measurements, db.hotspots],
    async () => {
      const photoIds = await db.photos
        .where('areaId')
        .equals(area.id)
        .primaryKeys();

      if (photoIds.length) {
        await db.measurements.where('photoId').anyOf(photoIds).delete();
      }
      await db.hotspots.where('areaId').equals(area.id).delete();
      await db.photos.where('areaId').equals(area.id).delete();
      await db.areas.delete(area.id);
      await db.projects.update(area.projectId, { updatedAt: now() });
    },
  );
}

export async function deleteLevel(level: Level): Promise<void> {
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
      const areaIds = await db.areas
        .where('levelId')
        .equals(level.id)
        .primaryKeys();
      const photoIds = areaIds.length
        ? await db.photos.where('areaId').anyOf(areaIds).primaryKeys()
        : [];
      const floorplan = await db.floorplans
        .where('levelId')
        .equals(level.id)
        .first();

      if (photoIds.length) {
        await db.measurements.where('photoId').anyOf(photoIds).delete();
      }
      if (areaIds.length) {
        await db.hotspots.where('areaId').anyOf(areaIds).delete();
        await db.photos.where('areaId').anyOf(areaIds).delete();
        await db.areas.where('id').anyOf(areaIds).delete();
      }
      if (floorplan) {
        await db.hotspots.where('floorplanId').equals(floorplan.id).delete();
        await db.floorplans.delete(floorplan.id);
      }
      await db.levels.delete(level.id);

      const remainingLevels = await db.levels
        .where('projectId')
        .equals(level.projectId)
        .sortBy('sortOrder');
      remainingLevels.forEach((item, index) => (item.sortOrder = index));
      if (remainingLevels.length) await db.levels.bulkPut(remainingLevels);
      await db.projects.update(level.projectId, { updatedAt: now() });
    },
  );
}

export async function deleteProject(projectId: string): Promise<void> {
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
      await Promise.all([
        db.measurements.where('projectId').equals(projectId).delete(),
        db.hotspots.where('projectId').equals(projectId).delete(),
        db.photos.where('projectId').equals(projectId).delete(),
        db.floorplans.where('projectId').equals(projectId).delete(),
        db.areas.where('projectId').equals(projectId).delete(),
        db.levels.where('projectId').equals(projectId).delete(),
      ]);
      await db.projects.delete(projectId);
    },
  );
}
