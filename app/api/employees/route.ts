import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDB } from '@/lib/db'
import { employees, employeePayrolls } from '@/lib/schema'
import { eq, sql, desc, like, or } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')
  const department = searchParams.get('department')
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit

  try {
    await ensureDB()
    let conditions = []

    if (search) {
      conditions.push(
        or(
          like(employees.name, `%${search}%`),
          like(employees.nationalId, `%${search}%`)
        )
      )
    }

    if (department) {
      conditions.push(eq(employees.department, department))
    }

    if (status) {
      conditions.push(eq(employees.status, status))
    }

    const whereClause = conditions.length > 0 ? conditions.reduce((a, b) => sql`${a} AND ${b}`) : undefined

    const [employeeList, countResult] = await Promise.all([
      db
        .select({
          id: employees.id,
          name: employees.name,
          nationalId: employees.nationalId,
          department: employees.department,
          role: employees.role,
          status: employees.status,
          startDate: employees.startDate,
          createdAt: employees.createdAt,
          lastPayrollMonth: sql<number>`max(${employeePayrolls.month})`,
          lastPayrollYear: sql<number>`max(${employeePayrolls.year})`,
          payrollCount: sql<number>`count(${employeePayrolls.id})`,
        })
        .from(employees)
        .leftJoin(employeePayrolls, eq(employees.id, employeePayrolls.employeeId))
        .where(whereClause)
        .groupBy(employees.id)
        .orderBy(employees.name)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(whereClause),
    ])

    const total = Number(countResult[0]?.count || 0)

    return NextResponse.json({
      data: employeeList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Employee list error:', error)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
