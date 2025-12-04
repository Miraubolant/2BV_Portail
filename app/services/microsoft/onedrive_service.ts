import microsoftOAuthService from './microsoft_oauth_service.js'

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

export interface DriveItem {
  id: string
  name: string
  size?: number
  webUrl?: string
  '@microsoft.graph.downloadUrl'?: string
  folder?: { childCount: number }
  file?: { mimeType: string }
  createdDateTime?: string
  lastModifiedDateTime?: string
  parentReference?: {
    driveId: string
    id: string
    path: string
  }
}

interface UploadSession {
  uploadUrl: string
  expirationDateTime: string
}

export interface FolderCreateResult {
  success: boolean
  folderId?: string
  folderPath?: string
  webUrl?: string
  error?: string
}

export interface FileUploadResult {
  success: boolean
  fileId?: string
  webUrl?: string
  downloadUrl?: string
  error?: string
}

export interface FileDownloadResult {
  success: boolean
  content?: ArrayBuffer
  mimeType?: string
  error?: string
}

class OneDriveService {
  /**
   * Get authenticated headers for API calls
   */
  private async getHeaders(): Promise<Headers | null> {
    const accessToken = await microsoftOAuthService.getValidAccessToken()
    if (!accessToken) {
      return null
    }

    const headers = new Headers()
    headers.set('Authorization', `Bearer ${accessToken}`)
    headers.set('Content-Type', 'application/json')
    return headers
  }

  /**
   * Check if OneDrive is connected and ready
   */
  async isReady(): Promise<boolean> {
    const accessToken = await microsoftOAuthService.getValidAccessToken()
    return accessToken !== null
  }

  /**
   * Get root folder or specific folder info
   */
  async getFolderInfo(folderId?: string): Promise<DriveItem | null> {
    const headers = await this.getHeaders()
    if (!headers) return null

    const endpoint = folderId
      ? `${GRAPH_API_BASE}/me/drive/items/${folderId}`
      : `${GRAPH_API_BASE}/me/drive/root`

    const response = await fetch(endpoint, { headers })

    if (!response.ok) {
      console.error('Failed to get folder info:', await response.text())
      return null
    }

    return await response.json() as DriveItem
  }

  /**
   * List items in a folder
   */
  async listFolder(folderId?: string): Promise<DriveItem[]> {
    const headers = await this.getHeaders()
    if (!headers) return []

    const endpoint = folderId
      ? `${GRAPH_API_BASE}/me/drive/items/${folderId}/children`
      : `${GRAPH_API_BASE}/me/drive/root/children`

    const response = await fetch(endpoint, { headers })

    if (!response.ok) {
      console.error('Failed to list folder:', await response.text())
      return []
    }

    const data = await response.json() as { value?: DriveItem[] }
    return data.value || []
  }

  /**
   * Get or create the root folder for the application
   * Creates: /Portail Cabinet/
   */
  async getOrCreateRootFolder(rootFolderName: string = 'Portail Cabinet'): Promise<FolderCreateResult> {
    const headers = await this.getHeaders()
    if (!headers) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if folder already exists
    const existingItems = await this.listFolder()
    const existing = existingItems.find(item =>
      item.name.toLowerCase() === rootFolderName.toLowerCase() && item.folder
    )

    if (existing) {
      return {
        success: true,
        folderId: existing.id,
        folderPath: `/${rootFolderName}`,
        webUrl: existing.webUrl,
      }
    }

    // Create the folder
    const response = await fetch(`${GRAPH_API_BASE}/me/drive/root/children`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: rootFolderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create root folder:', error)
      return { success: false, error }
    }

    const folder = await response.json() as DriveItem
    return {
      success: true,
      folderId: folder.id,
      folderPath: `/${rootFolderName}`,
      webUrl: folder.webUrl,
    }
  }

  /**
   * Create a folder within a parent folder
   */
  async createFolder(parentFolderId: string, folderName: string): Promise<FolderCreateResult> {
    const headers = await this.getHeaders()
    if (!headers) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if folder already exists
    const existingItems = await this.listFolder(parentFolderId)
    const existing = existingItems.find(item =>
      item.name.toLowerCase() === folderName.toLowerCase() && item.folder
    )

    if (existing) {
      return {
        success: true,
        folderId: existing.id,
        webUrl: existing.webUrl,
      }
    }

    const response = await fetch(`${GRAPH_API_BASE}/me/drive/items/${parentFolderId}/children`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create folder:', error)
      return { success: false, error }
    }

    const folder = await response.json() as DriveItem
    return {
      success: true,
      folderId: folder.id,
      webUrl: folder.webUrl,
    }
  }

