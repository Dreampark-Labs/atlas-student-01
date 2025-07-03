"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import type { Term, Class } from "@/types/academic"
import { toast } from "sonner"
import { getCurrentUserId } from "@/lib/user"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { categorizeAssignmentType, CATEGORY_MAPPINGS, getSuggestedGradingCategories } from "@/lib/assignment-categorization"

interface AddAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTerm: Term & { _id?: string }
  terms: Term[]
}

// Get standardized assignment types from the categorization utility
const assignmentTypes = CATEGORY_MAPPINGS.map(mapping => mapping.standardName)
const priorities = ["low", "medium", "high"]
const colorOptions = [
  { name: "Blue", value: "bg-blue-500" },
  { name: "Green", value: "bg-green-500" },
  { name: "Purple", value: "bg-purple-500" },
  { name: "Orange", value: "bg-orange-500" },
  { name: "Red", value: "bg-red-500" },
  { name: "Pink", value: "bg-pink-500" },
  { name: "Indigo", value: "bg-indigo-500" },
  { name: "Yellow", value: "bg-yellow-500" },
]

export function AddAssignmentDialog({ open, onOpenChange, currentTerm, terms }: AddAssignmentDialogProps) {
  const userId = getCurrentUserId()
  const [formData, setFormData] = useState({
    title: "",
    classId: "",
    type: "",
    termId: currentTerm.id || currentTerm._id || "",
    dueDate: "",
    dueTime: "",
    description: "",
    instructions: "",
    rubric: "",
    estimatedTime: "",
    priority: "medium",
    completed: false,
    grade: "",
    maxPoints: "100",
    notes: "",
  })

  const [newClassData, setNewClassData] = useState({
    name: "",
    code: "",
    professor: "",
    credits: "3",
    color: "bg-blue-500",
  })

  const [showNewClassForm, setShowNewClassForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Optimized form data update function
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  // Optimized new class data update function
  const updateNewClassData = (updates: Partial<typeof newClassData>) => {
    setNewClassData(prev => ({ ...prev, ...updates }))
  }

  // Get classes for the selected term using Convex
  const classes = useQuery(api.classes.getClassesByTerm, {
    userId,
    termId: formData.termId as Id<"terms">
  })

  // Convex mutations
  const createAssignment = useMutation(api.assignments.createAssignment)
  const createClass = useMutation(api.classes.createClass)

  // Reset class selection if current class is not in the new term
  useEffect(() => {
    if (formData.classId && classes && !classes.find((c: any) => c._id === formData.classId)) {
      updateFormData({ classId: "" })
    }
  }, [classes, formData.classId])

  // Reset new class form when dialog closes
  useEffect(() => {
    if (!open) {
      setShowNewClassForm(false)
      setNewClassData({
        name: "",
        code: "",
        professor: "",
        credits: "3",
        color: "bg-blue-500",
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let selectedClass
      let classId = formData.classId

      // If we're creating a new class or no class is selected
      if (showNewClassForm || !formData.classId) {
        if (!newClassData.name || !newClassData.code) {
          toast.error("Please provide class name and code")
          return
        }

        // Create the new class first
        const newClassId = await createClass({
          userId,
          termId: formData.termId as Id<"terms">,
          name: newClassData.name,
          code: newClassData.code,
          professor: newClassData.professor,
          credits: Number.parseInt(newClassData.credits),
          color: newClassData.color,
          description: "",
          meetingTimes: "",
          location: "",
          gradingScheme: {
            categories: getSuggestedGradingCategories().map(cat => ({
              name: cat.name,
              weight: cat.weight,
              count: cat.count,
              dropLowest: cat.dropLowest || 0
            }))
          },
        })

        classId = newClassId
        selectedClass = {
          _id: newClassId,
          name: newClassData.name,
          code: newClassData.code,
          color: newClassData.color,
        }
      } else {
        // Get existing class info for assignment
        selectedClass = classes?.find((c: any) => c._id === formData.classId)
        if (!selectedClass) {
          toast.error("Please select a class for this assignment")
          return
        }
      }

      // Standardize the assignment type using our categorization utility
      const standardizedType = categorizeAssignmentType(formData.type)

      await createAssignment({
        userId,
        title: formData.title,
        classId: classId as Id<"classes">,
        className: selectedClass.name,
        classColor: selectedClass.color,
        type: standardizedType,
        termId: formData.termId as Id<"terms">,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        completed: formData.completed,
        grade: formData.grade ? Number.parseInt(formData.grade) : undefined,
        maxPoints: formData.maxPoints ? Number.parseInt(formData.maxPoints) : undefined,
        description: formData.description,
        instructions: formData.instructions,
        rubric: formData.rubric,
        estimatedTime: formData.estimatedTime,
        notes: formData.notes,
      })

      // Reset form
      setFormData({
        title: "",
        classId: "",
        type: "",
        termId: currentTerm.id || currentTerm._id || "",
        dueDate: "",
        dueTime: "",
        description: "",
        instructions: "",
        rubric: "",
        estimatedTime: "",
        priority: "medium",
        completed: false,
        grade: "",
        maxPoints: "100",
        notes: "",
      })

      setNewClassData({
        name: "",
        code: "",
        professor: "",
        credits: "3",
        color: "bg-blue-500",
      })

      setShowNewClassForm(false)
      toast.success("Assignment added successfully!")
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding assignment:", error)
      toast.error("Failed to add assignment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add New Assignment</DialogTitle>
          <DialogDescription>Add a new assignment to track and manage for the selected term.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                className="col-span-3"
                placeholder="Assignment title"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="term" className="text-right">
                Term
              </Label>
              <Select value={formData.termId} onValueChange={(value) => updateFormData({ termId: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms?.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      <span>{term.name}</span>
                    </SelectItem>
                  )) || (
                    <SelectItem value="" disabled>
                      No terms available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right">
                Class
              </Label>
              <div className="col-span-3 space-y-2">
                {!showNewClassForm ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select Class</Label>
                      {classes && classes.length > 0 ? (
                        <div className="grid gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                          {classes.map((cls: any) => (
                            <button
                              key={cls._id}
                              type="button"
                              onClick={() => updateFormData({ classId: cls._id })}
                              className={`
                                flex items-center space-x-3 p-2 rounded-md text-left transition-all
                                ${formData.classId === cls._id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted border border-transparent hover:border-border'
                                }
                              `}
                            >
                              <div className={`w-4 h-4 rounded-full ${cls.color} flex-shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{cls.code}</div>
                                <div className="text-sm opacity-75 truncate">{cls.name}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground border rounded-md">
                          No classes available for this term
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewClassForm(true)}
                      className="w-full"
                    >
                      + Create New Class
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3 p-3 border rounded-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Create New Class</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewClassForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Class name"
                        value={newClassData.name}
                        onChange={(e) => updateNewClassData({ name: e.target.value })}
                        required
                      />
                      <Input
                        placeholder="Course code"
                        value={newClassData.code}
                        onChange={(e) => updateNewClassData({ code: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Professor"
                        value={newClassData.professor}
                        onChange={(e) => updateNewClassData({ professor: e.target.value })}
                      />
                      <Input
                        placeholder="Credits"
                        type="number"
                        value={newClassData.credits}
                        onChange={(e) => updateNewClassData({ credits: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Color</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => updateNewClassData({ color: color.value })}
                            className={`w-full h-8 rounded-md border-2 transition-all duration-200 hover:scale-105 ${
                              newClassData.color === color.value
                                ? 'border-gray-900 dark:border-gray-100 shadow-md'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                            }`}
                            title={color.name}
                          >
                            <div className={`w-full h-full rounded ${color.value}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <div className="col-span-3">
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                  {assignmentTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateFormData({ type })}
                      className={`
                        p-2 text-sm rounded-md text-left transition-all
                        ${formData.type === type
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted border border-transparent hover:border-border'
                        }
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {formData.type && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {formData.type}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateFormData({ dueDate: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueTime" className="text-right">
                Due Time
              </Label>
              <Input
                id="dueTime"
                type="time"
                value={formData.dueTime}
                onChange={(e) => updateFormData({ dueTime: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => updateFormData({ priority: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimatedTime" className="text-right">
                Est. Time
              </Label>
              <Input
                id="estimatedTime"
                value={formData.estimatedTime}
                onChange={(e) => updateFormData({ estimatedTime: e.target.value })}
                className="col-span-3"
                placeholder="2 hours"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                className="col-span-3"
                placeholder="Assignment details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="instructions" className="text-right">
                Instructions
              </Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => updateFormData({ instructions: e.target.value })}
                className="col-span-3"
                placeholder="Assignment instructions (optional)..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rubric" className="text-right">
                Rubric
              </Label>
              <Textarea
                id="rubric"
                value={formData.rubric}
                onChange={(e) => updateFormData({ rubric: e.target.value })}
                className="col-span-3"
                placeholder="Grading rubric (optional)..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="completed" className="text-right">
                Completed
              </Label>
              <div className="col-span-3">
                <Switch
                  id="completed"
                  checked={formData.completed}
                  onCheckedChange={(checked) => updateFormData({ completed: checked })}
                />
              </div>
            </div>
            {formData.completed && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grade" className="text-right">
                    Grade
                  </Label>
                  <div className="col-span-3 flex space-x-2">
                    <Input
                      id="grade"
                      type="number"
                      value={formData.grade}
                      onChange={(e) => updateFormData({ grade: e.target.value })}
                      placeholder="85"
                    />
                    <span className="flex items-center">/</span>
                    <Input
                      type="number"
                      value={formData.maxPoints}
                      onChange={(e) => updateFormData({ maxPoints: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateFormData({ notes: e.target.value })}
                    className="col-span-3"
                    placeholder="Notes about this assignment..."
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                isSubmitting || 
                (!formData.classId && !showNewClassForm) || 
                (showNewClassForm && (!newClassData.name || !newClassData.code))
              }
            >
              {isSubmitting ? "Adding..." : "Add Assignment"}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
