import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDB } from '@/lib/db'
import { employees, employeePayrolls, salaryComponents } from '@/lib/schema'
import { eq, desc, inArray } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureDB()
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

    const payrollIds = payrolls.map((p) => p.id)

    const allComponents = payrollIds.length > 0
      ? await db.select().from(salaryComponents).where(inArray(salaryComponents.payrollId, payrollIds))
      : []

    const componentsByPayrollId = new Map<string, typeof allComponents>()
    for (const comp of allComponents) {
      const existing = componentsByPayrollId.get(comp.payrollId) || []
      existing.push(comp)
      componentsByPayrollId.set(comp.payrollId, existing)
    }

    const payrollsWithComponents = payrolls.map((p) => {
      const components = componentsByPayrollId.get(p.id) || []
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

    return NextResponse.json({
      employee,
      payrolls: payrollsWithComponents,
    })
  } catch (error) {
    console.error('Employee detail error:', error)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}

const ALLOWED_PATCH_FIELDS = [
  'name', 'department', 'role', 'startDate',
  'maritalStatus', 'taxCreditPoints', 'bankAccount',
  'bankBranch', 'status',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureDB()
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'לא צוינו שדות לעדכון' }, { status: 400 })
    }

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
