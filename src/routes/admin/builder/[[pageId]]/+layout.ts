// Inherit from admin layout for authentication
export const load = async ({ parent }) => {
  await parent();
  return {};
};
