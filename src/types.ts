export type StoryStatus = "idea" | "planned" | "doing" | "done";
export type StoryColor = "lavender" | "blue" | "yellow" | "green";
export type TaskColor = StoryColor | "pink" | "orange";

export interface Story {
  id: string;
  title: string;
  activityId: string;
  taskId: string;
  releaseId: string;
  description: string;
  status: StoryStatus;
  priority: "low" | "medium" | "high";
  estimate: number;
  tags: string[];
  notePath?: string;
  attachments?: TaskAttachment[];
  color: StoryColor;
  roleId?: string;
}

export interface TaskAttachment { path: string; kind: "reference" | "dependency"; }
export interface Task { id: string; title: string; activityId: string; description?: string; attachments?: TaskAttachment[]; color?: TaskColor; }
export interface Activity { id: string; title: string; description?: string; attachments?: TaskAttachment[]; }
export interface Release { id: string; title: string; subtitle: string; }
export interface Role { id: string; name: string; description: string; }

export interface StoryMapData {
  archived?: boolean;
  version: 1;
  title: string;
  zoom: number;
  activities: Activity[];
  tasks: Task[];
  releases: Release[];
  roles: Role[];
  stories: Story[];
}
