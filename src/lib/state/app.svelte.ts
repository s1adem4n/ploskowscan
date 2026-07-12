import { db } from '@/lib/db/database';
import type {
  Area,
  Floorplan,
  FloorplanHotspot,
  Level,
  Measurement,
  Photo,
  Project,
} from '@/lib/types/project';

export type AppView = 'floorplan' | 'area';

export class AppState {
  projects = $state<Project[]>([]);
  levels = $state<Level[]>([]);
  areas = $state<Area[]>([]);
  photos = $state<Photo[]>([]);
  measurements = $state<Measurement[]>([]);
  floorplans = $state<Floorplan[]>([]);
  hotspots = $state<FloorplanHotspot[]>([]);
  projectId = $state<string | null>(null);
  levelId = $state<string | null>(null);
  areaId = $state<string | null>(null);
  view = $state<AppView>('floorplan');
  editing = $state(false);
  loading = $state(true);

  get project(): Project | undefined {
    return this.projects.find((item) => item.id === this.projectId);
  }
  get level(): Level | undefined {
    return this.levels.find((item) => item.id === this.levelId);
  }
  get area(): Area | undefined {
    return this.areas.find((item) => item.id === this.areaId);
  }
  get projectLevels(): Level[] {
    return this.levels
      .filter((item) => item.projectId === this.projectId)
      .sort(byOrder);
  }
  get levelAreas(): Area[] {
    return this.areas
      .filter((item) => item.levelId === this.levelId)
      .sort(byOrder);
  }
  get areaPhotos(): Photo[] {
    return this.photos
      .filter((item) => item.areaId === this.areaId)
      .sort(byOrder);
  }
  get levelFloorplan(): Floorplan | undefined {
    return this.floorplans.find((item) => item.levelId === this.levelId);
  }

  async load(preferredProjectId?: string): Promise<void> {
    const previousProjectId = this.projectId;
    const [
      projects,
      levels,
      areas,
      photos,
      measurements,
      floorplans,
      hotspots,
    ] = await Promise.all([
      db.projects.orderBy('updatedAt').reverse().toArray(),
      db.levels.toArray(),
      db.areas.toArray(),
      db.photos.toArray(),
      db.measurements.toArray(),
      db.floorplans.toArray(),
      db.hotspots.toArray(),
    ]);
    this.projects = projects;
    this.levels = levels;
    this.areas = areas;
    this.photos = photos;
    this.measurements = measurements;
    this.floorplans = floorplans;
    this.hotspots = hotspots;

    const projectId = preferredProjectId ?? this.projectId;
    this.projectId = projects.some((item) => item.id === projectId)
      ? projectId
      : (projects[0]?.id ?? null);
    if (this.projectId !== previousProjectId) {
      this.levelId = null;
      this.areaId = null;
      this.view = 'floorplan';
    }
    this.ensureSelection();
    this.loading = false;
  }

  selectProject(id: string): void {
    this.projectId = id;
    this.levelId = this.projectLevels[0]?.id ?? null;
    this.areaId = null;
    this.view = 'floorplan';
  }

  selectLevel(id: string): void {
    this.levelId = id;
    this.areaId = null;
    this.view = 'floorplan';
  }

  selectArea(id: string): void {
    this.areaId = id;
    this.view = 'area';
  }

  private ensureSelection(): void {
    const levels = this.projectLevels;
    if (!levels.some((item) => item.id === this.levelId))
      this.levelId = levels[0]?.id ?? null;
    if (this.view === 'area') {
      const areas = this.levelAreas;
      if (!areas.some((item) => item.id === this.areaId)) {
        this.areaId = null;
        this.view = 'floorplan';
      }
    } else {
      this.areaId = null;
    }
  }
}

function byOrder<T extends { sortOrder: number }>(a: T, b: T): number {
  return a.sortOrder - b.sortOrder;
}

export const appState = new AppState();
