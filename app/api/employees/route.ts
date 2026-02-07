import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { employees, employeePayrolls } from '@/lib/schema'
import { eq, sql, desc, like, or } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')
  const department = searchParams.get('department')
  const status = searchParams.get('status')

  try {
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

    const employeeList = await db
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
      .where(conditions.length > 0 ? conditions.reduce((a, b) => sql`${a} AND ${b}`) : undefined)
      .groupBy(employees.id)
      .orderBy(employees.name)

    return NextResponse.json(employeeList)
  } catch (error) {
    console.error('Employee list error:', error)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
