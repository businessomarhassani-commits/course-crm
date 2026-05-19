import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    New: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Contacted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Interested: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Follow-up': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Closed: 'bg-green-500/20 text-green-400 border-green-500/30',
    'No answer': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    Lost: 'bg-red-500/20 text-red-400 border-red-500/30',
    Refund: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    Pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
    Refunded: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

export function getRoleColor(role: string) {
  const colors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    closer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    partner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    support: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  return colors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        const str = val === null || val === undefined ? '' : String(val)
        return str.includes(',') ? `"${str}"` : str
      }).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
