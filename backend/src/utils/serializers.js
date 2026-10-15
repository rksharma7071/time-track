export const toPublicUser = (user) =>
  user && {
    id: String(user._id ?? user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    managerId: user.managerId ?? null,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt,
  };
