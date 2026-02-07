'use client'

import { formatCurrency, formatMonth, getStatusLabel, getStatusColor } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'

type DashboardData = {
  employeeCount: number
  avgGross: number
  avgNet: number
  totalPayroll: number
  approvedPayrolls: number
  monthlyTrend: Array<{
    month: number
    year: number
    totalGross: number
    totalNet: number
    employeeCount: number
  }>
  departmentStats: Array<{
    department: string
    avgGross: number
    employeeCount: number
  }>
  recentBatches: Array<{
    id: string
    fileName: string
    month: number
    year: number
    status: string
    uploadedAt: Date
  }>
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const summaryCards = [
    { label: 'עובדים פעילים', value: data.employeeCount.toString(), color: 'bg-blue-500' },
    { label: 'שכר ברוטו ממוצע', value: formatCurrency(data.avgGross), color: 'bg-green-500' },
    { label: 'שכר נטו ממוצע', value: formatCurrency(data.avgNet), color: 'bg-purple-500' },
    { label: 'סה״כ שולם', value: formatCurrency(data.totalPayroll), color: 'bg-orange-500' },
  ]

  const trendData = data.monthlyTrend.map((t) => ({
    name: formatMonth(t.month, t.year),
    ברוטו: t.totalGross,
    נטו: t.totalNet,
    עובדים: t.employeeCount,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">לוח בקרה</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className={`w-2 h-2 rounded-full ${card.color} mb-3`} />
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">מגמת שכר חודשית</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="ברוטו" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="נטו" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              אין נתונים עדיין. העלה תלושי שכר כדי לראות מגמות.
            </div>
          )}
        </div>

        {/* Department Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">שכר ממוצע לפי מחלקה</h2>
          {data.departmentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="avgGross" fill="#3b82f6" name="ברוטו ממוצע" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              אין נתונים עדיין
            </div>
          )}
        </div>
      </div>

      {/* Recent Batches */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">העלאות אחרונות</h2>
        {data.recentBatches.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">קובץ</th>
                <th className="pb-3 font-medium">חודש</th>
                <th className="pb-3 font-medium">סטטוס</th>
                <th className="pb-3 font-medium">תאריך העלאה</th>
              </tr>
            </thead>
            <tbody>
              {data.recentBatches.map((batch) => (
                <tr key={batch.id} className="border-b last:border-0">
                  <td className="py-3 text-sm">{batch.fileName}</td>
                  <td className="py-3 text-sm">{formatMonth(batch.month, batch.year)}</td>
                  <td className="py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                      {getStatusLabel(batch.status)}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-500">
                    {new Date(batch.uploadedAt).toLocaleDateString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-center py-8">
            אין העלאות עדיין. לחץ על &quot;העלאת תלושים&quot; כדי להתחיל.
          </p>
        )}
      </div>
    </div>
  )
}
