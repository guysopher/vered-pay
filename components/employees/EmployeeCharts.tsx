'use client'

import { formatCurrency, formatMonth } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Payroll = {
  month: number
  year: number
  grossSalary: number | null
  netSalary: number | null
  totalDeductions: number | null
}

export function EmployeeCharts({ payrolls }: { payrolls: Payroll[] }) {
  const chartData = [...payrolls]
    .reverse()
    .map((p) => ({
      name: formatMonth(p.month, p.year),
      ברוטו: Number(p.grossSalary) || 0,
      נטו: Number(p.netSalary) || 0,
      ניכויים: Number(p.totalDeductions) || 0,
    }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
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
  )
}
