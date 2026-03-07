import request from './request'

export interface LoginData {
  username: string
  password: string
}

export interface UserResponse {
  id: string
  username: string
  createdAt?: string
}

export interface AuthResponse {
  message: string
  token: string
  user: UserResponse
}

// 用户相关 API
export const authApi = {
  login: (data: LoginData): Promise<AuthResponse> => request.post('/auth/login', data) as Promise<AuthResponse>,
  register: (data: LoginData): Promise<AuthResponse> => request.post('/auth/register', data) as Promise<AuthResponse>,
  getProfile: (): Promise<UserResponse> => request.get('/users/profile') as Promise<UserResponse>,
  updateProfile: (data: Partial<UserResponse>): Promise<UserResponse> => request.put('/users/profile', data) as Promise<UserResponse>
}

// 媒体库 API
export const mediaApi = {
  getFolders: (path: string, library?: number) => request.get(`/media/folders?path=${path}&library=${library || 0}`),
  uploadFile: (formData: FormData) => request.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (id: string) => request.delete(`/media/${id}`),
  updateMeta: (id: string, data: any) => request.put(`/media/${id}/meta`, data),
  search: (query: string) => request.get(`/media/search?q=${query}`)
}

// 播放器 API
export const playerApi = {
  getStream: (id: string) => `${import.meta.env.BASE_URL}api/stream/${id}`,
  updateProgress: (id: string, progress: number) => request.put(`/progress/${id}`, { progress }),
  getSubtitles: (id: string) => request.get(`/subtitles/${id}`)
}
