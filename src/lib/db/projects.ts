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
