import type { Term, Class, Assignment } from "@/types/academic"

// Local storage keys
const TERMS_KEY = "academic_tracker_terms"
const CLASSES_KEY = "academic_tracker_classes"
const ASSIGNMENTS_KEY = "academic_tracker_assignments"
const ONBOARDING_KEY = "academic_tracker_onboarding_complete"

// In-memory store with localStorage persistence
class AcademicStore {
  private terms: Term[] = []
  private classes: Class[] = []
  private assignments: Assignment[] = []

  constructor() {
    this.loadFromStorage()
    // Don't initialize default data automatically
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return

    try {
      const termsData = localStorage.getItem(TERMS_KEY)
      const classesData = localStorage.getItem(CLASSES_KEY)
      const assignmentsData = localStorage.getItem(ASSIGNMENTS_KEY)

      if (termsData) this.terms = JSON.parse(termsData)
      if (classesData) this.classes = JSON.parse(classesData)
      if (assignmentsData) this.assignments = JSON.parse(assignmentsData)
    } catch (error) {
      console.error("Error loading data from storage:", error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(TERMS_KEY, JSON.stringify(this.terms))
      localStorage.setItem(CLASSES_KEY, JSON.stringify(this.classes))
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(this.assignments))
    } catch (error) {
      console.error("Error saving data to storage:", error)
    }
  }

  // Onboarding methods
  isFirstTimeUser(): boolean {
    if (typeof window === "undefined") return false
    return !localStorage.getItem(ONBOARDING_KEY) && this.terms.length === 0
  }

  markOnboardingComplete(): void {
    if (typeof window === "undefined") return
    localStorage.setItem(ONBOARDING_KEY, "true")
  }

  // Create first term for new users
  createFirstTerm(): Term {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
    
    let season = "Fall"
    if (currentMonth >= 1 && currentMonth <= 5) {
      season = "Spring"
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      season = "Summer"
    }

    const defaultTerm: Term = {
      id: `${season.toLowerCase()}${currentYear}`,
      name: `${season} ${currentYear}`,
      year: currentYear,
      season: season,
      isActive: true,
      stats: {
        pendingTasks: 0,
        classes: 0,
        gpa: 0.0,
        completed: 0,
      },
    }
    
    this.terms.push(defaultTerm)
    // Don't mark onboarding complete here - let the tour component handle it
    this.saveToStorage()
    return defaultTerm
  }

  // Term methods
  getTerms(): Term[] {
    return [...this.terms]
  }

  getTerm(id: string): Term | undefined {
    return this.terms.find((term) => term.id === id)
  }

  addTerm(term: Omit<Term, "id" | "stats">): Term {
    const newTerm: Term = {
      ...term,
      id: `${term.season.toLowerCase()}${term.year}`,
      stats: {
        pendingTasks: 0,
        classes: 0,
        gpa: 0.0,
        completed: 0,
      },
    }

    // Set all other terms to inactive
    this.terms.forEach((t) => (t.isActive = false))
    this.terms.unshift(newTerm)
    this.saveToStorage()
    this.updateTermStats(newTerm.id)
    return newTerm
  }

  setActiveTerm(termId: string): void {
    this.terms.forEach((term) => {
      term.isActive = term.id === termId
    })
    this.saveToStorage()
  }

  updateTermStats(termId: string): void {
    const term = this.terms.find((t) => t.id === termId)
    if (!term) return

    const termClasses = this.getClassesByTerm(termId)
    const termAssignments = this.getAssignmentsByTerm(termId)

    term.stats.classes = termClasses.length
    term.stats.pendingTasks = termAssignments.filter((a) => !a.completed).length
    term.stats.completed = termAssignments.filter((a) => a.completed).length

    // Calculate GPA (simplified)
    const classGrades = termClasses.filter((c) => c.currentGrade).map((c) => c.currentGrade!)
    if (classGrades.length > 0) {
      const avgGrade = classGrades.reduce((sum, grade) => sum + grade, 0) / classGrades.length
      term.stats.gpa = Number(((avgGrade / 100) * 4).toFixed(1))
    }

    this.saveToStorage()
  }

