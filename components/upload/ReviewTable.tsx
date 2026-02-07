'use client'

import { formatCurrency, getStatusLabel, getStatusColor } from '@/lib/utils'

type ReviewRecord = {
  id: string
  pageNumber: number
  employee: { name: string; nationalId: string; department: string | null }
  payroll: { month: number; year: number; grossSalary: number | null; netSalary: number | null }
  status: 'pending' | 'approved' | 'skipped'
  [key: string]: unknown
}

type ReviewTableProps = {
  records: ReviewRecord[]
  onSelect: (record: ReviewRecord) => void
}

export function ReviewTable({ records, onSelect }: ReviewTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-right text-sm text-gray-500 bg-gray-50 border-b">
            <th className="px-4 py-3 font-medium">עמוד</th>
            <th className="px-4 py-3 font-medium">שם עובד</th>
            <th className="px-4 py-3 font-medium">ת.ז.</th>
            <th className="px-4 py-3 font-medium">מחלקה</th>
            <th className="px-4 py-3 font-medium">ברוטו</th>
            <th className="px-4 py-3 font-medium">נטו</th>
            <th className="px-4 py-3 font-medium">סטטוס</th>
            <th className="px-4 py-3 font-medium">פעולה</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              className="border-b last:border-0 hover:bg-gray-50 transition"
            >
              <td className="px-4 py-3 text-sm text-gray-500">{record.pageNumber}</td>
              <td className="px-4 py-3 text-sm font-medium">{record.employee.name}</td>
              <td className="px-4 py-3 text-sm text-gray-500" dir="ltr">{record.employee.nationalId}</td>
              <td className="px-4 py-3 text-sm">{record.employee.department || '—'}</td>
              <td className="px-4 py-3 text-sm">{formatCurrency(record.payroll.grossSalary)}</td>
              <td className="px-4 py-3 text-sm">{formatCurrency(record.payroll.netSalary)}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                  {getStatusLabel(record.status)}
                </span>
              </td>
              <td className="px-4 py-3">
                {record.status === 'pending' && (
                  <button
                    onClick={() => onSelect(record)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    סקור
                  </button>
                )}
                {record.status === 'approved' && (
                  <span className="text-green-600 text-sm">✓</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
