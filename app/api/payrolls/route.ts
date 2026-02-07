import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { employees, employeePayrolls, salaryComponents, payrollBatches } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { batchId, record } = await request.json()

    // Find or create employee by nationalId
    let employee = await db
      .select()
      .from(employees)
      .where(eq(employees.nationalId, record.employee.nationalId))
      .then((rows) => rows[0])

    if (!employee) {
      const [newEmployee] = await db
        .insert(employees)
        .values({
          name: record.employee.name,
          nationalId: record.employee.nationalId,
          department: record.employee.department,
          role: record.employee.role,
          startDate: record.employee.startDate,
          maritalStatus: record.employee.maritalStatus,
          taxCreditPoints: record.employee.taxCreditPoints?.toString(),
          bankAccount: record.employee.bankAccount,
          bankBranch: record.employee.bankBranch,
          status: 'active',
        })
        .returning()
      employee = newEmployee
    } else {
      // Update employee info with latest data
      await db
        .update(employees)
        .set({
          name: record.employee.name,
          department: record.employee.department || employee.department,
          role: record.employee.role || employee.role,
          startDate: record.employee.startDate || employee.startDate,
          maritalStatus: record.employee.maritalStatus || employee.maritalStatus,
          taxCreditPoints: record.employee.taxCreditPoints?.toString() || employee.taxCreditPoints,
          bankAccount: record.employee.bankAccount || employee.bankAccount,
          bankBranch: record.employee.bankBranch || employee.bankBranch,
        })
        .where(eq(employees.id, employee.id))
    }

    // Create employee payroll
    const [payroll] = await db
      .insert(employeePayrolls)
      .values({
        batchId,
        employeeId: employee.id,
        month: record.payroll.month,
        year: record.payroll.year,
        grossSalary: record.payroll.grossSalary?.toString(),
        netSalary: record.payroll.netSalary?.toString(),
        totalDeductions: record.payroll.totalDeductions?.toString(),
        workDays: record.payroll.workDays?.toString(),
        workHours: record.payroll.workHours?.toString(),
        hourlyRate: record.payroll.hourlyRate?.toString(),
        overtimeHours: record.payroll.overtimeHours?.toString(),
        vacationDays: record.payroll.vacationDays?.toString(),
        sickDays: record.payroll.sickDays?.toString(),
        vacationBalance: record.payroll.vacationBalance?.toString(),
        bankTransferAmount: record.payroll.bankTransferAmount?.toString(),
        status: 'approved',
        rawExtraction: record,
        pageNumber: record.pageNumber,
        extractedAt: new Date(),
        reviewedAt: new Date(),
      })
      .returning()

    // Insert salary components
    const allComponents = [
      ...(record.earnings || []).map((e: { name: string; quantity: number | null; rate: number | null; percent: number | null; amount: number }) => ({ ...e, type: 'earning' })),
      ...(record.deductions || []).map((d: { name: string; quantity: number | null; rate: number | null; percent: number | null; amount: number }) => ({ ...d, type: 'deduction' })),
      ...(record.benefits || []).map((b: { name: string; quantity: number | null; rate: number | null; percent: number | null; amount: number }) => ({ ...b, type: 'benefit' })),
    ]

    if (allComponents.length > 0) {
      await db.insert(salaryComponents).values(
        allComponents.map((c: { name: string; quantity: number | null; rate: number | null; percent: number | null; amount: number; type: string }) => ({
          payrollId: payroll.id,
          type: c.type,
          name: c.name,
          quantity: c.quantity?.toString() || null,
          rate: c.rate?.toString() || null,
          percent: c.percent?.toString() || null,
          amount: c.amount.toString(),
        }))
      )
    }

    // Check if all payrolls in batch are approved
    const pendingInBatch = await db
      .select()
      .from(employeePayrolls)
      .where(
        and(
          eq(employeePayrolls.batchId, batchId),
          eq(employeePayrolls.status, 'pending')
        )
      )

    if (pendingInBatch.length === 0) {
      await db
        .update(payrollBatches)
        .set({ status: 'completed' })
        .where(eq(payrollBatches.id, batchId))
    }

    return NextResponse.json({ success: true, payrollId: payroll.id })
  } catch (error) {
    console.error('Payroll save error:', error)
    return NextResponse.json(
      { error: 'שגיאה בשמירת הנתונים' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const employeeId = searchParams.get('employeeId')

  try {
    let query = db
      .select({
        id: employeePayrolls.id,
        batchId: employeePayrolls.batchId,
        employeeId: employeePayrolls.employeeId,
        month: employeePayrolls.month,
        year: employeePayrolls.year,
        grossSalary: employeePayrolls.grossSalary,
        netSalary: employeePayrolls.netSalary,
        totalDeductions: employeePayrolls.totalDeductions,
        workDays: employeePayrolls.workDays,
        workHours: employeePayrolls.workHours,
        hourlyRate: employeePayrolls.hourlyRate,
        overtimeHours: employeePayrolls.overtimeHours,
        vacationDays: employeePayrolls.vacationDays,
        sickDays: employeePayrolls.sickDays,
        vacationBalance: employeePayrolls.vacationBalance,
        bankTransferAmount: employeePayrolls.bankTransferAmount,
        status: employeePayrolls.status,
        pageNumber: employeePayrolls.pageNumber,
        extractedAt: employeePayrolls.extractedAt,
        reviewedAt: employeePayrolls.reviewedAt,
        employeeName: employees.name,
        employeeNationalId: employees.nationalId,
        employeeDepartment: employees.department,
      })
      .from(employeePayrolls)
      .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
      .orderBy(desc(employeePayrolls.year), desc(employeePayrolls.month))

    if (employeeId) {
      query = query.where(eq(employeePayrolls.employeeId, employeeId)) as typeof query
    }

    const payrolls = await query

    return NextResponse.json(payrolls)
  } catch (error) {
    console.error('Payroll fetch error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת הנתונים' }, { status: 500 })
  }
}
