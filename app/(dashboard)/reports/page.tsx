'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatMonth } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts'
import Link from 'next/link'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

type ReportData = {
  monthlyTrend: Array<{
    month: number; year: number; totalGross: number; totalNet: number;
    totalDeductions: number; employeeCount: number; avgGross: number
  }>
  departmentBreakdown: Array<{
    department: string; avgGross: number; avgNet: number;
    employeeCount: number; totalPayroll: number
  }>
  salaryDistribution: Array<{ bucket: string; count: number }>
  topEarners: Array<{
    employeeId: string; name: string; department: string | null;
    avgGross: number; avgNet: number
  }>
  commonComponents: Array<{
    type: string; name: string; totalAmount: number;
    avgAmount: number; count: number
  }>
  departments: string[]
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [department, setDepartment] = useState('')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (department) params.set('department', department)

    const res = await fetch(`/api/reports?${params}`)
    if (res.ok) {
      setData(await res.json())
    }
    setLoading(false)
  }, [department])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  function exportCSV() {
    if (!data) return

    const rows = [
      ['חודש', 'שנה', 'סה״כ ברוטו', 'סה״כ נטו', 'סה״כ ניכויים', 'עובדים', 'ממוצע ברוטו'],
      ...data.monthlyTrend.map((t) => [
        t.month, t.year, t.totalGross, t.totalNet, t.totalDeductions, t.employeeCount, t.avgGross,
      ]),
    ]

    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'payroll-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">טוען דוחות...</div>
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">שגיאה בטעינת הדוחות</div>
  }

  const trendChartData = data.monthlyTrend.map((t) => ({
    name: formatMonth(t.month, t.year),
    ברוטו: t.totalGross,
    נטו: t.totalNet,
    ניכויים: t.totalDeductions,
  }))

  const earningsComponents = data.commonComponents.filter((c) => c.type === 'earning')
  const deductionsComponents = data.commonComponents.filter((c) => c.type === 'deduction')
  const benefitsComponents = data.commonComponents.filter((c) => c.type === 'benefit')

  const isEmpty = data.monthlyTrend.length === 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">דוחות וניתוחים</h1>
        <div className="flex gap-3">
          {data.departments.length > 0 && (
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">כל המחלקות</option>
              {data.departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          <button
            onClick={exportCSV}
            disabled={isEmpty}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            ייצוא CSV
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-lg text-gray-400 mb-2">אין נתונים לתצוגה</p>
          <p className="text-sm text-gray-400">העלה ואשר תלושי שכר כדי לראות דוחות</p>
        </div>
      ) : (
        <>
          {/* Monthly Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">מגמת שכר חודשית</h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="ברוטו" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="נטו" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="ניכויים" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Department Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">השוואת מחלקות</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="avgGross" fill="#3b82f6" name="ממוצע ברוטו" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgNet" fill="#10b981" name="ממוצע נטו" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Salary Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">התפלגות שכר</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.salaryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" fontSize={11} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="מספר עובדים" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Benefits Pie Chart */}
            {benefitsComponents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">פילוח הפרשות מעסיק</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={benefitsComponents.map((c) => ({ name: c.name, value: c.totalAmount }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {benefitsComponents.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Deductions Pie Chart */}
            {deductionsComponents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">פילוח ניכויים</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deductionsComponents.map((c) => ({ name: c.name, value: c.totalAmount }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {deductionsComponents.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Earners */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">שכר גבוה ביותר</h2>
            <table className="w-full">
              <thead>
                <tr className="text-right text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">שם</th>
                  <th className="pb-3 font-medium">מחלקה</th>
                  <th className="pb-3 font-medium">ממוצע ברוטו</th>
                  <th className="pb-3 font-medium">ממוצע נטו</th>
                </tr>
              </thead>
              <tbody>
                {data.topEarners.map((emp, i) => (
                  <tr key={emp.employeeId} className="border-b last:border-0">
                    <td className="py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="py-3 text-sm">
                      <Link href={`/employees/${emp.employeeId}`} className="text-blue-600 hover:text-blue-800">
                        {emp.name}
                      </Link>
                    </td>
                    <td className="py-3 text-sm">{emp.department || '—'}</td>
                    <td className="py-3 text-sm font-medium">{formatCurrency(emp.avgGross)}</td>
                    <td className="py-3 text-sm">{formatCurrency(emp.avgNet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Salary Components Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ComponentTable title="רכיבי שכר נפוצים" items={earningsComponents} color="blue" />
            <ComponentTable title="ניכויים נפוצים" items={deductionsComponents} color="red" />
            <ComponentTable title="הפרשות מעסיק נפוצות" items={benefitsComponents} color="green" />
          </div>
        </>
      )}
    </div>
  )
}

function ComponentTable({
  title,
  items,
  color,
}: {
  title: string
  items: Array<{ name: string; totalAmount: number; avgAmount: number; count: number }>
  color: 'blue' | 'red' | 'green'
}) {
  const colorMap = { blue: 'text-blue-700', red: 'text-red-700', green: 'text-green-700' }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className={`text-md font-semibold mb-4 ${colorMap[color]}`}>{title}</h2>
      {items.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-gray-500 border-b">
              <th className="pb-2 font-medium">רכיב</th>
              <th className="pb-2 font-medium">ממוצע</th>
              <th className="pb-2 font-medium">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.name} className="border-b last:border-0">
                <td className="py-2">{item.name}</td>
                <td className="py-2">{formatCurrency(item.avgAmount)}</td>
                <td className="py-2 font-medium">{formatCurrency(item.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-400 text-sm">אין נתונים</p>
      )}
    </div>
  )
}
