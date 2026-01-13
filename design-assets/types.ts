
export enum Screen {
  Dashboard = 'DASHBOARD',
  Processing = 'PROCESSING',
  Downloader = 'DOWNLOADER',
  Library = 'LIBRARY'
}

export interface Asset {
  id: string;
  name: string;
  status: 'Processing' | 'Ready' | 'Completed' | 'Failed' | 'Paused';
  progress: number;
  size: string;
  type: 'video' | 'audio' | 'document' | 'image';
  timeLeft?: string;
}

export interface Task {
  id: string;
  identifier: string;
  category: string;
  status: 'COMPLETED' | 'IN PROGRESS' | 'ARCHIVED' | 'FAILED';
  modifiedAt: string;
  duration: string;
}
