"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  BookOpen, 
  CheckSquare, 
  BarChart3, 
  Plus, 
  Calendar, 
  Target, 
  Award, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  GraduationCap,
  Settings,
  Filter
} from "lucide-react"
import { getCurrentUserId } from "@/lib/user"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { GradeCalculator } from "@/lib/grade-calculator"
import { TodoList } from "@/components/todo-list"
import { toast } from "sonner"
import { useMutation } from "convex/react"
import { isOverdue, getDateTimeForInput } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"

interface Term {
  id: string
  _id: string
  name: string
  isActive: boolean
  stats: {
    gpa: number
    pendingTasks: number
    classes: number
    completed: number
  }
}

interface AnalyticsDashboardProps {
  currentTerm: Term
  onAddAssignments: () => void
  onAddClass: () => void
  onManageTerms: () => void
  onNavigate: (view: string) => void
}

export function AnalyticsDashboard({ 
  currentTerm, 
  onAddAssignments, 
  onAddClass, 
  onManageTerms, 
  onNavigate 
}: AnalyticsDashboardProps) {
  const userId = getCurrentUserId()
  const { settings, formatDate } = useSettings()
  
  // Fetch all necessary data
  const assignments = useQuery(api.assignments.getAssignmentsByTerm, {
    userId,
    termId: currentTerm.id as Id<"terms">
  })
  
  const classes = useQuery(api.classes.getClassesByTerm, {
    userId,
    termId: currentTerm.id as Id<"terms">
  })

  const updateAssignment = useMutation(api.assignments.updateAssignment)

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    if (!assignments || !classes) return null

    // Filter out soft-deleted assignments
    const activeAssignments = assignments.filter(a => !a.isDeleted)
    
    // Basic counts
    const totalAssignments = activeAssignments.length
    const completedAssignments = activeAssignments.filter(a => a.completed).length
    const pendingAssignments = activeAssignments.filter(a => !a.completed).length
    
    // Graded assignments (completed with grades)
    const gradedAssignments = activeAssignments.filter(a => 
      a.completed && a.grade !== undefined && a.grade !== null
    )
    
    // Assignments due this week
    const today = new Date()
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const assignmentsDueThisWeek = activeAssignments.filter(a => {
      if (a.completed) return false
      const dueDate = new Date(a.dueDate)
      return dueDate >= today && dueDate <= weekFromNow
    })

    // Overdue assignments
    const overdueAssignments = activeAssignments.filter(a => 
      !a.completed && isOverdue(a.dueDate)
    )

    // Calculate class grades using the grading schemes
    const classPerformance = classes.map(classData => {
      const classAssignments = gradedAssignments.filter(a => a.classId === classData._id)
      
      if (classAssignments.length === 0) {
        return {
          ...classData,
          currentGrade: null,
          letterGrade: 'N/A',
          assignmentCount: 0,
          totalAssignments: activeAssignments.filter(a => a.classId === classData._id).length
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
        totalAssignments: activeAssignments.filter(a => a.classId === classData._id).length
      }
    })

    // Calculate term GPA
    const validGrades = classPerformance
      .filter(c => c.currentGrade !== null)
      .map(c => c.currentGrade!)
    
    const termGPA = validGrades.length > 0 ? GradeCalculator.calculateGPA(validGrades) : 0

    // Calculate average grade percentage
    const averageGrade = gradedAssignments.length > 0 
      ? gradedAssignments.reduce((sum, a) => sum + ((a.grade || 0) / (a.maxPoints || 100)) * 100, 0) / gradedAssignments.length
      : 0

    // Calculate completion percentage
    const completionPercentage = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

    return {
      totalAssignments,
      completedAssignments,
      pendingAssignments,
      gradedAssignments: gradedAssignments.length,
      assignmentsDueThisWeek,
      overdueAssignments,
      classPerformance,
      termGPA: isNaN(termGPA) ? 0 : termGPA,
      averageGrade: isNaN(averageGrade) ? 0 : averageGrade,
      completionPercentage: isNaN(completionPercentage) ? 0 : completionPercentage,
      recentGrades: gradedAssignments
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 5)
    }
  }, [assignments, classes])

  const handleCompleteAssignment = async (assignmentId: string, completed: boolean) => {
    try {
      await updateAssignment({
        assignmentId: assignmentId as Id<"assignments">,
        updates: { 
          completed
        },
        userId
      })
      
      toast.success(completed ? "Assignment marked as completed" : "Assignment marked as incomplete")
    } catch (error) {
      console.error("Error updating assignment:", error)
      toast.error("Failed to update assignment")
    }
  }

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return "text-muted-foreground"
    if (percentage >= 90) return "text-green-600"
    if (percentage >= 80) return "text-blue-600"
    if (percentage >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  // Show loading state
  if (!assignments || !classes || !analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Term Management */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span>Welcome to {currentTerm.name} Dashboard 🎓</span>
            </div>
            <Button variant="outline" size="sm" onClick={onManageTerms}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Terms
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Track your academic progress and stay on top of deadlines
            </p>
            <Badge variant={currentTerm.isActive ? "default" : "secondary"}>
              {currentTerm.isActive ? "Active Term" : "Past Term"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate("todo")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overdueAssignments.length > 0 && (
                <span className="text-red-600 font-medium">
                  {analytics.overdueAssignments.length} overdue
                </span>
              )}
              {analytics.overdueAssignments.length === 0 && "All caught up! 🎉"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate("classes")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">This term</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate("grades")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Term GPA</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.termGPA.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {currentTerm.isActive && <TrendingUp className="h-3 w-3 mr-1 text-green-500" />}
              {analytics.gradedAssignments > 0 ? "Based on grades" : "No grades yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded Assignments</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.gradedAssignments}</div>
            <p className="text-xs text-muted-foreground">
              of {analytics.totalAssignments} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assignments Due This Week */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span>Assignments Due This Week</span>
              <Badge variant="outline">{analytics.assignmentsDueThisWeek.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("todo")}>
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.assignmentsDueThisWeek.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground">No assignments due this week! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.assignmentsDueThisWeek.slice(0, 5).map((assignment) => {
                const classData = classes.find(c => c._id === assignment.classId)
                const dueDate = new Date(assignment.dueDate)
                const overdue = isOverdue(assignment.dueDate)
                
                return (
                  <div key={assignment._id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                    <Checkbox
                      checked={assignment.completed}
                      onCheckedChange={(checked) => 
                        handleCompleteAssignment(assignment._id, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: classData?.color || '#6b7280' }}
                        />
                        <p className="font-medium truncate">{assignment.title}</p>
                        {overdue && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {classData?.name} • Due {formatDate(new Date(assignment.dueDate))}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {assignment.type}
                    </Badge>
                  </div>
                )
              })}
              {analytics.assignmentsDueThisWeek.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" onClick={() => onNavigate("todo")}>
                    View {analytics.assignmentsDueThisWeek.length - 5} more...
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageGrade.toFixed(1)}%</div>
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
                <span>{analytics.completionPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={analytics.completionPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedAssignments}</div>
            <p className="text-xs text-muted-foreground">Assignments finished</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Row - Class Performance & Recent Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Class Performance</span>
              <Button variant="outline" size="sm" onClick={() => onNavigate("grades")}>
                View Details
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.classPerformance.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-4">No classes for this term</p>
                <Button onClick={onAddClass} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Class
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.classPerformance.slice(0, 4).map((classData) => (
                  <div key={classData._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: classData.color }}
                      />
                      <div>
                        <p className="font-medium">{classData.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {classData.assignmentCount} graded / {classData.totalAssignments} total
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${getGradeColor(classData.currentGrade)}`}>
                        {classData.currentGrade !== null 
                          ? `${classData.currentGrade.toFixed(1)}%`
                          : 'No grades'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {classData.letterGrade}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Grades</span>
              <Button variant="outline" size="sm" onClick={() => onNavigate("submitted")}>
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentGrades.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-4">No grades recorded yet</p>
                <Button onClick={onAddAssignments} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assignments
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.recentGrades.map((assignment) => {
                  const classData = classes.find(c => c._id === assignment.classId)
                  const percentage = assignment.maxPoints 
                    ? (assignment.grade! / assignment.maxPoints) * 100 
                    : assignment.grade!
                  
                  return (
                    <div key={assignment._id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: classData?.color || '#6b7280' }}
                        />
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {classData?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${getGradeColor(percentage)}`}>
                          {assignment.grade}{assignment.maxPoints ? `/${assignment.maxPoints}` : '%'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={onAddAssignments}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assignments
          </Button>
          <Button variant="outline" onClick={onAddClass}>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
          <Button variant="outline" onClick={() => onNavigate("todo")}>
            <CheckSquare className="h-4 w-4 mr-2" />
            View To-Do List
          </Button>
          <Button variant="outline" onClick={() => onNavigate("grades")}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Grade Tracker
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
