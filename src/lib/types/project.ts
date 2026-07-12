export type Id = string;

export type AreaKind = 'room' | 'outside' | 'other';

export interface Project {
  id: Id;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Level {
  id: Id;
  projectId: Id;
  name: string;
  sortOrder: number;
}

export interface Area {
  id: Id;
  projectId: Id;
  levelId: Id;
  name: string;
  kind: AreaKind;
  sortOrder: number;
}

export interface Photo {
  id: Id;
  projectId: Id;
  areaId: Id;
  title: string;
  blob: Blob;
  createdAt: string;
  sortOrder: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Measurement {
  id: Id;
  projectId: Id;
  photoId: Id;
  start: Point;
  end: Point;
  value: string;
  note: string;
  createdAt: string;
}

export interface Floorplan {
  id: Id;
  projectId: Id;
  levelId: Id;
  blob: Blob;
  updatedAt: string;
}

export interface FloorplanHotspot {
  id: Id;
  projectId: Id;
  floorplanId: Id;
  areaId: Id;
  position: Point;
}

export interface ProjectBundle {
  format: 'ploskowscan';
  version: 1;
  exportedAt: string;
  project: Project;
  levels: Level[];
  areas: Area[];
  photos: Omit<Photo, 'blob'>[];
  measurements: Measurement[];
  floorplans: Omit<Floorplan, 'blob'>[];
  hotspots: FloorplanHotspot[];
}
