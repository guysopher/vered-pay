export type Company = {
  id: string
  name: string
  employerNumber: string | null
  createdAt: Date
}

export type Employee = {
  id: string
  companyId: string | null
  name: string
  nationalId: string
  department: string | null
  role: string | null
  startDate: string | null
  maritalStatus: string | null
  taxCreditPoints: number | null
  bankAccount: string | null
  bankBranch: string | null
  status: string
  createdAt: Date
}

export type PayrollBatch = {
  id: string
  companyId: string | null
  month: number
  year: number
  fileName: string
  status: string
  uploadedAt: Date
}

export type EmployeePayroll = {
  id: string
  batchId: string
  employeeId: string
  month: number
  year: number
  grossSalary: number | null
  netSalary: number | null
  totalDeductions: number | null
  workDays: number | null
  workHours: number | null
  hourlyRate: number | null
  overtimeHours: number | null
  vacationDays: number | null
  sickDays: number | null
  vacationBalance: number | null
  bankTransferAmount: number | null
  status: string
  rawExtraction: Record<string, unknown> | null
  pageNumber: number | null
  extractedAt: Date | null
  reviewedAt: Date | null
}

export type SalaryComponent = {
  id: string
  payrollId: string
  type: 'earning' | 'deduction' | 'benefit'
  name: string
  quantity: number | null
  rate: number | null
  percent: number | null
  amount: number
}

export type PayrollWithEmployee = EmployeePayroll & {
  employeeName: string
  employeeNationalId: string
  employeeDepartment: string | null
}

export type ValidationIssue = {
  severity: 'error' | 'warning' | 'info'
  field: string
  message: string
}

export type ValidationResult = {
  issues: ValidationIssue[]
  isValid: boolean
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ExtractionResult = {
  employee: {
    name: string
    nationalId: string
    department: string | null
    role: string | null
    startDate: string | null
    maritalStatus: string | null
    taxCreditPoints: number | null
    bankAccount: string | null
    bankBranch: string | null
  }
  payroll: {
    month: number
    year: number
    grossSalary: number | null
    netSalary: number | null
    totalDeductions: number | null
    workDays: number | null
    workHours: number | null
    hourlyRate: number | null
    overtimeHours: number | null
    vacationDays: number | null
    sickDays: number | null
    vacationBalance: number | null
    bankTransferAmount: number | null
  }
  earnings: Array<{
    name: string
    quantity: number | null
    rate: number | null
    percent: number | null
    amount: number
  }>
  deductions: Array<{
    name: string
    quantity: number | null
    rate: number | null
    percent: number | null
    amount: number
  }>
  benefits: Array<{
    name: string
    quantity: number | null
    rate: number | null
    percent: number | null
    amount: number
  }>
}
