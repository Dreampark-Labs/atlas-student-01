"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, CheckCircle2, AlertTriangle, Filter } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { AssignmentDetailDialog } from "@/components/assignment-detail-dialog"
import { useSettings } from "@/hooks/use-settings"

interface Term {
  id: string
  name: string
  isActive: boolean
}

interface AssignmentManagementProps {
  terms: Term[]
  currentTerm: Term
  onTermChange: (termId: string) => void
  onViewChange?: (view: string) => void
  userId: string
}

export function AssignmentManagement({ terms, currentTerm, onTermChange, onViewChange, userId }: AssignmentManagementProps) {
  const [selectedTermFilter, setSelectedTermFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const { formatDate, formatTime } = useSettings()

  // Query for all active assignments
  const allAssignments = useQuery(
    api.assignments.getActiveAssignments,
    { userId }
  )

  const isLoading = allAssignments === undefined

  // Memoized filtered assignments to prevent unnecessary re-renders
  const filteredAssignments = useMemo(() => {
    if (!allAssignments) return []
    
    const filtered = allAssignments.filter((assignment) => {
      const termMatch = selectedTermFilter === "all" || assignment.termId === selectedTermFilter
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "completed" && assignment.completed) ||
        (statusFilter === "pending" && !assignment.completed)
      return termMatch && statusMatch
    })

    // Sort assignments: pending first (by due date), then completed (by completion date)
    return filtered.sort((a, b) => {
      if (a.completed && !b.completed) return 1
      if (!a.completed && b.completed) return -1
      
      // Both have same completion status, sort by due date
      const dateA = new Date(a.dueDate)
      const dateB = new Date(b.dueDate)
      return dateA.getTime() - dateB.getTime()
    })
  }, [allAssignments, selectedTermFilter, statusFilter])

  const getTermName = (termId: Id<"terms">) => {
    const term = terms.find((t) => t.id === termId)
    return term ? term.name : "Unknown Term"
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    // Get today's date at midnight (normalize time to 00:00:00)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get due date at midnight (normalize time to 00:00:00)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">All Assignments</h2>
        <div className="flex items-center space-x-4">
          <Select value={selectedTermFilter} onValueChange={setSelectedTermFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {terms?.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-muted-foreground">Loading assignments...</p>
          </CardContent>
        </Card>
      ) : filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No assignments found</h3>
            <p className="text-muted-foreground text-center">
              {allAssignments?.length === 0 
                ? "You haven't created any assignments yet. Start by adding assignments to your classes!" 
                : "No assignments match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const term = terms.find((t) => t.id === assignment.termId)
            const daysUntil = getDaysUntilDue(assignment.dueDate)

            return (
              <Card key={assignment._id} className={`${assignment.completed ? "opacity-75" : ""}`}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className={`font-medium text-lg ${assignment.completed ? "line-through" : ""}`}>
                            {assignment.title}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className={`w-3 h-3 rounded-full ${assignment.classColor}`} />
                            <span className="text-sm text-muted-foreground">{assignment.className}</span>
                            <Badge variant="outline" className="text-xs">
                              {assignment.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getTermName(assignment.termId)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {term?.isActive && !assignment.completed && daysUntil <= 1 && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant={getPriorityColor(assignment.priority)}>{assignment.priority}</Badge>
                          {assignment.completed && <Badge variant="default">Completed</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {(() => {
                              const dateTimeString = `${assignment.dueDate} ${assignment.dueTime}`
                              const fullDateTime = new Date(dateTimeString)
                              return `${formatDate(fullDateTime)} at ${formatTime(fullDateTime)}`
                            })()}
                          </div>
                          {assignment.grade && (
                            <div className="flex items-center">
                              <span className="font-medium text-green-600">Grade: {assignment.grade}%</span>
                            </div>
                          )}
                          {assignment.maxPoints && (
                            <div className="flex items-center">
                              <span className="text-muted-foreground">Max Points: {assignment.maxPoints}</span>
                            </div>
                          )}
                        </div>
                        {term?.isActive && !assignment.completed && (
                          <div className="flex items-center space-x-2">
                            {daysUntil === 0 && <span className="text-red-600 font-medium">Due Today!</span>}
                            {daysUntil === 1 && <span className="text-orange-600 font-medium">Due Tomorrow</span>}
                            {daysUntil > 1 && <span>{daysUntil} days left</span>}
                            {daysUntil < 0 && <span className="text-red-600 font-medium">Overdue</span>}
                          </div>
                        )}
                      </div>

                      {assignment.description && (
                        <div className="text-sm text-muted-foreground">
                          <p>{assignment.description}</p>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            onTermChange(assignment.termId)
                            onViewChange?.("dashboard")
                          }}
                        >
                          View in {getTermName(assignment.termId)}
                        </Button>
                        <AssignmentDetailDialog assignment={assignment}>
                          <Button size="sm" variant="outline">
                            {term?.isActive ? "Edit" : "View Details"}
                          </Button>
                        </AssignmentDetailDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
