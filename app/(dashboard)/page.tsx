import { db } from '@/lib/db'
import { employees, employeePayrolls, payrollBatches } from '@/lib/schema'
import { eq, sql, desc } from 'drizzle-orm'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  try {
    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.status, 'active'))

    const [payrollStats] = await db
      .select({
        avgGross: sql<number>`coalesce(avg(${employeePayrolls.grossSalary}::numeric), 0)`,
        avgNet: sql<number>`coalesce(avg(${employeePayrolls.netSalary}::numeric), 0)`,
        totalPayroll: sql<number>`coalesce(sum(${employeePayrolls.netSalary}::numeric), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(employeePayrolls)
      .where(eq(employeePayrolls.status, 'approved'))

    const monthlyTrend = await db
      .select({
        month: employeePayrolls.month,
        year: employeePayrolls.year,
        totalGross: sql<number>`coalesce(sum(${employeePayrolls.grossSalary}::numeric), 0)`,
        totalNet: sql<number>`coalesce(sum(${employeePayrolls.netSalary}::numeric), 0)`,
        employeeCount: sql<number>`count(distinct ${employeePayrolls.employeeId})`,
      })
      .from(employeePayrolls)
      .where(eq(employeePayrolls.status, 'approved'))
      .groupBy(employeePayrolls.year, employeePayrolls.month)
      .orderBy(employeePayrolls.year, employeePayrolls.month)
      .limit(12)

    const departmentStats = await db
      .select({
        department: employees.department,
        avgGross: sql<number>`coalesce(avg(${employeePayrolls.grossSalary}::numeric), 0)`,
        employeeCount: sql<number>`count(distinct ${employees.id})`,
      })
      .from(employeePayrolls)
      .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
      .where(eq(employeePayrolls.status, 'approved'))
      .groupBy(employees.department)

    const recentBatches = await db
      .select()
      .from(payrollBatches)
      .orderBy(desc(payrollBatches.uploadedAt))
      .limit(5)

    return {
      employeeCount: Number(employeeCount?.count || 0),
      avgGross: Math.round(Number(payrollStats?.avgGross || 0)),
      avgNet: Math.round(Number(payrollStats?.avgNet || 0)),
      totalPayroll: Math.round(Number(payrollStats?.totalPayroll || 0)),
      approvedPayrolls: Number(payrollStats?.count || 0),
      monthlyTrend: monthlyTrend.map((t) => ({
        month: t.month,
        year: t.year,
        totalGross: Math.round(Number(t.totalGross)),
        totalNet: Math.round(Number(t.totalNet)),
        employeeCount: Number(t.employeeCount),
      })),
      departmentStats: departmentStats.map((d) => ({
        department: d.department || 'לא מוגדר',
        avgGross: Math.round(Number(d.avgGross)),
        employeeCount: Number(d.employeeCount),
      })),
      recentBatches,
    }
  } catch {
    return {
      employeeCount: 0,
      avgGross: 0,
      avgNet: 0,
      totalPayroll: 0,
      approvedPayrolls: 0,
      monthlyTrend: [],
      departmentStats: [],
      recentBatches: [],
    }
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
