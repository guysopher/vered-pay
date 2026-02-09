'use client'

import { useState, useCallback, useEffect } from 'react'
import { DropZone } from '@/components/upload/DropZone'
import { ReviewTable } from '@/components/upload/ReviewTable'
import { ReviewModal } from '@/components/upload/ReviewModal'

type ValidationIssue = {
  severity: 'error' | 'warning' | 'info'
  field: string
  message: string
}

type ExtractedRecord = {
  id: string
  pageNumber: number
  employee: {
    name: string
    nationalId: string
    department: string | null
    role: string | null
    startDate: string | null
    maritalStatus: string | null
    taxCreditPoints: number | null
    bankAccount: string | null
    bankBranch: string | null
  }
  payroll: {
    month: number
    year: number
    grossSalary: number | null
    netSalary: number | null
    totalDeductions: number | null
    workDays: number | null
    workHours: number | null
    hourlyRate: number | null
    overtimeHours: number | null
    vacationDays: number | null
    sickDays: number | null
    vacationBalance: number | null
    bankTransferAmount: number | null
  }
  earnings: Array<{ name: string; quantity: number | null; rate: number | null; percent: number | null; amount: number }>
  deductions: Array<{ name: string; quantity: number | null; rate: number | null; percent: number | null; amount: number }>
  benefits: Array<{ name: string; quantity: number | null; rate: number | null; percent: number | null; amount: number }>
  issues: ValidationIssue[]
  status: 'pending' | 'approved' | 'skipped'
}

export default function UploadPage() {
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [batchId, setBatchId] = useState<string | null>(null)
  const [records, setRecords] = useState<ExtractedRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<ExtractedRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('שגיאה בהעלאת הקובץ')
      }

      const { batchId: newBatchId, pageCount } = await uploadRes.json()
      setBatchId(newBatchId)
      setUploading(false)
      setExtracting(true)
      setProgress({ current: 0, total: pageCount })

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: newBatchId }),
      })

      if (!extractRes.ok) {
        throw new Error('שגיאה בחילוץ הנתונים')
      }

      const reader = extractRes.body?.getReader()
      const decoder = new TextDecoder()
      const extractedRecords: ExtractedRecord[] = []

      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'progress') {
                  setProgress({ current: data.current, total: data.total })
                } else if (data.type === 'result') {
                  extractedRecords.push({
                    ...data.record,
                    issues: data.issues || [],
                    status: 'pending',
                  })
                  setRecords([...extractedRecords])
                } else if (data.type === 'error') {
                  console.error('Extraction error for page:', data.page, data.error)
                }
              } catch {
                // skip invalid JSON lines
              }
            }
          }
        }
      }

      setExtracting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
      setUploading(false)
      setExtracting(false)
    }
  }, [])

  const handleApprove = useCallback(async (record: ExtractedRecord) => {
    try {
      const res = await fetch('/api/payrolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          record,
        }),
      })

      if (!res.ok) throw new Error('שגיאה בשמירת הנתונים')

      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id ? { ...r, status: 'approved' as const } : r
        )
      )
      setSelectedRecord(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה')
    }
  }, [batchId])

  const handleApproveAll = useCallback(async () => {
    const pendingRecords = records.filter((r) => r.status === 'pending')

    for (const record of pendingRecords) {
      await handleApprove(record)
    }
  }, [records, handleApprove])

  const handleSkip = useCallback((recordId: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, status: 'skipped' as const } : r
      )
    )
    setSelectedRecord(null)
  }, [])

  const handleUpdateRecord = useCallback((updatedRecord: ExtractedRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
    )
    setSelectedRecord(updatedRecord)
  }, [])

  const pendingCount = records.filter((r) => r.status === 'pending').length
  const approvedCount = records.filter((r) => r.status === 'approved').length
  const issueCount = records.reduce((sum, r) => sum + (r.issues?.filter((i) => i.severity === 'error' || i.severity === 'warning').length || 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">העלאת תלושי שכר</h1>

      {/* Upload Zone */}
      {records.length === 0 && !extracting && (
        <DropZone onUpload={handleUpload} uploading={uploading} />
      )}

      {/* Progress */}
      {extracting && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">מחלץ נתונים מהתלושים...</p>
          <p className="text-gray-500">
            עמוד {progress.current} מתוך {progress.total}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4 max-w-md mx-auto">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-6 py-4 rounded-xl mb-6">
          {error}
          <button
            onClick={() => setError(null)}
            className="mr-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Review */}
      {records.length > 0 && !extracting && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {approvedCount} מאושרים | {pendingCount} ממתינים
                {issueCount > 0 && (
                  <span className="text-red-600 font-medium mr-2">
                    | {issueCount} ממצאים
                  </span>
                )}
              </span>
            </div>
            {pendingCount > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleApproveAll}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  אשר הכל ({pendingCount})
                </button>
                <button
                  onClick={() => {
                    setRecords([])
                    setBatchId(null)
                  }}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                >
                  העלאה חדשה
                </button>
              </div>
            )}
          </div>

          <ReviewTable
            records={records}
            onSelect={(record) => setSelectedRecord(record as ExtractedRecord)}
          />
        </div>
      )}

      {/* Review Modal */}
      {selectedRecord && (
        <ReviewModal
          record={selectedRecord}
          onApprove={handleApprove}
          onSkip={() => handleSkip(selectedRecord.id)}
          onUpdate={handleUpdateRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  )
}
