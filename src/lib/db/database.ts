import Dexie, { type EntityTable } from 'dexie';

import type {
  Area,
  Floorplan,
  FloorplanHotspot,
  Level,
  Measurement,
  Photo,
  Project,
} from '@/lib/types/project';

class PloskowScanDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  levels!: EntityTable<Level, 'id'>;
  areas!: EntityTable<Area, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  measurements!: EntityTable<Measurement, 'id'>;
  floorplans!: EntityTable<Floorplan, 'id'>;
  hotspots!: EntityTable<FloorplanHotspot, 'id'>;

  constructor() {
    super('ploskowscan');
    this.version(1).stores({
      projects: 'id, updatedAt',
      levels: 'id, projectId, [projectId+sortOrder]',
      areas: 'id, projectId, levelId, [levelId+sortOrder]',
      photos: 'id, projectId, areaId, [areaId+sortOrder]',
      measurements: 'id, projectId, photoId, createdAt',
      floorplans: 'id, projectId, &levelId',
      hotspots: 'id, projectId, floorplanId, areaId',
    });
  }
}

export const db = new PloskowScanDatabase();
