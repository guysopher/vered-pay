import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { employeePayrolls, salaryComponents } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [payroll] = await db
      .select()
      .from(employeePayrolls)
      .where(eq(employeePayrolls.id, params.id))

    if (!payroll) {
      return NextResponse.json({ error: 'תלוש לא נמצא' }, { status: 404 })
    }

    const components = await db
      .select()
      .from(salaryComponents)
      .where(eq(salaryComponents.payrollId, params.id))

    return NextResponse.json({
      ...payroll,
      earnings: components.filter((c) => c.type === 'earning'),
      deductions: components.filter((c) => c.type === 'deduction'),
      benefits: components.filter((c) => c.type === 'benefit'),
    })
  } catch (error) {
    console.error('Payroll detail error:', error)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
