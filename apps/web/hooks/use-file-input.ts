import { useCallback, useState, type ChangeEvent } from 'react'

export function useFileInput() {
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return

    const filesArray = Array.from(fileList)
    setFiles(filesArray)
  }, [])

  const resetFiles = useCallback(() => {
    setFiles([])
  }, [])

  return {
    files,
    handleFileChange,
    resetFiles,
  }
}