  /**
   * Create folder by path (creates intermediate folders if needed)
   * Example: /Portail Cabinet/Clients/Dupont Jean/Dossier 2024-001
   */
  async createFolderByPath(path: string): Promise<FolderCreateResult> {
    const headers = await this.getHeaders()
    if (!headers) {
      return { success: false, error: 'Not authenticated' }
    }

    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    // Try to create the folder directly using the path
    const response = await fetch(`${GRAPH_API_BASE}/me/drive/root:${normalizedPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    })

    // If 409 conflict, folder might exist - try to get it
    if (response.status === 409) {
      const getResponse = await fetch(`${GRAPH_API_BASE}/me/drive/root:${normalizedPath}`, { headers })
      if (getResponse.ok) {
        const folder = await getResponse.json() as DriveItem
        return {
          success: true,
          folderId: folder.id,
          folderPath: normalizedPath,
          webUrl: folder.webUrl,
        }
      }
    }

    if (!response.ok) {
      // Folder might not exist - create parent folders recursively
      const parts = normalizedPath.split('/').filter(Boolean)
      let currentPath = ''
      let lastFolderId = ''

      for (const part of parts) {
        currentPath += `/${part}`

        // Check if exists
        const checkResponse = await fetch(`${GRAPH_API_BASE}/me/drive/root:${currentPath}`, { headers })

        if (checkResponse.ok) {
          const folder = await checkResponse.json() as DriveItem
          lastFolderId = folder.id
        } else {
          // Create the folder
          const parentEndpoint = currentPath === `/${part}`
            ? `${GRAPH_API_BASE}/me/drive/root/children`
            : `${GRAPH_API_BASE}/me/drive/items/${lastFolderId}/children`

          const createResponse = await fetch(parentEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: part,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'fail',
            }),
          })

          if (!createResponse.ok) {
            const error = await createResponse.text()
            console.error(`Failed to create folder ${part}:`, error)
            return { success: false, error }
          }

          const folder = await createResponse.json() as DriveItem
          lastFolderId = folder.id
        }
      }

      // Get final folder info
      const finalResponse = await fetch(`${GRAPH_API_BASE}/me/drive/items/${lastFolderId}`, { headers })
      if (finalResponse.ok) {
        const folder = await finalResponse.json() as DriveItem
        return {
          success: true,
          folderId: folder.id,
          folderPath: normalizedPath,
          webUrl: folder.webUrl,
        }
      }

      return { success: true, folderId: lastFolderId, folderPath: normalizedPath }
    }

    const folder = await response.json() as DriveItem
    return {
      success: true,
      folderId: folder.id,
      folderPath: normalizedPath,
      webUrl: folder.webUrl,
    }
  }

  /**
   * Upload a small file (< 4MB) directly
   */
  async uploadSmallFile(
    parentFolderId: string,
    fileName: string,
    content: Buffer | ArrayBuffer,
    mimeType: string
  ): Promise<FileUploadResult> {
    const accessToken = await microsoftOAuthService.getValidAccessToken()
    if (!accessToken) {
      return { success: false, error: 'Not authenticated' }
    }

    const headers = new Headers()
    headers.set('Authorization', `Bearer ${accessToken}`)
    headers.set('Content-Type', mimeType)

    const response = await fetch(
      `${GRAPH_API_BASE}/me/drive/items/${parentFolderId}:/${fileName}:/content`,
      {
        method: 'PUT',
        headers,
        body: content,
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to upload file:', error)
      return { success: false, error }
    }

    const file = await response.json() as DriveItem
    return {
      success: true,
      fileId: file.id,
      webUrl: file.webUrl,
      downloadUrl: file['@microsoft.graph.downloadUrl'],
    }
  }

  /**
   * Create an upload session for large files (> 4MB)
   */
  async createUploadSession(
    parentFolderId: string,
    fileName: string
  ): Promise<UploadSession | null> {
    const headers = await this.getHeaders()
    if (!headers) return null

    const response = await fetch(
      `${GRAPH_API_BASE}/me/drive/items/${parentFolderId}:/${fileName}:/createUploadSession`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('Failed to create upload session:', await response.text())
      return null
    }

    return await response.json() as UploadSession
  }

  /**
   * Upload a large file using upload session
   */
  async uploadLargeFile(
    parentFolderId: string,
    fileName: string,
    content: Buffer,
    _mimeType: string
  ): Promise<FileUploadResult> {
    const session = await this.createUploadSession(parentFolderId, fileName)
    if (!session) {
      return { success: false, error: 'Failed to create upload session' }
    }

    const chunkSize = 320 * 1024 * 10 // 3.2MB chunks
    const totalSize = content.length
    let start = 0

    while (start < totalSize) {
      const end = Math.min(start + chunkSize, totalSize)
      const chunk = content.subarray(start, end)

      const response = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': chunk.length.toString(),
          'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
        },
        body: chunk,
      })

      if (!response.ok && response.status !== 202) {
        const error = await response.text()
        console.error('Failed to upload chunk:', error)
        return { success: false, error }
      }

      // If upload is complete (status 200 or 201)
      if (response.status === 200 || response.status === 201) {
        const file = await response.json() as DriveItem
        return {
          success: true,
          fileId: file.id,
          webUrl: file.webUrl,
          downloadUrl: file['@microsoft.graph.downloadUrl'],
        }
      }

      start = end
    }

    return { success: false, error: 'Upload did not complete' }
  }

  /**
   * Upload a file (auto-selects small or large file upload)
   */
  async uploadFile(
    parentFolderId: string,
    fileName: string,
    content: Buffer,
    mimeType: string
  ): Promise<FileUploadResult> {
    const SMALL_FILE_LIMIT = 4 * 1024 * 1024 // 4MB

    if (content.length < SMALL_FILE_LIMIT) {
      return this.uploadSmallFile(parentFolderId, fileName, content, mimeType)
    } else {
      return this.uploadLargeFile(parentFolderId, fileName, content, mimeType)
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string): Promise<FileDownloadResult> {
    const headers = await this.getHeaders()
    if (!headers) {
      return { success: false, error: 'Not authenticated' }
    }

    // First get the download URL
    const infoResponse = await fetch(`${GRAPH_API_BASE}/me/drive/items/${fileId}`, { headers })

    if (!infoResponse.ok) {
      return { success: false, error: 'File not found' }
    }

    const fileInfo = await infoResponse.json() as DriveItem
    const downloadUrl = fileInfo['@microsoft.graph.downloadUrl']

    if (!downloadUrl) {
      return { success: false, error: 'No download URL available' }
    }

    // Download the content
    const downloadResponse = await fetch(downloadUrl)

    if (!downloadResponse.ok) {
      return { success: false, error: 'Failed to download file' }
    }

    const content = await downloadResponse.arrayBuffer()
    return {
      success: true,
      content,
      mimeType: fileInfo.file?.mimeType,
    }
  }

  /**
   * Get file info including download URL
   */
  async getFileInfo(fileId: string): Promise<DriveItem | null> {
    const headers = await this.getHeaders()
    if (!headers) return null

    const response = await fetch(`${GRAPH_API_BASE}/me/drive/items/${fileId}`, { headers })

    if (!response.ok) {
      return null
    }

    return await response.json() as DriveItem
  }

  /**
   * Delete a file or folder
   */
  async deleteItem(itemId: string): Promise<boolean> {
    const headers = await this.getHeaders()
    if (!headers) return false

    const response = await fetch(`${GRAPH_API_BASE}/me/drive/items/${itemId}`, {
      method: 'DELETE',
      headers,
    })

    return response.ok || response.status === 204
  }

  /**
   * Move a file or folder
   */
  async moveItem(itemId: string, newParentFolderId: string, newName?: string): Promise<boolean> {
    const headers = await this.getHeaders()
    if (!headers) return false

    const body: Record<string, unknown> = {
      parentReference: { id: newParentFolderId },
    }

    if (newName) {
      body.name = newName
    }

    const response = await fetch(`${GRAPH_API_BASE}/me/drive/items/${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })

    return response.ok
  }

  /**
   * Rename a file or folder
   */
  async renameItem(itemId: string, newName: string): Promise<boolean> {
    const headers = await this.getHeaders()
    if (!headers) return false

    const response = await fetch(`${GRAPH_API_BASE}/me/drive/items/${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: newName }),
    })

    return response.ok
  }

  /**
   * Get thumbnails for a file
   * Returns small, medium, and large thumbnail URLs
   */
  async getThumbnails(fileId: string): Promise<{
    small?: string
    medium?: string
    large?: string
  } | null> {
    const headers = await this.getHeaders()
    if (!headers) return null

    const response = await fetch(
      `${GRAPH_API_BASE}/me/drive/items/${fileId}/thumbnails`,
      { headers }
    )

    if (!response.ok) {
      return null
    }

    interface ThumbnailSet {
      small?: { url?: string }
      medium?: { url?: string }
      large?: { url?: string }
    }

    const data = await response.json() as { value?: ThumbnailSet[] }
    const thumbnails = data.value?.[0]

    if (!thumbnails) return null

    return {
      small: thumbnails.small?.url,
      medium: thumbnails.medium?.url,
      large: thumbnails.large?.url,
    }
  }
}

export default new OneDriveService()
