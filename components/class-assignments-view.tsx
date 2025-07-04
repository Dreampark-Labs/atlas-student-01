"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  BarChart3, 
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  BookOpen
} from "lucide-react"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { AssignmentDetailDialog } from "./assignment-detail-dialog"
import { GradeCalculator } from "@/lib/grade-calculator"
import { categorizeAssignmentType, findMatchingGradingCategory } from "@/lib/assignment-categorization"
import { SmartPrioritizer } from "@/lib/smart-prioritizer"
import { useSettings } from "@/hooks/use-settings"
import { TabTransition } from "@/components/ui/tab-transition";
import { StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

interface ClassAssignmentsViewProps {
  term: Doc<"terms">
  classData: Doc<"classes">
  assignments: Doc<"assignments">[]
  userId: string
}

export function ClassAssignmentsView({ term, classData, assignments, userId }: ClassAssignmentsViewProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [gradePredictor, setGradePredictor] = useState<{ [key: string]: string }>({})
  const { settings, formatDate, formatTime } = useSettings()

  // Helper function to create a Date object from date and time strings
  const createDateTime = (dateStr: string, timeStr: string) => {
    try {
      if (!dateStr || !timeStr) return new Date();

      // Handle both new ISO format (YYYY-MM-DD) and legacy format (MM/DD/YYYY)
      let isoDateStr = dateStr;
      if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Convert legacy format to ISO format
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        isoDateStr = `${year}-${month}-${day}`;
      }

      // Handle both new 24-hour format (HH:MM) and legacy 12-hour format
      let isoTimeStr = timeStr;
      if (!timeStr.match(/^\d{2}:\d{2}$/)) {
        // Convert legacy 12-hour format to 24-hour format
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2];
          const ampm = timeMatch[3]?.toUpperCase();

          if (ampm === "PM" && hours !== 12) {
            hours += 12;
          } else if (ampm === "AM" && hours === 12) {
            hours = 0;
          }

          isoTimeStr = `${String(hours).padStart(2, "0")}:${minutes}`;
        }
      }

      // Create the combined date-time string and return as Date object
      const combinedDateTime = `${isoDateStr}T${isoTimeStr}:00`;
      return new Date(combinedDateTime);
    } catch (error) {
      console.error("Error creating date time:", error);
      return new Date();
    }
  };

  // Assignments are passed as props, no need to query

  // Get the current selected assignment from the latest data
  const selectedAssignment = selectedAssignmentId && assignments
    ? assignments.find(a => a._id === selectedAssignmentId)
    : null

  // Apply smart prioritization to assignments
  const prioritizedAssignments = useMemo(() => {
    if (!assignments) return []
    return SmartPrioritizer.prioritizeAssignments(assignments)
  }, [assignments, settings.smartPrioritization])

  // Group assignments by category and calculate stats
  const assignmentStats = useMemo(() => {
    if (!assignments) return {}
    
    const stats: { [category: string]: {
      assignments: typeof assignments,
      completed: number,
      total: number,
      graded: number,
      averageGrade: number,
      weight: number,
      dropLowest: number
    }} = {}

    // Initialize categories from grading scheme
    classData.gradingScheme.categories.forEach(category => {
      stats[category.name] = {
        assignments: [],
        completed: 0,
        total: 0,
        graded: 0,
        averageGrade: 0,
        weight: category.weight,
        dropLowest: category.dropLowest || 0
      }
    })

    // Group assignments
    assignments.forEach(assignment => {
      // Check if assignment type exactly matches a grading category
      const exactMatch = classData.gradingScheme.categories.find(cat => 
        cat.name.toLowerCase() === assignment.type.toLowerCase()
      )
      
      const category = exactMatch ? exactMatch.name : (() => {
        // If no exact match, use standardized categorization
        const standardizedType = categorizeAssignmentType(assignment.type)
        return findMatchingGradingCategory(
          standardizedType, 
          classData.gradingScheme.categories
        )
      })()
      
      if (!stats[category]) {
        stats[category] = {
          assignments: [],
          completed: 0,
          total: 0,
          graded: 0,
          averageGrade: 0,
          weight: 0,
          dropLowest: 0
        }
      }
      
      // Store assignment with actual type for display
      const categorizedAssignment = {
        ...assignment,
        type: assignment.type, // Use the original assignment type
        displayCategory: category
      }
      
      stats[category].assignments.push(categorizedAssignment)
      stats[category].total++
      if (assignment.completed) stats[category].completed++
      if (assignment.grade !== undefined && assignment.grade !== null) {
        stats[category].graded++
      }
    })

    // Calculate averages
    Object.keys(stats).forEach(category => {
      const categoryStats = stats[category]
      const gradedAssignments = categoryStats.assignments.filter(a => 
        a.grade !== undefined && a.grade !== null && a.maxPoints
      )
      
      if (gradedAssignments.length > 0) {
        const totalPoints = gradedAssignments.reduce((sum, a) => sum + (a.maxPoints || 100), 0)
        const earnedPoints = gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0)
        categoryStats.averageGrade = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
      }
    })

    return stats
  }, [assignments, classData.gradingScheme.categories])

  // Calculate current class grade
  const currentClassGrade = useMemo(() => {
    if (!assignments) return 0
    
    const formattedAssignments = assignments
      .filter(a => a.grade !== undefined && a.grade !== null && a.completed)
      .map(a => {
        // Check if assignment type exactly matches a grading category
        const exactMatch = classData.gradingScheme.categories.find(cat => 
          cat.name.toLowerCase() === a.type.toLowerCase()
        )
        
        const matchingCategory = exactMatch ? exactMatch.name : (() => {
          // If no exact match, use standardized categorization
          const standardizedType = categorizeAssignmentType(a.type)
          return findMatchingGradingCategory(
            standardizedType, 
            classData.gradingScheme.categories
          )
        })()
        
        return {
          id: a._id,
          name: a.title,
          type: matchingCategory,
          grade: a.grade || 0,
          maxPoints: a.maxPoints || 100,
          date: a.dueDate
        }
      })

    if (formattedAssignments.length === 0) return 0

    // Convert grading scheme to the format expected by GradeCalculator
    const gradingScheme: { [key: string]: { weight: number; count: number; dropLowest?: number } | string } = {
      mode: classData.gradingScheme.mode || "percentage"
    }
    classData.gradingScheme.categories.forEach(category => {
      gradingScheme[category.name] = {
        weight: category.weight,
        count: category.count,
        dropLowest: category.dropLowest
      }
    })

    return GradeCalculator.calculateClassGrade(formattedAssignments, gradingScheme)
  }, [assignments, classData.gradingScheme.categories])

  // Calculate predicted grade with user inputs
  const predictedGrade = useMemo(() => {
    if (!assignments) return currentClassGrade
    
    const allAssignments = [...assignments]
    
    // Add predicted grades for incomplete assignments
    Object.entries(gradePredictor).forEach(([assignmentId, grade]) => {
      const gradeNum = parseFloat(grade)
      if (!isNaN(gradeNum)) {
        const assignmentIndex = allAssignments.findIndex(a => a._id === assignmentId)
        if (assignmentIndex >= 0) {
          allAssignments[assignmentIndex] = {
            ...allAssignments[assignmentIndex],
            grade: gradeNum,
            completed: true
          }
        }
      }
    })

    const formattedAssignments = allAssignments
      .filter(a => a.grade !== undefined && a.grade !== null)
      .map(a => {
        // Check if assignment type exactly matches a grading category
        const exactMatch = classData.gradingScheme.categories.find(cat => 
          cat.name.toLowerCase() === a.type.toLowerCase()
        )
        
        const matchingCategory = exactMatch ? exactMatch.name : (() => {
          // If no exact match, use standardized categorization
          const standardizedType = categorizeAssignmentType(a.type)
          return findMatchingGradingCategory(
            standardizedType, 
            classData.gradingScheme.categories
          )
        })()
        
        return {
          id: a._id,
          name: a.title,
          type: matchingCategory,
          grade: a.grade || 0,
          maxPoints: a.maxPoints || 100,
          date: a.dueDate
        }
      })

    if (formattedAssignments.length === 0) return 0

    const gradingScheme: { [key: string]: { weight: number; count: number; dropLowest?: number } | string } = {
      mode: classData.gradingScheme.mode || "percentage"
    }
    classData.gradingScheme.categories.forEach(category => {
      gradingScheme[category.name] = {
        weight: category.weight,
        count: category.count,
        dropLowest: category.dropLowest
      }
    })

    return GradeCalculator.calculateClassGrade(formattedAssignments, gradingScheme)
  }, [assignments, classData.gradingScheme.categories, gradePredictor, currentClassGrade])

  const handleAssignmentClick = (assignment: any) => {
    setSelectedAssignmentId(assignment._id)
    setShowDetailDialog(true)
  }

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "text-green-600"
    if (grade >= 80) return "text-blue-600"
    if (grade >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const formatGrade = (assignment: any) => {
    if (assignment.grade !== undefined && assignment.grade !== null) {
      if (assignment.maxPoints) {
        return `${assignment.grade}/${assignment.maxPoints} (${((assignment.grade / assignment.maxPoints) * 100).toFixed(1)}%)`
      }
      return `${assignment.grade}%`
    }
    return "Not graded"
  }

  if (!assignments) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-6 h-6 rounded-full ${classData.color}`} />
          <div>
            <h1 className="text-2xl font-bold">{classData.name}</h1>
            <p className="text-muted-foreground">{classData.code} • {classData.professor}</p>
          </div>
        </div>
      </div>

      {/* Grade Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-2" />
              Current Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getGradeColor(currentClassGrade)}>
                {currentClassGrade.toFixed(1)}{classData.gradingScheme.mode === "points" ? " pts" : "%"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {GradeCalculator.getLetterGrade(currentClassGrade)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Predicted Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className={getGradeColor(predictedGrade)}>
                {predictedGrade.toFixed(1)}{classData.gradingScheme.mode === "points" ? " pts" : "%"}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-xs">
              {predictedGrade > currentClassGrade && (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{(predictedGrade - currentClassGrade).toFixed(1)}{classData.gradingScheme.mode === "points" ? " pts" : "%"}</span>
                </>
              )}
              {predictedGrade < currentClassGrade && (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{(predictedGrade - currentClassGrade).toFixed(1)}{classData.gradingScheme.mode === "points" ? " pts" : "%"}</span>
                </>
              )}
              {predictedGrade === currentClassGrade && (
                <>
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">No change</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span>{assignments.filter(a => a.completed).length}/{assignments.length}</span>
              </div>
              <Progress 
                value={(assignments.filter(a => a.completed).length / assignments.length) * 100} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList>
          <TabsTrigger value="assignments">All Assignments</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="predictor">Grade Predictor</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <TabTransition tabKey="assignments">
            <StaggerContainer className="grid gap-4">
            {prioritizedAssignments.map((assignment) => {
              const priorityScores = SmartPrioritizer.getPriorityScores([assignment])
              const priorityScore = priorityScores[0]?.score || 0
              const priorityLabel = SmartPrioritizer.getPriorityLabel(priorityScore)
              const priorityColor = SmartPrioritizer.getPriorityColor(priorityScore)
              
              return (
                <Card 
                  key={assignment._id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${assignment.completed ? 'opacity-75' : ''}`}
                  onClick={() => handleAssignmentClick(assignment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-medium ${assignment.completed ? 'line-through' : ''}`}>
                            {assignment.title}
                          </h3>
                          {assignment.completed && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          {settings.smartPrioritization && !assignment.completed && (
                            <Badge variant="outline" className={`text-xs ${priorityColor}`}>
                              {priorityLabel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {assignment.type}
                          </Badge>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(createDateTime(assignment.dueDate, assignment.dueTime || "23:59"))}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(createDateTime(assignment.dueDate, assignment.dueTime || "23:59"))}
                          </div>
                        </div>
                        {((assignment as any).submissionText || ((assignment as any).submissionFiles && (assignment as any).submissionFiles.length > 0)) && (
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <FileText className="h-3 w-3" />
                            <span>Has submitted work</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatGrade(assignment)}
                        </div>
                        {assignment.grade !== undefined && assignment.grade !== null && (
                          <div className={`text-xs ${getGradeColor(
                            assignment.maxPoints 
                              ? (assignment.grade / assignment.maxPoints) * 100 
                              : assignment.grade
                          )}`}>
                            {GradeCalculator.getLetterGrade(
                              assignment.maxPoints 
                                ? (assignment.grade / assignment.maxPoints) * 100 
                                : assignment.grade
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </StaggerContainer>
          </TabTransition>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <TabTransition tabKey="categories">
          <div className="grid gap-4">
            {Object.entries(assignmentStats).map(([category, stats]) => (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{classData.gradingScheme.mode === "points" ? `${stats.weight} pts` : `${stats.weight}% of grade`}</Badge>
                      {stats.dropLowest > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Drops {stats.dropLowest} lowest
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Assignments</div>
                      <div className="font-medium">{stats.total}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Completed</div>
                      <div className="font-medium">{stats.completed}/{stats.total}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Average Grade</div>
                      <div className={`font-medium ${getGradeColor(stats.averageGrade)}`}>
                        {stats.graded > 0 ? `${stats.averageGrade.toFixed(1)}${classData.gradingScheme.mode === "points" ? " pts" : "%"}` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {stats.assignments.map((assignment) => (
                      <div 
                        key={assignment._id} 
                        className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                        onClick={() => handleAssignmentClick(assignment)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${assignment.completed ? 'line-through opacity-75' : ''}`}>
                            {assignment.title}
                          </span>
                          {assignment.completed && (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                        <div className="text-sm">
                          {formatGrade(assignment)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </TabTransition>
        </TabsContent>

        <TabsContent value="predictor" className="space-y-4">
          <TabTransition tabKey="predictor">
          <Card>
            <CardHeader>
              <CardTitle>Grade Predictor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter predicted grades for incomplete assignments to see how they might affect your final grade.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {assignments
                  .filter(a => !a.completed || (a.grade === undefined || a.grade === null))
                  .map((assignment) => (
                    <div key={assignment._id} className="flex items-center space-x-4 p-3 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{assignment.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.type} • Due: {(() => {
                            const fullDateTime = createDateTime(assignment.dueDate, assignment.dueTime || "23:59")
                            return `${formatDate(fullDateTime)} at ${formatTime(fullDateTime)}`
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Predicted grade:</Label>
                        <Input
                          type="number"
                          min="0"
                          max={assignment.maxPoints || 100}
                          placeholder={assignment.maxPoints ? `0-${assignment.maxPoints}` : "0-100"}
                          value={gradePredictor[assignment._id] || ""}
                          onChange={(e) => setGradePredictor(prev => ({
                            ...prev,
                            [assignment._id]: e.target.value
                          }))}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">
                          {assignment.maxPoints ? `/ ${assignment.maxPoints}` : '%'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          </TabTransition>
        </TabsContent>
      </Tabs>

      <AssignmentDetailDialog
        open={showDetailDialog}
        onOpenChange={(open) => {
          setShowDetailDialog(open)
          if (!open) {
            setSelectedAssignmentId(null) // Clear selection when dialog closes
          }
        }}
        assignment={selectedAssignment ?? null}
      />
    </div>
  )
}
