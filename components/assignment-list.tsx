"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Calendar, Users, CheckCircle, Clock } from "lucide-react"

const assignments = [
  {
    id: 1,
    title: "JavaScript Fundamentals Quiz",
    course: "CS150",
    dueDate: "2024-01-15",
    submissions: 24,
    totalStudents: 28,
    status: "active",
    type: "quiz",
    autoGraded: true,
  },
  {
    id: 2,
    title: "Data Structure Implementation",
    course: "CS201",
    dueDate: "2024-01-18",
    submissions: 18,
    totalStudents: 32,
    status: "active",
    type: "programming",
    autoGraded: false,
  },
  {
    id: 3,
    title: "Algorithm Analysis Essay",
    course: "CS201",
    dueDate: "2024-01-12",
    submissions: 32,
    totalStudents: 32,
    status: "completed",
    type: "essay",
    autoGraded: false,
  },
]

export function AssignmentList() {
  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{assignment.title}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <span className="font-mono mr-4">{assignment.course}</span>
                  <Calendar className="h-4 w-4 mr-1" />
                  Due: {assignment.dueDate}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Badge variant={assignment.status === "completed" ? "default" : "secondary"}>{assignment.status}</Badge>
                {assignment.autoGraded && <Badge variant="outline">Auto-graded</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                {assignment.submissions}/{assignment.totalStudents} submitted
              </div>
              <div className="flex items-center text-sm">
                {assignment.status === "completed" ? (
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 mr-1 text-orange-600" />
                )}
                {assignment.type}
              </div>
            </div>
            <Progress value={(assignment.submissions / assignment.totalStudents) * 100} className="w-full" />
            <div className="flex space-x-2">
              <Button size="sm">View Submissions</Button>
              <Button size="sm" variant="outline">
                Edit Assignment
              </Button>
              {assignment.autoGraded && (
                <Button size="sm" variant="outline">
                  Run Auto-Grade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
