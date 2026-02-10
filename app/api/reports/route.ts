import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDB } from '@/lib/db'
import { employees, employeePayrolls, salaryComponents } from '@/lib/schema'
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fromMonth = searchParams.get('fromMonth')
  const fromYear = searchParams.get('fromYear')
  const toMonth = searchParams.get('toMonth')
  const toYear = searchParams.get('toYear')
  const department = searchParams.get('department')

  try {
    await ensureDB()
    let conditions = [eq(employeePayrolls.status, 'approved')]

    if (fromYear && fromMonth) {
      conditions.push(
        sql`(${employeePayrolls.year} * 100 + ${employeePayrolls.month}) >= ${Number(fromYear) * 100 + Number(fromMonth)}`
      )
    }
    if (toYear && toMonth) {
      conditions.push(
        sql`(${employeePayrolls.year} * 100 + ${employeePayrolls.month}) <= ${Number(toYear) * 100 + Number(toMonth)}`
      )
    }

    const whereClause = conditions.reduce((a, b) => sql`${a} AND ${b}`)

    // Monthly payroll trend
    const monthlyTrend = await db
      .select({
        month: employeePayrolls.month,
        year: employeePayrolls.year,
        totalGross: sql<number>`coalesce(sum(${employeePayrolls.grossSalary}::numeric), 0)`,
        totalNet: sql<number>`coalesce(sum(${employeePayrolls.netSalary}::numeric), 0)`,
        totalDeductions: sql<number>`coalesce(sum(${employeePayrolls.totalDeductions}::numeric), 0)`,
        employeeCount: sql<number>`count(distinct ${employeePayrolls.employeeId})`,
        avgGross: sql<number>`coalesce(avg(${employeePayrolls.grossSalary}::numeric), 0)`,
      })
      .from(employeePayrolls)
      .where(whereClause)
      .groupBy(employeePayrolls.year, employeePayrolls.month)
      .orderBy(employeePayrolls.year, employeePayrolls.month)

    // Department breakdown
    const deptConditions = [...conditions]
    if (department) {
      deptConditions.push(eq(employees.department, department))
    }
    const deptWhereClause = deptConditions.reduce((a, b) => sql`${a} AND ${b}`)

    const departmentBreakdown = await db
      .select({
        department: employees.department,
        avgGross: sql<number>`coalesce(avg(${employeePayrolls.grossSalary}::numeric), 0)`,
        avgNet: sql<number>`coalesce(avg(${employeePayrolls.netSalary}::numeric), 0)`,
        employeeCount: sql<number>`count(distinct ${employees.id})`,
        totalPayroll: sql<number>`coalesce(sum(${employeePayrolls.netSalary}::numeric), 0)`,
      })
      .from(employeePayrolls)
      .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
      .where(deptWhereClause)
      .groupBy(employees.department)

    // Salary distribution (buckets)
    const salaryDistribution = await db
      .select({
        bucket: sql<string>`
          CASE
            WHEN ${employeePayrolls.grossSalary}::numeric < 5000 THEN 'עד 5,000'
            WHEN ${employeePayrolls.grossSalary}::numeric < 8000 THEN '5,000-8,000'
            WHEN ${employeePayrolls.grossSalary}::numeric < 12000 THEN '8,000-12,000'
            WHEN ${employeePayrolls.grossSalary}::numeric < 18000 THEN '12,000-18,000'
            WHEN ${employeePayrolls.grossSalary}::numeric < 25000 THEN '18,000-25,000'
            ELSE 'מעל 25,000'
          END
        `,
        count: sql<number>`count(*)`,
      })
      .from(employeePayrolls)
      .where(whereClause)
      .groupBy(sql`
        CASE
          WHEN ${employeePayrolls.grossSalary}::numeric < 5000 THEN 'עד 5,000'
          WHEN ${employeePayrolls.grossSalary}::numeric < 8000 THEN '5,000-8,000'
          WHEN ${employeePayrolls.grossSalary}::numeric < 12000 THEN '8,000-12,000'
          WHEN ${employeePayrolls.grossSalary}::numeric < 18000 THEN '12,000-18,000'
          WHEN ${employeePayrolls.grossSalary}::numeric < 25000 THEN '18,000-25,000'
          ELSE 'מעל 25,000'
        END
      `)

    // Top earners
    const topEarners = await db
      .select({
        employeeId: employees.id,
        name: employees.name,
        department: employees.department,
        avgGross: sql<number>`coalesce(avg(${employeePayrolls.grossSalary}::numeric), 0)`,
        avgNet: sql<number>`coalesce(avg(${employeePayrolls.netSalary}::numeric), 0)`,
      })
      .from(employeePayrolls)
      .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
      .where(whereClause)
      .groupBy(employees.id, employees.name, employees.department)
      .orderBy(desc(sql`avg(${employeePayrolls.grossSalary}::numeric)`))
      .limit(10)

    // Common salary components
    const commonComponents = await db
      .select({
        type: salaryComponents.type,
        name: salaryComponents.name,
        totalAmount: sql<number>`coalesce(sum(${salaryComponents.amount}::numeric), 0)`,
        avgAmount: sql<number>`coalesce(avg(${salaryComponents.amount}::numeric), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(salaryComponents)
      .innerJoin(employeePayrolls, eq(salaryComponents.payrollId, employeePayrolls.id))
      .where(whereClause)
      .groupBy(salaryComponents.type, salaryComponents.name)
      .orderBy(desc(sql`sum(${salaryComponents.amount}::numeric)`))
      .limit(20)

    // Available departments
    const departments = await db
      .select({ department: employees.department })
      .from(employees)
      .groupBy(employees.department)

    return NextResponse.json({
      monthlyTrend: monthlyTrend.map((t) => ({
        month: t.month,
        year: t.year,
        totalGross: Math.round(Number(t.totalGross)),
        totalNet: Math.round(Number(t.totalNet)),
        totalDeductions: Math.round(Number(t.totalDeductions)),
        employeeCount: Number(t.employeeCount),
        avgGross: Math.round(Number(t.avgGross)),
      })),
      departmentBreakdown: departmentBreakdown.map((d) => ({
        department: d.department || 'לא מוגדר',
        avgGross: Math.round(Number(d.avgGross)),
        avgNet: Math.round(Number(d.avgNet)),
        employeeCount: Number(d.employeeCount),
        totalPayroll: Math.round(Number(d.totalPayroll)),
      })),
      salaryDistribution: salaryDistribution.map((s) => ({
        bucket: s.bucket,
        count: Number(s.count),
      })),
      topEarners: topEarners.map((e) => ({
        ...e,
        avgGross: Math.round(Number(e.avgGross)),
        avgNet: Math.round(Number(e.avgNet)),
      })),
      commonComponents: commonComponents.map((c) => ({
        type: c.type,
        name: c.name,
        totalAmount: Math.round(Number(c.totalAmount)),
        avgAmount: Math.round(Number(c.avgAmount)),
        count: Number(c.count),
      })),
      departments: departments
        .map((d) => d.department)
        .filter(Boolean) as string[],
    })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
