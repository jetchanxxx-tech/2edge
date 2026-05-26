// API response types

export interface ApiResponse<T = unknown> {
  data: T | null;
  message: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  message: string;
}

export interface UserProfile {
  id: number;
  email: string;
  uuid: string;
  token: string;
  is_admin: number;
  banned: number;
  transfer_enable: number;
  u: number;
  d: number;
  speed_limit: number | null;
  expired_at: number | null;
  last_login_at: number | null;
  created_at: number;
}

export interface TrafficEntry {
  u: number;
  d: number;
  recorded_at: number;
}

export interface AdminAuditEntry {
  id: number;
  admin_id: number;
  admin_email?: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  details: string | null;
  ip: string | null;
  created_at: number;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  banned_users: number;
  total_traffic_u: number;
  total_traffic_d: number;
  recent_registrations: number;
}
