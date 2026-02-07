'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatMonth, getStatusLabel, getStatusColor } from '@/lib/utils'
import { EmployeeCharts } from '@/components/employees/EmployeeCharts'

type SalaryComponent = {
  id: string
  type: string
  name: string
  quantity: string | null
  rate: string | null
  percent: string | null
  amount: string
}

type Payroll = {
  id: string
  month: number
  year: number
  grossSalary: number | null
  netSalary: number | null
  totalDeductions: number | null
  workDays: string | null
  workHours: string | null
  hourlyRate: string | null
  overtimeHours: string | null
  vacationDays: string | null
  sickDays: string | null
  vacationBalance: string | null
  bankTransferAmount: string | null
  status: string
  earnings: SalaryComponent[]
  deductions: SalaryComponent[]
  benefits: SalaryComponent[]
}

type Employee = {
  id: string
  name: string
  nationalId: string
  department: string | null
  role: string | null
  startDate: string | null
  maritalStatus: string | null
  taxCreditPoints: string | null
  bankAccount: string | null
  bankBranch: string | null
  status: string
}

type EmployeeData = {
  employee: Employee
  payrolls: Payroll[]
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const [data, setData] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/employees/${params.id}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  if (loading) {
    return <div className="text-center py-12 text-gray-400">טוען...</div>
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">עובד לא נמצא</div>
  }

  const { employee, payrolls } = data

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/employees" className="hover:text-blue-600">עובדים</Link>
        <span>←</span>
        <span>{employee.name}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{employee.name}</h1>

      {/* Employee Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">פרטים אישיים</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="ת.ז." value={employee.nationalId} dir="ltr" />
          <InfoItem label="מחלקה" value={employee.department} />
          <InfoItem label="תפקיד" value={employee.role} />
          <InfoItem label="סטטוס" value={getStatusLabel(employee.status)} />
          <InfoItem label="תאריך התחלה" value={employee.startDate} dir="ltr" />
          <InfoItem label="מצב משפחתי" value={employee.maritalStatus} />
          <InfoItem label="נקודות זיכוי" value={employee.taxCreditPoints} />
          <InfoItem label="חשבון בנק" value={employee.bankAccount} dir="ltr" />
        </div>
      </div>

      {/* Salary Chart */}
      {payrolls.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">מגמת שכר</h2>
          <EmployeeCharts payrolls={payrolls} />
        </div>
      )}

      {/* Payroll History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">היסטוריית תלושים</h2>
        {payrolls.length === 0 ? (
          <p className="text-gray-400 text-center py-4">אין תלושים עדיין</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">חודש</th>
                <th className="pb-3 font-medium">ברוטו</th>
                <th className="pb-3 font-medium">ניכויים</th>
                <th className="pb-3 font-medium">נטו</th>
                <th className="pb-3 font-medium">סטטוס</th>
                <th className="pb-3 font-medium">פרטים</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3 text-sm">{formatMonth(p.month, p.year)}</td>
                  <td className="py-3 text-sm">{formatCurrency(p.grossSalary)}</td>
                  <td className="py-3 text-sm text-red-600">{formatCurrency(p.totalDeductions)}</td>
                  <td className="py-3 text-sm font-medium text-green-700">{formatCurrency(p.netSalary)}</td>
                  <td className="py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => setSelectedPayroll(selectedPayroll?.id === p.id ? null : p)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {selectedPayroll?.id === p.id ? 'סגור' : 'פרטים'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payroll Detail Expansion */}
      {selectedPayroll && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            פירוט תלוש — {formatMonth(selectedPayroll.month, selectedPayroll.year)}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ComponentList title="הכנסות" items={selectedPayroll.earnings} color="blue" />
            <ComponentList title="ניכויים" items={selectedPayroll.deductions} color="red" />
            <ComponentList title="הפרשות מעסיק" items={selectedPayroll.benefits} color="green" />
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <InfoItem label="ימי עבודה" value={selectedPayroll.workDays} />
            <InfoItem label="שעות עבודה" value={selectedPayroll.workHours} />
            <InfoItem label="שעות נוספות" value={selectedPayroll.overtimeHours} />
            <InfoItem label="יתרת חופשה" value={selectedPayroll.vacationBalance} />
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value, dir }: { label: string; value: string | null | undefined; dir?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium mt-1" dir={dir}>{value || '—'}</p>
    </div>
  )
}

function ComponentList({
  title,
  items,
  color,
}: {
  title: string
  items: SalaryComponent[]
  color: 'blue' | 'red' | 'green'
}) {
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const colorMap = {
    blue: 'text-blue-700',
    red: 'text-red-700',
    green: 'text-green-700',
  }

  return (
    <div>
      <h3 className={`font-semibold text-sm mb-2 ${colorMap[color]}`}>
        {title} ({formatCurrency(total)})
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600">{item.name}</span>
              <span className="font-medium">{formatCurrency(Number(item.amount))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-sm">אין רכיבים</p>
      )}
    </div>
  )
}
