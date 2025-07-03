// Utility functions for automatic assignment categorization

export interface CategoryMapping {
  standardName: string
  variations: string[]
  priority: number // Higher priority takes precedence when multiple matches
}

// Define standard category mappings with variations
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    standardName: "Homework",
    variations: [
      "homework", "hw", "home work", "homeworks", "assignment", "assignments",
      "problem set", "problem sets", "ps", "practice", "exercises", "exercise"
    ],
    priority: 1
  },
  {
    standardName: "Quiz",
    variations: [
      "quiz", "quizzes", "pop quiz", "weekly quiz", "chapter quiz", "unit quiz"
    ],
    priority: 3
  },
  {
    standardName: "Test",
    variations: [
      "test", "tests", "exam", "exams", "examination", "unit test", "chapter test"
    ],
    priority: 4
  },
  {
    standardName: "Midterm",
    variations: [
      "midterm", "midterms", "mid-term", "mid term", "midterm exam", "midterm examination",
      "middle exam", "interim exam"
    ],
    priority: 5
  },
  {
    standardName: "Final",
    variations: [
      "final", "finals", "final exam", "final examination", "final test",
      "cumulative exam", "comprehensive exam", "end of term exam"
    ],
    priority: 6
  },
  {
    standardName: "Lab",
    variations: [
      "lab", "labs", "laboratory", "lab report", "lab assignment", "lab work",
      "practical", "practicals", "lab exercise"
    ],
    priority: 2
  },
  {
    standardName: "Worksheet",
    variations: [
      "worksheet", "worksheets", "work sheet", "work sheets", "activity sheet",
      "practice sheet", "study sheet"
    ],
    priority: 1
  },
  {
    standardName: "Project",
    variations: [
      "project", "projects", "group project", "individual project", "research project",
      "term project", "capstone", "portfolio"
    ],
    priority: 3
  },
  {
    standardName: "Essay",
    variations: [
      "essay", "essays", "paper", "papers", "research paper", "term paper",
      "writing assignment", "composition", "report", "reports"
    ],
    priority: 3
  },
  {
    standardName: "Discussion",
    variations: [
      "discussion", "discussions", "forum", "participation", "comment",
      "discussion post", "discussion board", "online discussion"
    ],
    priority: 1
  }
]

/**
 * Automatically categorize an assignment type based on common variations
 */
export function categorizeAssignmentType(inputType: string): string {
  if (!inputType || typeof inputType !== 'string') {
    return inputType || "Other"
  }

  const normalizedInput = inputType.toLowerCase().trim()
  
  // Find all matching categories
  const matches = CATEGORY_MAPPINGS.filter(mapping =>
    mapping.variations.some(variation => {
      const normalizedVariation = variation.toLowerCase()
      // Check for exact match or if the input contains the variation
      return normalizedInput === normalizedVariation || 
             normalizedInput.includes(normalizedVariation) ||
             normalizedVariation.includes(normalizedInput)
    })
  )

  if (matches.length === 0) {
    return inputType // Return original if no match found
  }

  // If multiple matches, use the one with highest priority
  const bestMatch = matches.reduce((prev, current) => 
    current.priority > prev.priority ? current : prev
  )

  return bestMatch.standardName
}

/**
 * Find the best matching grading category for an assignment type
 */
export function findMatchingGradingCategory(
  assignmentType: string, 
  gradingCategories: Array<{ name: string; weight: number; count: number; dropLowest?: number }>
): string {
  if (!assignmentType || !gradingCategories || gradingCategories.length === 0) {
    return assignmentType
  }

  const standardizedType = categorizeAssignmentType(assignmentType)
  
  // First, try to find an exact match with the standardized type
  const exactMatch = gradingCategories.find(category => 
    category.name.toLowerCase() === standardizedType.toLowerCase()
  )
  
  if (exactMatch) {
    return exactMatch.name
  }

  // Then try to find a category that contains the standardized type
  const containsMatch = gradingCategories.find(category =>
    category.name.toLowerCase().includes(standardizedType.toLowerCase()) ||
    standardizedType.toLowerCase().includes(category.name.toLowerCase())
  )

  if (containsMatch) {
    return containsMatch.name
  }

  // If no match found, try matching with the original type
  const originalMatch = gradingCategories.find(category =>
    category.name.toLowerCase().includes(assignmentType.toLowerCase()) ||
    assignmentType.toLowerCase().includes(category.name.toLowerCase())
  )

  return originalMatch ? originalMatch.name : assignmentType
}

/**
 * Get suggested grading categories based on common assignment types
 */
export function getSuggestedGradingCategories(): Array<{ name: string; weight: number; count: number; dropLowest?: number }> {
  return [
    { name: "Homework", weight: 30, count: 10, dropLowest: 1 },
    { name: "Quiz", weight: 20, count: 6, dropLowest: 1 },
    { name: "Test", weight: 25, count: 3, dropLowest: 0 },
    { name: "Final", weight: 25, count: 1, dropLowest: 0 }
  ]
}

/**
 * Auto-standardize assignment types in bulk
 */
export function standardizeAssignmentTypes(assignments: Array<{ type: string; [key: string]: any }>): Array<{ type: string; [key: string]: any }> {
  return assignments.map(assignment => ({
    ...assignment,
    type: categorizeAssignmentType(assignment.type)
  }))
}
