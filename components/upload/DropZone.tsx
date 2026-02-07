'use client'

import { useCallback, useState, useRef } from 'react'

type DropZoneProps = {
  onUpload: (files: File[]) => void
  uploading: boolean
}

export function DropZone({ onUpload, uploading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files).filter(
        (f) =>
          f.type === 'application/pdf' ||
          f.type.startsWith('image/')
      )
      if (files.length > 0) onUpload(files)
    },
    [onUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) onUpload(files)
    },
    [onUpload]
  )

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
        }
        ${uploading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="text-5xl mb-4">📄</div>
      <p className="text-lg font-medium text-gray-900 mb-2">
        {uploading ? 'מעלה קבצים...' : 'גרור קבצים לכאן או לחץ לבחירה'}
      </p>
      <p className="text-sm text-gray-500">
        קבצי PDF (תלושי שכר מרוכזים) או תמונות (תלושים בודדים)
      </p>
      <p className="text-xs text-gray-400 mt-2">
        PDF, JPG, PNG — ניתן להעלות מספר קבצים בו-זמנית
      </p>
    </div>
  )
}
