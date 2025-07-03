"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react"

const studentAssignments = [
  {
    id: 1,
    title: "JavaScript Fundamentals Quiz",
    course: "Web Development",
    dueDate: "2024-01-15",
    status: "pending",
    timeLimit: "45 minutes",
    questions: 20,
    attempts: 0,
    maxAttempts: 2,
  },
  {
    id: 2,
    title: "CSS Layout Challenge",
    course: "Web Development",
    dueDate: "2024-01-18",
    status: "submitted",
    grade: 92,
    submittedAt: "2024-01-16",
  },
  {
    id: 3,
    title: "Algorithm Analysis",
    course: "Data Structures",
    dueDate: "2024-01-12",
    status: "graded",
    grade: 88,
    feedback: "Good analysis, but could improve time complexity discussion.",
  },
]

const upcomingDeadlines = [
  { title: "JavaScript Quiz", course: "Web Dev", dueDate: "2024-01-15", urgent: true },
  { title: "Database Design", course: "CS201", dueDate: "2024-01-18", urgent: false },
  { title: "Final Project Proposal", course: "CS150", dueDate: "2024-01-22", urgent: false },
]

export function StudentDashboard() {
  const completedAssignments = studentAssignments.filter((a) => a.status === "graded").length
  const totalAssignments = studentAssignments.length
  const averageGrade =
    studentAssignments.filter((a) => a.grade).reduce((sum, a) => sum + a.grade!, 0) /
    studentAssignments.filter((a) => a.grade).length

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedAssignments}/{totalAssignments}
            </div>
            <Progress value={(completedAssignments / totalAssignments) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Assignments completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageGrade.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-2">Across all courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines.length}</div>
            <p className="text-xs text-muted-foreground mt-2">Assignments due soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Don't miss these important dates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingDeadlines.map((deadline, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {deadline.urgent ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="font-medium">{deadline.title}</p>
                    <p className="text-sm text-muted-foreground">{deadline.course}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{deadline.dueDate}</p>
                  {deadline.urgent && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>My Assignments</CardTitle>
          <CardDescription>Track your assignment progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studentAssignments.map((assignment) => (
              <div key={assignment.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{assignment.title}</h3>
                    <p className="text-sm text-muted-foreground">{assignment.course}</p>
                  </div>
                  <Badge
                    variant={
                      assignment.status === "graded"
                        ? "default"
                        : assignment.status === "submitted"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {assignment.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Due: {assignment.dueDate}
                  </div>
                  {assignment.grade && <div className="font-medium text-foreground">Grade: {assignment.grade}%</div>}
                </div>

                {assignment.status === "pending" && (
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      {assignment.questions} questions • {assignment.timeLimit} •{assignment.attempts}/
                      {assignment.maxAttempts} attempts used
                    </div>
                    <Button size="sm">Start Assignment</Button>
                  </div>
                )}

                {assignment.status === "submitted" && (
                  <div className="text-sm">
                    <CheckCircle className="h-4 w-4 inline mr-1 text-green-600" />
                    Submitted on {assignment.submittedAt}
                  </div>
                )}

                {assignment.feedback && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm">
                      <strong>Feedback:</strong> {assignment.feedback}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
