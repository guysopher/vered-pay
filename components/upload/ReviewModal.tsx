'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

type SalaryItem = {
  name: string
  quantity: number | null
  rate: number | null
  percent: number | null
  amount: number
}

type ValidationIssue = {
  severity: 'error' | 'warning' | 'info'
  field: string
  message: string
}

type ReviewRecord = {
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
  earnings: SalaryItem[]
  deductions: SalaryItem[]
  benefits: SalaryItem[]
  issues?: ValidationIssue[]
  status: 'pending' | 'approved' | 'skipped'
}

type ReviewModalProps = {
  record: ReviewRecord
  onApprove: (record: ReviewRecord) => void
  onSkip: () => void
  onUpdate: (record: ReviewRecord) => void
  onClose: () => void
}

export function ReviewModal({ record, onApprove, onSkip, onUpdate, onClose }: ReviewModalProps) {
  const [saving, setSaving] = useState(false)

  function updateField(section: 'employee' | 'payroll', field: string, value: string) {
    const numericFields = [
      'taxCreditPoints', 'grossSalary', 'netSalary', 'totalDeductions',
      'workDays', 'workHours', 'hourlyRate', 'overtimeHours',
      'vacationDays', 'sickDays', 'vacationBalance', 'bankTransferAmount',
      'month', 'year',
    ]

    let parsedValue: string | number | null = value
    if (numericFields.includes(field)) {
      parsedValue = value === '' ? null : Number(value)
    }

    onUpdate({
      ...record,
      [section]: {
        ...record[section],
        [field]: parsedValue,
      },
    })
  }

  async function handleApprove() {
    setSaving(true)
    await onApprove(record)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold">סקירת תלוש — עמוד {record.pageNumber}</h2>
            <p className="text-sm text-gray-500">{record.employee.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Validation Issues */}
          {record.issues && record.issues.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-md font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <span className="text-lg">&#9888;</span>
                ממצאי בדיקה ({record.issues.length})
              </h3>
              <div className="space-y-2">
                {record.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
                      issue.severity === 'error'
                        ? 'bg-red-100 text-red-800'
                        : issue.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <span className="font-bold mt-0.5 shrink-0">
                      {issue.severity === 'error' ? '✕' : issue.severity === 'warning' ? '!' : 'i'}
                    </span>
                    <div>
                      <span className="font-medium">{issue.message}</span>
                      {issue.field && (
                        <span className="text-xs opacity-70 mr-2">({issue.field})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Employee Info */}
          <section>
            <h3 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">פרטי עובד</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="שם" value={record.employee.name} onChange={(v) => updateField('employee', 'name', v)} />
              <Field label="ת.ז." value={record.employee.nationalId} onChange={(v) => updateField('employee', 'nationalId', v)} dir="ltr" />
              <Field label="מחלקה" value={record.employee.department || ''} onChange={(v) => updateField('employee', 'department', v)} />
              <Field label="תפקיד" value={record.employee.role || ''} onChange={(v) => updateField('employee', 'role', v)} />
              <Field label="תאריך התחלה" value={record.employee.startDate || ''} onChange={(v) => updateField('employee', 'startDate', v)} dir="ltr" />
              <Field label="מצב משפחתי" value={record.employee.maritalStatus || ''} onChange={(v) => updateField('employee', 'maritalStatus', v)} />
              <Field label="נקודות זיכוי" value={String(record.employee.taxCreditPoints || '')} onChange={(v) => updateField('employee', 'taxCreditPoints', v)} type="number" />
              <Field label="חשבון בנק" value={record.employee.bankAccount || ''} onChange={(v) => updateField('employee', 'bankAccount', v)} dir="ltr" />
              <Field label="סניף בנק" value={record.employee.bankBranch || ''} onChange={(v) => updateField('employee', 'bankBranch', v)} dir="ltr" />
            </div>
          </section>

          {/* Payroll Summary */}
          <section>
            <h3 className="text-md font-semibold text-gray-900 mb-3 border-b pb-2">סיכום שכר</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="חודש" value={String(record.payroll.month || '')} onChange={(v) => updateField('payroll', 'month', v)} type="number" />
              <Field label="שנה" value={String(record.payroll.year || '')} onChange={(v) => updateField('payroll', 'year', v)} type="number" />
              <Field label="ברוטו" value={String(record.payroll.grossSalary || '')} onChange={(v) => updateField('payroll', 'grossSalary', v)} type="number" highlight="blue" />
              <Field label="נטו" value={String(record.payroll.netSalary || '')} onChange={(v) => updateField('payroll', 'netSalary', v)} type="number" highlight="green" />
              <Field label="סה״כ ניכויים" value={String(record.payroll.totalDeductions || '')} onChange={(v) => updateField('payroll', 'totalDeductions', v)} type="number" highlight="red" />
              <Field label="ימי עבודה" value={String(record.payroll.workDays || '')} onChange={(v) => updateField('payroll', 'workDays', v)} type="number" />
              <Field label="שעות עבודה" value={String(record.payroll.workHours || '')} onChange={(v) => updateField('payroll', 'workHours', v)} type="number" />
              <Field label="שכר לשעה" value={String(record.payroll.hourlyRate || '')} onChange={(v) => updateField('payroll', 'hourlyRate', v)} type="number" />
              <Field label="שעות נוספות" value={String(record.payroll.overtimeHours || '')} onChange={(v) => updateField('payroll', 'overtimeHours', v)} type="number" />
              <Field label="ימי חופשה" value={String(record.payroll.vacationDays || '')} onChange={(v) => updateField('payroll', 'vacationDays', v)} type="number" />
              <Field label="ימי מחלה" value={String(record.payroll.sickDays || '')} onChange={(v) => updateField('payroll', 'sickDays', v)} type="number" />
              <Field label="יתרת חופשה" value={String(record.payroll.vacationBalance || '')} onChange={(v) => updateField('payroll', 'vacationBalance', v)} type="number" />
              <Field label="העברה לבנק" value={String(record.payroll.bankTransferAmount || '')} onChange={(v) => updateField('payroll', 'bankTransferAmount', v)} type="number" />
            </div>
          </section>

          {/* Earnings */}
          <SalaryTable title="רכיבי שכר (הכנסות)" items={record.earnings} color="blue" />

          {/* Deductions */}
          <SalaryTable title="ניכויים" items={record.deductions} color="red" />

          {/* Benefits */}
          <SalaryTable title="הפרשות מעסיק" items={record.benefits} color="green" />
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end rounded-b-2xl">
          <button
            onClick={onSkip}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            דלג
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            ביטול
          </button>
          <button
            onClick={handleApprove}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'שומר...' : 'אשר ושמור'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  dir,
  highlight,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  dir?: string
  highlight?: 'blue' | 'green' | 'red'
}) {
  const highlightClasses = {
    blue: 'border-blue-300 bg-blue-50',
    green: 'border-green-300 bg-green-50',
    red: 'border-red-300 bg-red-50',
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
          highlight ? highlightClasses[highlight] : 'border-gray-200'
        }`}
      />
    </div>
  )
}

function SalaryTable({
  title,
  items,
  color,
}: {
  title: string
  items: SalaryItem[]
  color: 'blue' | 'red' | 'green'
}) {
  const colorClasses = {
    blue: 'text-blue-700 border-blue-200',
    red: 'text-red-700 border-red-200',
    green: 'text-green-700 border-green-200',
  }

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  return (
    <section>
      <h3 className={`text-md font-semibold mb-3 border-b pb-2 ${colorClasses[color]}`}>
        {title}
        <span className="text-sm font-normal mr-2">
          (סה״כ: {formatCurrency(total)})
        </span>
      </h3>
      {items.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-gray-500 border-b">
              <th className="pb-2 font-medium">רכיב</th>
              <th className="pb-2 font-medium">כמות</th>
              <th className="pb-2 font-medium">תעריף</th>
              <th className="pb-2 font-medium">%</th>
              <th className="pb-2 font-medium">סכום</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-gray-500">{item.quantity ?? '—'}</td>
                <td className="py-2 text-gray-500">{item.rate ?? '—'}</td>
                <td className="py-2 text-gray-500">{item.percent ? `${item.percent}%` : '—'}</td>
                <td className="py-2 font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-400 text-sm">לא נמצאו רכיבים</p>
      )}
    </section>
  )
}
