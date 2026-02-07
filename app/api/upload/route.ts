import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { payrollBatches, uploadedFiles } from '@/lib/schema'
import { splitPdfToPages } from '@/lib/pdf'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'לא נבחרו קבצים' }, { status: 400 })
    }

    let totalPages = 0
    const fileDataArray: Array<{ fileName: string; base64: string; mimeType: string; pageCount: number }> = []

    for (const file of files) {
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')

      if (file.type === 'application/pdf') {
        const pages = await splitPdfToPages(buffer)
        totalPages += pages.length
        fileDataArray.push({
          fileName: file.name,
          base64,
          mimeType: file.type,
          pageCount: pages.length,
        })
      } else {
        totalPages += 1
        fileDataArray.push({
          fileName: file.name,
          base64,
          mimeType: file.type,
          pageCount: 1,
        })
      }
    }

    const now = new Date()
    const [batch] = await db
      .insert(payrollBatches)
      .values({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        fileName: files.map((f) => f.name).join(', '),
        status: 'processing',
      })
      .returning()

    for (const fileData of fileDataArray) {
      await db.insert(uploadedFiles).values({
        batchId: batch.id,
        fileName: fileData.fileName,
        fileData: fileData.base64,
        mimeType: fileData.mimeType,
      })
    }

    return NextResponse.json({
      batchId: batch.id,
      pageCount: totalPages,
      fileCount: files.length,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'שגיאה בהעלאת הקבצים' },
      { status: 500 }
    )
  }
}
