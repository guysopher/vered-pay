'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'לוח בקרה', icon: '📊' },
  { href: '/upload', label: 'העלאת תלושים', icon: '📤' },
  { href: '/employees', label: 'עובדים', icon: '👥' },
  { href: '/reports', label: 'דוחות', icon: '📈' },
  { href: '/chat', label: 'צ׳אט AI', icon: '💬' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-l border-gray-200 min-h-screen flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-blue-700">VERED PAY</h1>
        <p className="text-xs text-gray-400 mt-1">ניהול שכר והטבות</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <span className="text-lg">🚪</span>
          יציאה
        </button>
      </div>
    </aside>
  )
}
