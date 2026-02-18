import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { projects } = await parent();

  const activeProjectId = projects[0]?.id ?? '';

  return {
    activeProjectId
  };
};
