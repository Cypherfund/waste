import client from './client';
import type { LoginRequest, AuthResponse } from '../../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  logout: () => client.post('/auth/logout').then((r) => r.data),
};
