import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { employees, employeePayrolls, salaryComponents } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, params.id))

    if (!employee) {
      return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })
    }

    const payrolls = await db
      .select()
      .from(employeePayrolls)
      .where(eq(employeePayrolls.employeeId, params.id))
      .orderBy(desc(employeePayrolls.year), desc(employeePayrolls.month))

    const payrollsWithComponents = await Promise.all(
      payrolls.map(async (p) => {
        const components = await db
          .select()
          .from(salaryComponents)
          .where(eq(salaryComponents.payrollId, p.id))

        return {
          ...p,
          grossSalary: Number(p.grossSalary),
          netSalary: Number(p.netSalary),
          totalDeductions: Number(p.totalDeductions),
          earnings: components.filter((c) => c.type === 'earning'),
          deductions: components.filter((c) => c.type === 'deduction'),
          benefits: components.filter((c) => c.type === 'benefit'),
        }
      })
    )

    return NextResponse.json({
      employee,
      payrolls: payrollsWithComponents,
    })
  } catch (error) {
    console.error('Employee detail error:', error)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()

    const [updated] = await db
      .update(employees)
      .set(updates)
      .where(eq(employees.id, params.id))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Employee update error:', error)
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 })
  }
}
