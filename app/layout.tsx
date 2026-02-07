import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'VERED PAY - ניהול שכר',
  description: 'מערכת ניהול תלושי שכר והטבות',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-slate-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
