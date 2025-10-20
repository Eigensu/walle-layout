import apiClient from '../client';

export interface UserSummary {
  user_id: string;
  username: string;
  full_name?: string | null;
  team_count: number;
}

export interface UsersWithTeamsResponse {
  users: UserSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminUserTeamsResponse {
  user: { user_id: string; username: string; full_name?: string | null };
  teams: Array<{
    team_id: string;
    team_name: string;
    total_points: number;
    created_at: string;
    enrolled?: boolean | null;
    enrollment_id?: string | null;
  }>;
  total: number;
  page: number;
  page_size: number;
}

export const adminUsersApi = {
  usersWithTeams: async (params?: { page?: number; page_size?: number; search?: string }): Promise<UsersWithTeamsResponse> => {
    const response = await apiClient.get('/api/admin/users-with-teams', { params });
    return response.data;
  },
  getUserTeams: async (userId: string, params?: { contest_id?: string; page?: number; page_size?: number }): Promise<AdminUserTeamsResponse> => {
    const response = await apiClient.get(`/api/admin/users/${userId}/teams`, { params });
    return response.data;
  },
};
