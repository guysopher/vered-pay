import { PDFDocument } from 'pdf-lib'

export async function splitPdfToPages(pdfBuffer: ArrayBuffer): Promise<Uint8Array[]> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = pdfDoc.getPageCount()
  const pages: Uint8Array[] = []

  for (let i = 0; i < pageCount; i++) {
    const singlePageDoc = await PDFDocument.create()
    const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i])
    singlePageDoc.addPage(copiedPage)
    const pdfBytes = await singlePageDoc.save()
    pages.push(pdfBytes)
  }

  return pages
}

export function pdfPageToBase64(pageBytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < pageBytes.length; i++) {
    binary += String.fromCharCode(pageBytes[i])
  }
  return btoa(binary)
}
