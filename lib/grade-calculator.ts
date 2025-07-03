export interface GradingSchemeCategory {
  weight: number
  count: number
  dropLowest?: number
}

export interface GradingScheme {
  mode?: string // "percentage" (default) or "points"
  [categoryName: string]: GradingSchemeCategory | string | undefined
}

export interface Assignment {
  id: string
  name: string
  type: string
  grade: number
  maxPoints: number
  date: string
}

export class GradeCalculator {
  static calculateClassGrade(assignments: Assignment[], gradingScheme: GradingScheme): number {
    const categoryGrades: { [category: string]: number[] } = {}
    const mode = gradingScheme.mode || "percentage"

    // Group assignments by category
    assignments.forEach((assignment) => {
      if (!categoryGrades[assignment.type]) {
        categoryGrades[assignment.type] = []
      }
      categoryGrades[assignment.type].push((assignment.grade / assignment.maxPoints) * 100)
    })

    let totalWeightedScore = 0
    let totalWeight = 0

    // Calculate weighted average for each category
    Object.entries(gradingScheme).forEach(([category, scheme]) => {
      // Skip the mode property
      if (category === 'mode' || typeof scheme === 'string' || !scheme) return
      
      const grades = categoryGrades[category] || []
      if (grades.length > 0) {
        let categoryGradesToUse = [...grades]
        
        // Drop lowest grades if specified
        if (scheme.dropLowest && scheme.dropLowest > 0) {
          if (grades.length > scheme.dropLowest) {
            // Sort grades and remove the lowest N grades
            categoryGradesToUse = grades
              .sort((a, b) => b - a) // Sort descending (highest first)
              .slice(0, grades.length - scheme.dropLowest) // Remove N lowest grades
          } else {
            // If dropLowest >= number of grades, use the highest grade only
            categoryGradesToUse = grades.length > 0 ? [Math.max(...grades)] : []
          }
        }
        
        // Calculate average from remaining grades
        const categoryAverage = categoryGradesToUse.length > 0 
          ? categoryGradesToUse.reduce((sum, grade) => sum + grade, 0) / categoryGradesToUse.length
          : 0

        if (mode === "percentage") {
          // Traditional percentage-based grading
          totalWeightedScore += categoryAverage * (scheme.weight / 100)
          totalWeight += scheme.weight
        } else {
          // Points-based grading
          // In points mode, we need to calculate the proportion of possible points earned
          const pointsEarned = (categoryAverage / 100) * scheme.weight
          totalWeightedScore += pointsEarned
          totalWeight += scheme.weight
        }
      }
    })

    if (mode === "percentage") {
      // For percentage mode, we expect weights to total 100%
      return totalWeight > 0 ? (totalWeightedScore / (totalWeight / 100)) : 0
    } else {
      // For points mode, calculate percentage of total possible points
      return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0
    }
  }

  static calculateGPA(classGrades: number[]): number {
    const gradePoints = classGrades.map((grade) => {
      if (grade >= 97) return 4.0
      if (grade >= 93) return 4.0
      if (grade >= 90) return 3.7
      if (grade >= 87) return 3.3
      if (grade >= 83) return 3.0
      if (grade >= 80) return 2.7
      if (grade >= 77) return 2.3
      if (grade >= 73) return 2.0
      if (grade >= 70) return 1.7
      if (grade >= 67) return 1.3
      if (grade >= 65) return 1.0
      return 0.0
    })

    return gradePoints.reduce((sum: number, points: number) => sum + points, 0) / gradePoints.length
  }

  static getLetterGrade(percentage: number): string {
    if (percentage >= 97) return "A+"
    if (percentage >= 93) return "A"
    if (percentage >= 90) return "A-"
    if (percentage >= 87) return "B+"
    if (percentage >= 83) return "B"
    if (percentage >= 80) return "B-"
    if (percentage >= 77) return "C+"
    if (percentage >= 73) return "C"
    if (percentage >= 70) return "C-"
    if (percentage >= 67) return "D+"
    if (percentage >= 65) return "D"
    return "F"
  }

  static predictFinalGrade(
    currentAssignments: Assignment[],
    gradingScheme: GradingScheme,
    targetGrade: number,
  ): { [category: string]: number } {
    const predictions: { [category: string]: number } = {}

    // Calculate current weighted score
    const currentGrade = this.calculateClassGrade(currentAssignments, gradingScheme)
    const currentWeight = this.calculateCurrentWeight(currentAssignments, gradingScheme)
    const remainingWeight = 100 - currentWeight

    if (remainingWeight <= 0) {
      return predictions
    }

    // Calculate needed score for remaining assignments
    const neededPoints = targetGrade * 100 - currentGrade * currentWeight
    const neededAverage = neededPoints / remainingWeight

    Object.entries(gradingScheme).forEach(([category, scheme]) => {
      // Skip the mode property
      if (category === 'mode' || typeof scheme === 'string' || !scheme) return
      
      const categoryAssignments = currentAssignments.filter((a) => a.type === category)
      if (categoryAssignments.length < scheme.count) {
        predictions[category] = Math.max(0, Math.min(100, neededAverage))
      }
    })

    return predictions
  }

  private static calculateCurrentWeight(assignments: Assignment[], gradingScheme: GradingScheme): number {
    let currentWeight = 0

    Object.entries(gradingScheme).forEach(([category, scheme]) => {
      // Skip the mode property
      if (category === 'mode' || typeof scheme === 'string' || !scheme) return
      
      const categoryAssignments = assignments.filter((a) => a.type === category)
      if (categoryAssignments.length > 0) {
        const completionRatio = Math.min(1, categoryAssignments.length / scheme.count)
        currentWeight += scheme.weight * completionRatio
      }
    })

    return currentWeight
  }
}
