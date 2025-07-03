"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Calculator } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { Doc } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { getCurrentUserId } from "@/lib/user"
import { categorizeAssignmentType, findMatchingGradingCategory } from "@/lib/assignment-categorization"

interface GradeInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: Doc<"assignments"> | null
  onGradeAdded?: () => void
}

export function GradeInputDialog({
  open,
  onOpenChange,
  assignment,
  onGradeAdded,
}: GradeInputDialogProps) {
  const [pointsReceived, setPointsReceived] = useState<string>("")
  const [totalPoints, setTotalPoints] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateAssignment = useMutation(api.assignments.updateAssignment)
  const userId = getCurrentUserId()

  // Get class data to access grading scheme
  const classData = useQuery(
    api.classes.getClass,
    assignment ? { classId: assignment.classId, userId } : "skip"
  )

  // Reset form when dialog opens/closes or assignment changes
  useEffect(() => {
    if (open && assignment) {
      setPointsReceived(assignment.grade?.toString() || "")
      setTotalPoints(assignment.maxPoints?.toString() || "")
      
      // Set the category using exact match first, then standardized categorization
      if (classData?.gradingScheme.categories) {
        // Check if assignment type exactly matches a grading category
        const exactMatch = classData.gradingScheme.categories.find(cat => 
          cat.name.toLowerCase() === assignment.type.toLowerCase()
        )
        
        if (exactMatch) {
          setSelectedCategory(exactMatch.name)
        } else {
          // If no exact match, use standardized categorization
          const standardizedType = categorizeAssignmentType(assignment.type)
          const matchingCategory = findMatchingGradingCategory(
            standardizedType, 
            classData.gradingScheme.categories
          )
          setSelectedCategory(matchingCategory)
        }
      } else {
        setSelectedCategory("")
      }
    } else {
      setPointsReceived("")
      setTotalPoints("")
      setSelectedCategory("")
    }
  }, [open, assignment, classData])

  const calculatePercentage = () => {
    const received = parseFloat(pointsReceived)
    const total = parseFloat(totalPoints)
    if (!isNaN(received) && !isNaN(total) && total > 0) {
      return ((received / total) * 100).toFixed(1)
    }
    return "0.0"
  }

  const getLetterGrade = (percentage: number) => {
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

  const handleSubmit = async () => {
    if (!assignment) return

    const received = parseFloat(pointsReceived)
    const total = parseFloat(totalPoints)

    if (isNaN(received) || isNaN(total) || total <= 0) {
      toast.error("Please enter valid points")
      return
    }

    if (received > total) {
      toast.error("Points received cannot be greater than total points")
      return
    }

    setIsSubmitting(true)
    try {
      const updateData: any = {
        grade: received,
        maxPoints: total,
      }
      
      // If a category is selected, update the assignment type to match the category
      if (selectedCategory) {
        updateData.type = selectedCategory
      }
      
      await updateAssignment({
        assignmentId: assignment._id,
        updates: updateData,
        userId
      })

      toast.success("Grade added successfully!")
      onGradeAdded?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add grade:", error)
      toast.error("Failed to add grade. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const percentage = parseFloat(calculatePercentage())
  const letterGrade = getLetterGrade(percentage)

  if (!assignment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Add Grade
          </DialogTitle>
          <DialogDescription>
            Add a grade for "{assignment.title}" in {assignment.className}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{assignment.title}</h4>
              <Badge variant="outline">{assignment.type}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={`w-3 h-3 rounded-full ${assignment.classColor}`} />
              <span>{assignment.className}</span>
              <span>•</span>
              <span>Due: {assignment.dueDate}</span>
            </div>
          </div>

          {/* Grading Category Selection */}
          {classData && classData.gradingScheme.categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">Grading Category (Optional)</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a grading category" />
                </SelectTrigger>
                <SelectContent>
                  {classData.gradingScheme.categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{category.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {category.weight}% of grade
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the grading category this assignment belongs to
              </p>
            </div>
          )}

          {/* Grade Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pointsReceived">Points Received</Label>
              <Input
                id="pointsReceived"
                type="number"
                step="0.1"
                min="0"
                value={pointsReceived}
                onChange={(e) => setPointsReceived(e.target.value)}
                placeholder="e.g., 85"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalPoints">Total Points</Label>
              <Input
                id="totalPoints"
                type="number"
                step="0.1"
                min="0.1"
                value={totalPoints}
                onChange={(e) => setTotalPoints(e.target.value)}
                placeholder="e.g., 100"
              />
            </div>
          </div>

          {/* Grade Preview */}
          {pointsReceived && totalPoints && !isNaN(parseFloat(pointsReceived)) && !isNaN(parseFloat(totalPoints)) && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Grade Preview</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Score:</span>
                  <div className="font-medium">{pointsReceived}/{totalPoints}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Percentage:</span>
                  <div className="font-medium">{calculatePercentage()}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Letter Grade:</span>
                  <div className="font-medium">
                    <Badge 
                      variant={
                        percentage >= 90 ? "default" :
                        percentage >= 80 ? "secondary" :
                        percentage >= 70 ? "outline" : "destructive"
                      }
                    >
                      {letterGrade}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !pointsReceived || 
              !totalPoints || 
              isNaN(parseFloat(pointsReceived)) || 
              isNaN(parseFloat(totalPoints)) ||
              parseFloat(totalPoints) <= 0 ||
              isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Adding Grade...
              </>
            ) : (
              "Add Grade"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
