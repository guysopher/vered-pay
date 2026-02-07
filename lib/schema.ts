import { pgTable, text, uuid, timestamp, integer, numeric, jsonb } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  employerNumber: text('employer_number'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  name: text('name').notNull(),
  nationalId: text('national_id').notNull().unique(),
  department: text('department'),
  role: text('role'),
  startDate: text('start_date'),
  maritalStatus: text('marital_status'),
  taxCreditPoints: numeric('tax_credit_points'),
  bankAccount: text('bank_account'),
  bankBranch: text('bank_branch'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const payrollBatches = pgTable('payroll_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  fileName: text('file_name').notNull(),
  status: text('status').default('processing').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
})

export const employeePayrolls = pgTable('employee_payrolls', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').references(() => payrollBatches.id).notNull(),
  employeeId: uuid('employee_id').references(() => employees.id).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  grossSalary: numeric('gross_salary'),
  netSalary: numeric('net_salary'),
  totalDeductions: numeric('total_deductions'),
  workDays: numeric('work_days'),
  workHours: numeric('work_hours'),
  hourlyRate: numeric('hourly_rate'),
  overtimeHours: numeric('overtime_hours'),
  vacationDays: numeric('vacation_days'),
  sickDays: numeric('sick_days'),
  vacationBalance: numeric('vacation_balance'),
  bankTransferAmount: numeric('bank_transfer_amount'),
  status: text('status').default('pending').notNull(),
  rawExtraction: jsonb('raw_extraction'),
  pageNumber: integer('page_number'),
  extractedAt: timestamp('extracted_at'),
  reviewedAt: timestamp('reviewed_at'),
})

export const salaryComponents = pgTable('salary_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  payrollId: uuid('payroll_id').references(() => employeePayrolls.id).notNull(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  quantity: numeric('quantity'),
  rate: numeric('rate'),
  percent: numeric('percent'),
  amount: numeric('amount').notNull(),
})

export const uploadedFiles = pgTable('uploaded_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  batchId: uuid('batch_id').references(() => payrollBatches.id),
  fileName: text('file_name').notNull(),
  fileData: text('file_data').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
