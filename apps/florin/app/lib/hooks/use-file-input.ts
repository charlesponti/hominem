import { useCallback, useState } from 'react'

export function useFileInput() {
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = useCallback((files: File[]) => {
    const newFiles = Array.from(files)

    // Append new files to existing ones, preventing duplicates by name
    setFiles((prevFiles) => {
      const existingFileNames = new Set(prevFiles.map((f) => f.name))
      const filesToAdd = newFiles.filter((file) => !existingFileNames.has(file.name))
      return [...prevFiles, ...filesToAdd]
    })
  }, [])

  const removeFile = useCallback((fileName: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName))
  }, [])

  const resetFiles = useCallback(() => {
    setFiles([])
  }, [])

  return {
    files,
    handleFileChange,
    removeFile,
    resetFiles,
  }
}
