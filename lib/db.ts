import { sql } from '@vercel/postgres'
import { drizzle } from 'drizzle-orm/vercel-postgres'
import * as schema from './schema'

export const db = drizzle(sql, { schema })

let dbInitialized = false

export async function ensureDB() {
  if (dbInitialized) return
  await initializeDatabase()
  dbInitialized = true
}

export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      employer_number TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID REFERENCES companies(id),
      name TEXT NOT NULL,
      national_id TEXT NOT NULL UNIQUE,
      department TEXT,
      role TEXT,
      start_date TEXT,
      marital_status TEXT,
      tax_credit_points NUMERIC,
      bank_account TEXT,
      bank_branch TEXT,
      status TEXT DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS payroll_batches (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID REFERENCES companies(id),
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      status TEXT DEFAULT 'processing' NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS employee_payrolls (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      batch_id UUID REFERENCES payroll_batches(id) NOT NULL,
      employee_id UUID REFERENCES employees(id) NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      gross_salary NUMERIC,
      net_salary NUMERIC,
      total_deductions NUMERIC,
      work_days NUMERIC,
      work_hours NUMERIC,
      hourly_rate NUMERIC,
      overtime_hours NUMERIC,
      vacation_days NUMERIC,
      sick_days NUMERIC,
      vacation_balance NUMERIC,
      bank_transfer_amount NUMERIC,
      status TEXT DEFAULT 'pending' NOT NULL,
      raw_extraction JSONB,
      page_number INTEGER,
      extracted_at TIMESTAMP,
      reviewed_at TIMESTAMP
    )
  `

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_payroll_unique
    ON employee_payrolls (employee_id, month, year)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS salary_components (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      payroll_id UUID REFERENCES employee_payrolls(id) NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity NUMERIC,
      rate NUMERIC,
      percent NUMERIC,
      amount NUMERIC NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      batch_id UUID REFERENCES payroll_batches(id),
      file_name TEXT NOT NULL,
      file_data TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `
}