  // Class methods
  getClasses(): Class[] {
    return [...this.classes]
  }

  getClassesByTerm(termId: string): Class[] {
    return this.classes.filter((cls) => cls.termId === termId)
  }

  getClass(id: string): Class | undefined {
    return this.classes.find((cls) => cls.id === id)
  }

  addClass(classData: Omit<Class, "id" | "assignments" | "createdAt">): Class {
    const newClass: Class = {
      ...classData,
      id: `class-${Date.now()}`,
      assignments: { completed: 0, total: 0 },
      createdAt: new Date().toISOString(),
    }
    this.classes.push(newClass)
    this.updateTermStats(classData.termId)
    this.saveToStorage()
    return newClass
  }

  updateClass(id: string, updates: Partial<Class>): Class | undefined {
    const classIndex = this.classes.findIndex((cls) => cls.id === id)
    if (classIndex === -1) return undefined

    const oldTermId = this.classes[classIndex].termId
    this.classes[classIndex] = { ...this.classes[classIndex], ...updates }

    // Update stats for both old and new terms if term changed
    this.updateTermStats(oldTermId)
    if (updates.termId && updates.termId !== oldTermId) {
      this.updateTermStats(updates.termId)
    }

    this.saveToStorage()
    return this.classes[classIndex]
  }

  // Assignment methods
  getAssignments(): Assignment[] {
    return [...this.assignments]
  }

  getAssignmentsByTerm(termId: string): Assignment[] {
    return this.assignments.filter((assignment) => assignment.termId === termId)
  }

  getAssignmentsByClass(classId: string): Assignment[] {
    return this.assignments.filter((assignment) => assignment.classId === classId)
  }

  getAssignment(id: string): Assignment | undefined {
    return this.assignments.find((assignment) => assignment.id === id)
  }

