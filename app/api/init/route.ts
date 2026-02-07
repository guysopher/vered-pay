import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db'

export async function POST() {
  try {
    await initializeDatabase()
    return NextResponse.json({ success: true, message: 'Database initialized' })
  } catch (error) {
    console.error('DB init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(error) },
      { status: 500 }
    )
  }
}
