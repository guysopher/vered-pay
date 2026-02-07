'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatMonth, getStatusLabel, getStatusColor } from '@/lib/utils'

type Employee = {
  id: string
  name: string
  nationalId: string
  department: string | null
  role: string | null
  status: string
  lastPayrollMonth: number | null
  lastPayrollYear: number | null
  payrollCount: number
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployees()
  }, [search])

  async function fetchEmployees() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)

    const res = await fetch(`/api/employees?${params}`)
    if (res.ok) {
      const data = await res.json()
      setEmployees(data)
    }
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">עובדים</h1>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או ת.ז..."
          className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">טוען...</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-lg mb-2">אין עובדים עדיין</p>
            <p className="text-sm">העלה תלושי שכר כדי ליצור רשומות עובדים</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-right text-sm text-gray-500 bg-gray-50 border-b">
                <th className="px-4 py-3 font-medium">שם</th>
                <th className="px-4 py-3 font-medium">ת.ז.</th>
                <th className="px-4 py-3 font-medium">מחלקה</th>
                <th className="px-4 py-3 font-medium">תפקיד</th>
                <th className="px-4 py-3 font-medium">סטטוס</th>
                <th className="px-4 py-3 font-medium">תלוש אחרון</th>
                <th className="px-4 py-3 font-medium">תלושים</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link
                      href={`/employees/${emp.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {emp.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500" dir="ltr">{emp.nationalId}</td>
                  <td className="px-4 py-3 text-sm">{emp.department || '—'}</td>
                  <td className="px-4 py-3 text-sm">{emp.role || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(emp.status)}`}>
                      {getStatusLabel(emp.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {emp.lastPayrollMonth && emp.lastPayrollYear
                      ? formatMonth(emp.lastPayrollMonth, emp.lastPayrollYear)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{emp.payrollCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
