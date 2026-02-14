export interface ProjectInfo {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

let activeProject: ProjectInfo | null = null;

export function getActiveProject(): ProjectInfo | null {
  return activeProject;
}

export function setActiveProject(project: ProjectInfo): void {
  activeProject = project;
  try {
    localStorage.setItem('activeProjectId', project.id);
  } catch {
    // localStorage not available
  }
}
