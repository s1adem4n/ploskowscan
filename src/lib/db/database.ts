import Dexie, { type EntityTable } from 'dexie';

import type { StoredFloorplan, StoredPhoto } from '@/lib/db/media';
import type {
  Area,
  FloorplanHotspot,
  Level,
  Measurement,
  Project,
} from '@/lib/types/project';

class PloskowScanDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  levels!: EntityTable<Level, 'id'>;
  areas!: EntityTable<Area, 'id'>;
  photos!: EntityTable<StoredPhoto, 'id'>;
  measurements!: EntityTable<Measurement, 'id'>;
  floorplans!: EntityTable<StoredFloorplan, 'id'>;
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