  addAssignment(assignmentData: Omit<Assignment, "id" | "createdAt">): Assignment {
    const newAssignment: Assignment = {
      ...assignmentData,
      id: `assignment-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    this.assignments.push(newAssignment)

    // Update class assignment count
    const classObj = this.getClass(assignmentData.classId)
    if (classObj) {
      classObj.assignments.total += 1
      if (assignmentData.completed) {
        classObj.assignments.completed += 1
      }
    }

    this.updateTermStats(assignmentData.termId)
    this.saveToStorage()
    return newAssignment
  }

  updateAssignment(id: string, updates: Partial<Assignment>): Assignment | undefined {
    const assignmentIndex = this.assignments.findIndex((assignment) => assignment.id === id)
    if (assignmentIndex === -1) return undefined

    const oldAssignment = this.assignments[assignmentIndex]
    const oldTermId = oldAssignment.termId
    const oldClassId = oldAssignment.classId
    const wasCompleted = oldAssignment.completed

    this.assignments[assignmentIndex] = { ...oldAssignment, ...updates }
    const updatedAssignment = this.assignments[assignmentIndex]

    // Update class assignment counts
    if (updates.classId && updates.classId !== oldClassId) {
      // Remove from old class
      const oldClass = this.getClass(oldClassId)
      if (oldClass) {
        oldClass.assignments.total -= 1
        if (wasCompleted) oldClass.assignments.completed -= 1
      }

      // Add to new class
      const newClass = this.getClass(updates.classId)
      if (newClass) {
        newClass.assignments.total += 1
        if (updatedAssignment.completed) newClass.assignments.completed += 1
      }
    } else if (updates.completed !== undefined && updates.completed !== wasCompleted) {
      // Update completion status in same class
      const classObj = this.getClass(oldClassId)
      if (classObj) {
        if (updates.completed) {
          classObj.assignments.completed += 1
        } else {
          classObj.assignments.completed -= 1
        }
      }
    }

    // Update stats for affected terms
    this.updateTermStats(oldTermId)
    if (updates.termId && updates.termId !== oldTermId) {
      this.updateTermStats(updates.termId)
    }

    this.saveToStorage()
    return updatedAssignment
  }

  deleteAssignment(id: string): boolean {
    const assignmentIndex = this.assignments.findIndex((assignment) => assignment.id === id)
    if (assignmentIndex === -1) return false

    const assignment = this.assignments[assignmentIndex]

    // Update class assignment count
    const classObj = this.getClass(assignment.classId)
    if (classObj) {
      classObj.assignments.total -= 1
      if (assignment.completed) {
        classObj.assignments.completed -= 1
      }
    }

    this.assignments.splice(assignmentIndex, 1)
    this.updateTermStats(assignment.termId)
    this.saveToStorage()
    return true
  }

  // File storage methods
  uploadAssignmentFile(assignmentId: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const assignment = this.getAssignment(assignmentId)
        if (!assignment) {
          reject(new Error("Assignment not found"))
          return
        }

        // Create a file reader to convert file to base64 for storage
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const fileData = {
              id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              size: file.size,
              type: file.type,
              url: reader.result as string, // base64 data URL
              uploadedAt: new Date().toISOString(),
            }

            // Update assignment with file data
            this.updateAssignment(assignmentId, { submittedFile: fileData })
            resolve(fileData.id)
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsDataURL(file)
      } catch (error) {
        reject(error)
      }
    })
  }

  removeAssignmentFile(assignmentId: string): boolean {
    try {
      const assignment = this.getAssignment(assignmentId)
      if (!assignment || !assignment.submittedFile) {
        return false
      }

      this.updateAssignment(assignmentId, { submittedFile: undefined })
      return true
    } catch (error) {
      console.error("Error removing assignment file:", error)
      return false
    }
  }

  getAssignmentsWithFiles(termId?: string): Assignment[] {
    let assignments = this.assignments.filter(assignment => assignment.submittedFile)
    
    if (termId) {
      assignments = assignments.filter(assignment => assignment.termId === termId)
    }
    
    return assignments.sort((a, b) => 
      new Date(b.submittedFile!.uploadedAt).getTime() - new Date(a.submittedFile!.uploadedAt).getTime()
    )
  }

  downloadAssignmentFile(assignmentId: string): void {
    const assignment = this.getAssignment(assignmentId)
    if (!assignment?.submittedFile) {
      console.error("No file found for assignment")
      return
    }

    const link = document.createElement('a')
    link.href = assignment.submittedFile.url
    link.download = assignment.submittedFile.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Debug method to see current data
  getDebugInfo(): any {
    return {
      terms: this.terms,
      classes: this.classes,
      assignments: this.assignments,
      isFirstTime: this.isFirstTimeUser(),
      hasOnboardingKey: typeof window !== "undefined" ? !!localStorage.getItem(ONBOARDING_KEY) : false
    }
  }

  // Clear all data (useful for testing or reset)
  clearAllData(): void {
    this.terms = []
    this.classes = []
    this.assignments = []
    
    if (typeof window !== "undefined") {
      localStorage.removeItem(TERMS_KEY)
      localStorage.removeItem(CLASSES_KEY)
      localStorage.removeItem(ASSIGNMENTS_KEY)
      localStorage.removeItem(ONBOARDING_KEY)
    }
  }
}

// Export singleton instance
export const academicStore = new AcademicStore()

// Make debug methods available globally in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  ;(window as any).academicStoreInstance = academicStore
  ;(window as any).debugAcademicStore = () => {
    console.log("Academic Store Debug Info:", academicStore.getDebugInfo())
  }
  ;(window as any).clearAcademicStore = () => {
    academicStore.clearAllData()
    console.log("Academic store cleared!")
  }
}
