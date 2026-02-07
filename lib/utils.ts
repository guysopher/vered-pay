import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null) return '—'
  return new Intl.NumberFormat('he-IL').format(num)
}

export function formatMonth(month: number, year: number): string {
  const months = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ]
  return `${months[month - 1]} ${year}`
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'ממתין לאישור',
    reviewed: 'נבדק',
    approved: 'מאושר',
    processing: 'מעבד...',
    review: 'ממתין לסקירה',
    completed: 'הושלם',
    active: 'פעיל',
    inactive: 'לא פעיל',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    reviewed: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    processing: 'bg-purple-100 text-purple-800',
    review: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
