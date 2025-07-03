import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if an assignment is overdue based on its due date
 * @param dueDate - The due date string (ISO format or legacy format)
 * @returns true if the assignment is overdue (past due date)
 */
export function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false
  
  // Get today's date at midnight (normalize time to 00:00:00)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Parse due date (handle both YYYY-MM-DD and legacy MM/DD/YYYY formats)
  let due: Date
  if (dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // New ISO format
    due = new Date(dueDate + 'T00:00:00')
  } else {
    // Legacy format or other format
    due = new Date(dueDate)
  }
  due.setHours(0, 0, 0, 0)
  
  // Return true if due date is in the past
  return due.getTime() < today.getTime()
}

/**
 * Format a date for display using user preferences
 * @param date - Date string or Date object
 * @param dateFormat - User's preferred date format
 * @param timeFormat - User's preferred time format (optional)
 * @returns formatted date string
 */
export function formatDate(date: string | Date, dateFormat?: string, timeFormat?: string): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ''
  
  // Use Intl.DateTimeFormat for consistent formatting
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  // If timeFormat is provided, include time
  if (timeFormat) {
    options.hour = 'numeric'
    options.minute = '2-digit'
    options.hour12 = timeFormat === '12-hour'
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj)
}

/**
 * Get date and time formatted for HTML input elements
 * @param date - Date string or Date object
 * @returns object with date and time strings for HTML inputs
 */
export function getDateTimeForInput(date: string | Date): { date: string; time: string } {
  if (!date) return { date: '', time: '' }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return { date: '', time: '' }
  
  // Format for HTML date input (YYYY-MM-DD)
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  const dateString = `${year}-${month}-${day}`
  
  // Format for HTML time input (HH:MM)
  const hours = String(dateObj.getHours()).padStart(2, '0')
  const minutes = String(dateObj.getMinutes()).padStart(2, '0')
  const timeString = `${hours}:${minutes}`
  
  return { date: dateString, time: timeString }
}
