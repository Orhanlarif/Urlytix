export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  message: string;
  accessToken: string;
  user: AuthUser;
};