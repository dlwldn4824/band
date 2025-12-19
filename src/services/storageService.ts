import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'

/**
 * 이미지 압축 및 리사이즈
 */
export const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // 비율 유지하면서 리사이즈
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = (height * maxWidth) / width
            width = maxWidth
          } else {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context를 가져올 수 없습니다.'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 압축에 실패했습니다.'))
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          },
          file.type,
          quality
        )
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 파일을 Firebase Storage에 업로드
 */
export const uploadFile = async (
  file: File,
  folder: string = 'chat',
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    let fileToUpload = file

    // 이미지 파일인 경우 압축
    if (isImageFile(file)) {
      try {
        fileToUpload = await compressImage(file, 1920, 1920, 0.8)
        console.log(`이미지 압축: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`)
      } catch (error) {
        console.warn('이미지 압축 실패, 원본 파일 사용:', error)
        fileToUpload = file
      }
    }

    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now()
    const fileName = `${timestamp}_${fileToUpload.name}`
    const storageRef = ref(storage, `${folder}/${fileName}`)

    // 파일 업로드
    await uploadBytes(storageRef, fileToUpload)
    if (onProgress) onProgress(100)

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

