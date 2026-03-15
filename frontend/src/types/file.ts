// src/types/file.ts
export interface FileData {
  id: string
  name: string
  path: string
  fullPath?: string
  size?: string
  ext?: string
  type?: 'video' | 'image' | 'folder'
}
