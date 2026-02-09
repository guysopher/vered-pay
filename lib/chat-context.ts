import { db } from './db'
import { employees, employeePayrolls } from './schema'
import { eq, desc, sql } from 'drizzle-orm'

export async function buildChatContext(): Promise<string> {
  const [employeeList, recentPayrolls, departmentStats, overallStats] = await Promise.all([
    getEmployeeList(),
    getRecentPayrolls(),
    getDepartmentStats(),
    getOverallStats(),
  ])

  return `## סיכום כללי
${overallStats}

## סטטיסטיקות לפי מחלקה
${departmentStats}

## רשימת עובדים
${employeeList}

## תלושי שכר אחרונים
${recentPayrolls}`
}

async function getEmployeeList(): Promise<string> {
  const MAX_EMPLOYEES = 50

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        nationalId: employees.nationalId,
        department: employees.department,
        role: employees.role,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.status, 'active'))
      .limit(MAX_EMPLOYEES),
    db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.status, 'active')),
  ])

  if (rows.length === 0) return 'אין עובדים במערכת'

  const total = Number(countResult[0]?.count || 0)
  const list = rows
    .map((e) => `- ${e.name} (ת.ז. ${e.nationalId}) | מחלקה: ${e.department || 'לא צוין'} | תפקיד: ${e.role || 'לא צוין'}`)
    .join('\n')

  if (total > MAX_EMPLOYEES) {
    return `${list}\n\n(מציג ${MAX_EMPLOYEES} מתוך ${total} עובדים פעילים)`
  }
  return list
}

async function getRecentPayrolls(): Promise<string> {
  const rows = await db
    .select({
      employeeName: employees.name,
      employeeNationalId: employees.nationalId,
      department: employees.department,
      month: employeePayrolls.month,
      year: employeePayrolls.year,
      grossSalary: employeePayrolls.grossSalary,
      netSalary: employeePayrolls.netSalary,
      totalDeductions: employeePayrolls.totalDeductions,
      workDays: employeePayrolls.workDays,
      workHours: employeePayrolls.workHours,
      overtimeHours: employeePayrolls.overtimeHours,
    })
    .from(employeePayrolls)
    .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
    .where(eq(employeePayrolls.status, 'approved'))
    .orderBy(desc(employeePayrolls.year), desc(employeePayrolls.month))
    .limit(50)

  if (rows.length === 0) return 'אין תלושי שכר במערכת'

  return rows
    .map(
      (p) =>
        `- ${p.employeeName} (${p.month}/${p.year}) | ברוטו: ${p.grossSalary} | נטו: ${p.netSalary} | ניכויים: ${p.totalDeductions} | ימי עבודה: ${p.workDays || '?'} | שעות נוספות: ${p.overtimeHours || '0'}`
    )
    .join('\n')
}

async function getDepartmentStats(): Promise<string> {
  const rows = await db
    .select({
      department: employees.department,
      employeeCount: sql<number>`count(distinct ${employees.id})`,
      avgGross: sql<number>`round(avg(${employeePayrolls.grossSalary}::numeric), 0)`,
      avgNet: sql<number>`round(avg(${employeePayrolls.netSalary}::numeric), 0)`,
      totalGross: sql<number>`round(sum(${employeePayrolls.grossSalary}::numeric), 0)`,
    })
    .from(employeePayrolls)
    .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
    .where(eq(employeePayrolls.status, 'approved'))
    .groupBy(employees.department)

  if (rows.length === 0) return 'אין נתונים'

  return rows
    .map(
      (d) =>
        `- ${d.department || 'ללא מחלקה'}: ${d.employeeCount} עובדים | ממוצע ברוטו: ${d.avgGross} | ממוצע נטו: ${d.avgNet} | סה"כ ברוטו: ${d.totalGross}`
    )
    .join('\n')
}

async function getOverallStats(): Promise<string> {
  const [stats] = await db
    .select({
      totalEmployees: sql<number>`count(distinct ${employees.id})`,
      totalPayrolls: sql<number>`count(${employeePayrolls.id})`,
      avgGross: sql<number>`round(avg(${employeePayrolls.grossSalary}::numeric), 0)`,
      avgNet: sql<number>`round(avg(${employeePayrolls.netSalary}::numeric), 0)`,
      minGross: sql<number>`round(min(${employeePayrolls.grossSalary}::numeric), 0)`,
      maxGross: sql<number>`round(max(${employeePayrolls.grossSalary}::numeric), 0)`,
      totalGross: sql<number>`round(sum(${employeePayrolls.grossSalary}::numeric), 0)`,
    })
    .from(employeePayrolls)
    .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
    .where(eq(employeePayrolls.status, 'approved'))

  if (!stats || stats.totalPayrolls === 0) return 'אין נתונים במערכת'

  return `- סה"כ עובדים: ${stats.totalEmployees}
- סה"כ תלושי שכר: ${stats.totalPayrolls}
- שכר ברוטו ממוצע: ${stats.avgGross} ₪
- שכר נטו ממוצע: ${stats.avgNet} ₪
- שכר ברוטו מינימלי: ${stats.minGross} ₪
- שכר ברוטו מקסימלי: ${stats.maxGross} ₪
- סה"כ ברוטו: ${stats.totalGross} ₪`
}
