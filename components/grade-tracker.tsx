"use client"

import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Edit, TrendingUp, BarChart3, Target, Award, AlertCircle } from "lucide-react"
import { getCurrentUserId } from "@/lib/user"
import { api } from "@/convex/_generated/api"
import { Id, Doc } from "@/convex/_generated/dataModel"
import { GradeCalculator } from "@/lib/grade-calculator"
import { AssignmentDetailDialog } from "@/components/assignment-detail-dialog"

interface Term {
  id: string
  name: string
  isActive: boolean
  stats: {
    gpa: number
  }
}

interface GradeTrackerProps {
  currentTerm: Term
}

export function GradeTracker({ currentTerm }: GradeTrackerProps) {
  const userId = getCurrentUserId()
  
  // State for editing assignments
  const [editingAssignment, setEditingAssignment] = useState<Doc<"assignments"> | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // Fetch assignments and classes data
  const allAssignments = useQuery(
    api.assignments.getAllAssignments,
    currentTerm.id === "all-terms" ? { userId } : "skip"
  )

  const termAssignments = useQuery(
    api.assignments.getAssignmentsByTerm,
    currentTerm.id !== "all-terms" ? { userId, termId: currentTerm.id as Id<"terms"> } : "skip"
  )

  const assignments = currentTerm.id === "all-terms" ? allAssignments : termAssignments;
  
  const allClasses = useQuery(
    api.classes.getAllClasses,
    currentTerm.id === "all-terms" ? { userId } : "skip"
  )

  const termClasses = useQuery(
    api.classes.getClassesByTerm,
    currentTerm.id !== "all-terms" ? { userId, termId: currentTerm.id as Id<"terms"> } : "skip"
  )

  const classes = currentTerm.id === "all-terms" ? allClasses : termClasses;

  // Calculate comprehensive grade data
  const gradeData = useMemo(() => {
    if (!assignments || !classes) return null
    
    // Filter completed assignments with grades
    const gradedAssignments = assignments.filter(assignment => 
      assignment.completed && assignment.grade !== undefined && assignment.grade !== null
    )
    
    // Calculate class grades using grading schemes
    const classSummaries = classes.map(classData => {
      const classAssignments = gradedAssignments.filter(a => a.classId === classData._id)
      
      if (classAssignments.length === 0) {
        return {
          ...classData,
          currentGrade: null,
          letterGrade: 'N/A',
          assignmentCount: 0,
          totalAssignments: assignments.filter(a => a.classId === classData._id).length
        }
      }
      
      // Convert to format expected by GradeCalculator
      const formattedAssignments = classAssignments.map(a => ({
        id: a._id,
        name: a.title,
        type: a.type,
        grade: a.grade || 0,
        maxPoints: a.maxPoints || 100,
        date: a.dueDate
      }))
      
      // Convert grading scheme format
      const gradingScheme: { [key: string]: { weight: number; count: number } } = {}
      classData.gradingScheme.categories.forEach(category => {
        gradingScheme[category.name] = {
          weight: category.weight,
          count: category.count
        }
      })
      
      const currentGrade = GradeCalculator.calculateClassGrade(formattedAssignments, gradingScheme)
      const letterGrade = GradeCalculator.getLetterGrade(currentGrade)
      
      return {
        ...classData,
        currentGrade: isNaN(currentGrade) ? null : currentGrade,
        letterGrade: isNaN(currentGrade) ? 'N/A' : letterGrade,
        assignmentCount: classAssignments.length,
        totalAssignments: assignments.filter(a => a.classId === classData._id).length,
        assignments: formattedAssignments
      }
    })
    
    // Calculate overall term GPA
    const validGrades = classSummaries
      .filter(c => c.currentGrade !== null)
      .map(c => c.currentGrade!)
    
    const termGPA = validGrades.length > 0 ? GradeCalculator.calculateGPA(validGrades) : 0
    
    return {
      gradedAssignments,
      classSummaries,
      termGPA: isNaN(termGPA) ? 0 : termGPA,
      totalGradedAssignments: gradedAssignments.length,
      totalAssignments: assignments.length,
      averageGrade: gradedAssignments.length > 0 
        ? gradedAssignments.reduce((sum, a) => sum + ((a.grade || 0) / (a.maxPoints || 100)) * 100, 0) / gradedAssignments.length
        : 0
    }
  }, [assignments, classes])

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return "text-muted-foreground"
    if (percentage >= 90) return "text-green-600"
    if (percentage >= 80) return "text-blue-600"
    if (percentage >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getPerformanceIndicator = (percentage: number | null) => {
    if (percentage === null) return { icon: AlertCircle, color: "text-muted-foreground", label: "No data" }
    if (percentage >= 90) return { icon: Award, color: "text-green-600", label: "Excellent" }
    if (percentage >= 80) return { icon: Target, color: "text-blue-600", label: "Good" }
    if (percentage >= 70) return { icon: TrendingUp, color: "text-yellow-600", label: "Satisfactory" }
    return { icon: AlertCircle, color: "text-red-600", label: "Needs Improvement" }
  }

  const handleEditAssignment = (assignment: any) => {
    // Find the full assignment data from the assignments array
    const fullAssignment = assignments?.find(a => a._id === assignment._id)
    if (fullAssignment) {
      setEditingAssignment(fullAssignment)
      setIsEditDialogOpen(true)
    }
  }

  // Show loading state
  if (!assignments || !classes || !gradeData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading grade data...</p>
        </div>
      </div>
    )
  }

  if (gradeData.totalGradedAssignments === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No grades for {currentTerm.name}</h3>
        <p className="text-muted-foreground text-center">
          {currentTerm.isActive
            ? "Complete assignments and add grades to start tracking your progress."
            : "No grades were recorded for this term."}
        </p>
        {currentTerm.isActive && gradeData.totalAssignments > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              You have {gradeData.totalAssignments} assignments. Complete them and add grades to see your progress here!
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Grade Tracker - {currentTerm.name}</h2>
        <Badge variant={currentTerm.isActive ? "default" : "secondary"}>
          {currentTerm.isActive ? "Active Term" : "Past Term"}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Term GPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeData.termGPA.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {currentTerm.isActive && <TrendingUp className="h-3 w-3 mr-1 text-green-500" />}
              {currentTerm.isActive ? "Current term" : "Final GPA"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Graded Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeData.totalGradedAssignments}</div>
            <p className="text-xs text-muted-foreground">
              of {gradeData.totalAssignments} total assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeData.averageGrade.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion</span>
                <span>{Math.round((gradeData.totalGradedAssignments / gradeData.totalAssignments) * 100)}%</span>
              </div>
              <Progress 
                value={(gradeData.totalGradedAssignments / gradeData.totalAssignments) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Class Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gradeData.classSummaries.map((classData) => {
              const performance = getPerformanceIndicator(classData.currentGrade)
              const PerformanceIcon = performance.icon
              
              return (
                <Card key={classData._id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: classData.color }}
                      />
                      <span className="font-medium text-sm">{classData.name}</span>
                    </div>
                    <PerformanceIcon className={`h-4 w-4 ${performance.color}`} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Grade:</span>
                      <span className={`font-medium ${getGradeColor(classData.currentGrade)}`}>
                        {classData.currentGrade !== null 
                          ? `${classData.currentGrade.toFixed(1)}% (${classData.letterGrade})`
                          : 'No grades yet'
                        }
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Assignments:</span>
                      <span className="text-sm">
                        {classData.assignmentCount} graded / {classData.totalAssignments} total
                      </span>
                    </div>
                    
                    {classData.currentGrade !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{Math.round((classData.assignmentCount / classData.totalAssignments) * 100)}%</span>
                        </div>
                        <Progress 
                          value={(classData.assignmentCount / classData.totalAssignments) * 100} 
                          className="h-1"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Grades</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Date</TableHead>
                {currentTerm.isActive && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradeData.gradedAssignments
                .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                .slice(0, 20) // Show last 20 grades
                .map((assignment) => {
                  const percentage = assignment.maxPoints 
                    ? (assignment.grade! / assignment.maxPoints) * 100 
                    : assignment.grade!
                  
                  return (
                    <TableRow key={assignment._id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${assignment.classColor}`} />
                          <span>{assignment.className}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.grade}{assignment.maxPoints ? `/${assignment.maxPoints}` : '%'}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getGradeColor(percentage)}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{assignment.dueDate}</TableCell>
                      {currentTerm.isActive && (
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditAssignment(assignment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment Edit Dialog */}
      <AssignmentDetailDialog
        assignment={editingAssignment}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  )
}
