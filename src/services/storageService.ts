import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'

/**
 * 파일을 Firebase Storage에 업로드
 */
export const uploadFile = async (
  file: File,
  folder: string = 'chat'
): Promise<string> => {
  try {
    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`
    const storageRef = ref(storage, `${folder}/${fileName}`)

    // 파일 업로드
    await uploadBytes(storageRef, file)

    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  } catch (error) {
    console.error('파일 업로드 오류:', error)
    throw error
  }
}

/**
 * 이미지 파일인지 확인
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/')
}

/**
 * 동영상 파일인지 확인
 */
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/')
}

/**
 * 파일 크기 제한 확인 (기본 50MB)
 */
export const checkFileSize = (file: File, maxSizeMB: number = 50): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

/**
 * 파일 삭제
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    const fileRef = ref(storage, fileUrl)
    await deleteObject(fileRef)
  } catch (error) {
    console.error('파일 삭제 오류:', error)
    throw error
  }
}

