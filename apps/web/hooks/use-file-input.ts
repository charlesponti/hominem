import { useState, type ChangeEvent } from 'react'

export function useFileInput() {
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  return { files, handleFileChange }
}
