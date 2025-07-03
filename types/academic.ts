export interface Term {
  id: string
  name: string
  year: number
  season: string
  isActive: boolean
  stats: {
    pendingTasks: number
    classes: number
    gpa: number
    completed: number
  }
}

export interface Class {
  id: string
  name: string
  code: string
  professor: string
  credits: number
  color: string
  termId: string
  currentGrade?: number
  assignments: { completed: number; total: number }
  gradingScheme: Record<string, { weight: number; count: number }>
  description?: string
  meetingTimes?: string
  location?: string
  createdAt: string
}

export interface Assignment {
  id: string
  title: string
  classId: string
  className: string
  classColor: string
  type: string
  termId: string
  dueDate: string
  dueTime: string
  priority: string
  completed: boolean
  grade?: number
  maxPoints?: number
  description?: string
  estimatedTime?: string
  notes?: string
  createdAt: string
  submittedFile?: {
    id: string
    name: string
    size: number
    type: string
    url: string
    uploadedAt: string
  }
}
