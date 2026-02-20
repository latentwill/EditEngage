import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent, url }) => {
  const { projects } = await parent();
  const activeProjectId = projects[0]?.id ?? '';

  return {
    projectId: activeProjectId,
    currentPath: url.pathname,
  };
};
