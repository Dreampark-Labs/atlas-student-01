// Smart prioritization utility for assignments
import { settingsStore } from './settings-store'

export interface Assignment {
  _id: string
  title: string
  dueDate: string
  dueTime: string
  type: string
  completed: boolean
  grade?: number
  maxPoints?: number
  weight?: number
  classId: string
}

export interface PriorityScore {
  assignmentId: string
  score: number
  factors: {
    urgency: number      // Based on due date
    importance: number   // Based on assignment type/weight
    impact: number      // Based on grade impact
    completion: number  // Penalty for incomplete assignments
  }
}

export class SmartPrioritizer {
  private static calculateUrgencyScore(dueDate: string, dueTime: string): number {
    const now = new Date()
    const due = new Date(`${dueDate} ${dueTime}`)
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    // Score based on hours until due (0-100)
    if (hoursUntilDue < 0) return 0 // Past due
    if (hoursUntilDue < 24) return 100 // Due within 24 hours
    if (hoursUntilDue < 72) return 80  // Due within 3 days
    if (hoursUntilDue < 168) return 60 // Due within 1 week
    if (hoursUntilDue < 336) return 40 // Due within 2 weeks
    return 20 // Due in more than 2 weeks
  }

  private static calculateImportanceScore(type: string, weight?: number): number {
    // Base importance by assignment type
    const typeImportance: Record<string, number> = {
      'Final': 100,
      'Midterm': 90,
      'Test': 85,
      'Exam': 85,
      'Project': 75,
      'Essay': 70,
      'Quiz': 60,
      'Homework': 50,
      'Lab': 45,
      'Discussion': 30,
      'Worksheet': 25
    }

    let score = typeImportance[type] || 50

    // Adjust based on weight if available
    if (weight) {
      score = score * (1 + weight / 100)
    }

    return Math.min(score, 100)
  }

  private static calculateImpactScore(grade?: number, maxPoints?: number, completed?: boolean): number {
    if (completed) return 0 // No impact if already completed
    
    // If no grade yet, assume medium impact
    if (grade === undefined || grade === null) return 60
    
    // Calculate current performance
    const percentage = maxPoints ? (grade / maxPoints) * 100 : grade
    
    // Higher impact for assignments where improvement is needed
    if (percentage < 60) return 90
    if (percentage < 70) return 75
    if (percentage < 80) return 60
    if (percentage < 90) return 45
    return 30
  }

  private static calculateCompletionScore(completed: boolean): number {
    return completed ? 0 : 100 // High penalty for incomplete assignments
  }

  public static prioritizeAssignments(assignments: Assignment[]): Assignment[] {
    const settings = settingsStore.getSettings()
    
    if (!settings.smartPrioritization) {
      // Return original order if smart prioritization is disabled
      return assignments
    }

    const scoredAssignments = assignments.map(assignment => {
      const urgency = this.calculateUrgencyScore(assignment.dueDate, assignment.dueTime)
      const importance = this.calculateImportanceScore(assignment.type, assignment.weight)
      const impact = this.calculateImpactScore(assignment.grade, assignment.maxPoints, assignment.completed)
      const completion = this.calculateCompletionScore(assignment.completed)

      // Weighted formula for final priority score
      const score = (
        urgency * 0.4 +      // 40% urgency (due date)
        importance * 0.3 +   // 30% importance (type/weight)
        impact * 0.2 +       // 20% impact (grade improvement potential)
        completion * 0.1     // 10% completion status
      )

      return {
        assignment,
        score,
        factors: { urgency, importance, impact, completion }
      }
    })

    // Sort by score (highest first) and return assignments
    return scoredAssignments
      .sort((a, b) => b.score - a.score)
      .map(item => item.assignment)
  }

  public static getPriorityScores(assignments: Assignment[]): PriorityScore[] {
    return assignments.map(assignment => {
      const urgency = this.calculateUrgencyScore(assignment.dueDate, assignment.dueTime)
      const importance = this.calculateImportanceScore(assignment.type, assignment.weight)
      const impact = this.calculateImpactScore(assignment.grade, assignment.maxPoints, assignment.completed)
      const completion = this.calculateCompletionScore(assignment.completed)

      const score = (
        urgency * 0.4 +
        importance * 0.3 +
        impact * 0.2 +
        completion * 0.1
      )

      return {
        assignmentId: assignment._id,
        score,
        factors: { urgency, importance, impact, completion }
      }
    })
  }

  public static getPriorityLabel(score: number): string {
    if (score >= 80) return "Very High"
    if (score >= 60) return "High"
    if (score >= 40) return "Medium"
    if (score >= 20) return "Low"
    return "Very Low"
  }

  public static getPriorityColor(score: number): string {
    if (score >= 80) return "text-red-600"
    if (score >= 60) return "text-orange-600"
    if (score >= 40) return "text-yellow-600"
    if (score >= 20) return "text-blue-600"
    return "text-gray-600"
  }
}
