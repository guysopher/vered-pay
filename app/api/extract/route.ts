import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { uploadedFiles, payrollBatches } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { splitPdfToPages, pdfPageToBase64 } from '@/lib/pdf'
import { extractPayslipData, validatePayslipData } from '@/lib/claude'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const { batchId } = await request.json()

  const files = await db
    .select()
    .from(uploadedFiles)
    .where(eq(uploadedFiles.batchId, batchId))

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let pageIndex = 0
      let totalPages = 0

      // Calculate total pages
      for (const file of files) {
        if (file.mimeType === 'application/pdf') {
          const buffer = Buffer.from(file.fileData, 'base64')
          const pages = await splitPdfToPages(buffer.buffer)
          totalPages += pages.length
        } else {
          totalPages += 1
        }
      }

      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      for (const file of files) {
        if (file.mimeType === 'application/pdf') {
          const buffer = Buffer.from(file.fileData, 'base64')
          const pages = await splitPdfToPages(buffer.buffer)

          for (let i = 0; i < pages.length; i++) {
            pageIndex++
            send({ type: 'progress', current: pageIndex, total: totalPages })

            try {
              const pageBase64 = pdfPageToBase64(pages[i])
              const result = await extractPayslipData(pageBase64, 'image/png')
              const validation = await validatePayslipData(result)

              send({
                type: 'result',
                record: {
                  id: randomUUID(),
                  pageNumber: pageIndex,
                  ...result,
                },
                issues: validation.issues,
              })
            } catch (error) {
              send({
                type: 'error',
                page: pageIndex,
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            }
          }
        } else {
          pageIndex++
          send({ type: 'progress', current: pageIndex, total: totalPages })

          try {
            const result = await extractPayslipData(file.fileData, file.mimeType)
            const validation = await validatePayslipData(result)

            send({
              type: 'result',
              record: {
                id: randomUUID(),
                pageNumber: pageIndex,
                ...result,
              },
              issues: validation.issues,
            })
          } catch (error) {
            send({
              type: 'error',
              page: pageIndex,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      // Update batch status
      await db
        .update(payrollBatches)
        .set({ status: 'review' })
        .where(eq(payrollBatches.id, batchId))

      send({ type: 'done' })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
