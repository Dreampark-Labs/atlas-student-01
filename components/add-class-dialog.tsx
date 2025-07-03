"use client"

import type React from "react"
import { useState } from "react"
import { useMutation } from "convex/react"
import { useAuth } from "@clerk/nextjs"
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
import { Badge } from "@/components/ui/badge"
import type { Term } from "@/types/academic"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { getSuggestedGradingCategories } from "@/lib/assignment-categorization"

interface AddClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTerm: Term & { _id?: string }
  terms: (Term & { _id?: string })[]
}

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

export function AddClassDialog({ open, onOpenChange, currentTerm, terms }: AddClassDialogProps) {
  const { userId } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    professor: "",
    credits: "",
    termId: currentTerm?._id || currentTerm?.id || "",
    color: "bg-blue-500",
    description: "",
    meetingTimes: "",
    location: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Convex mutation
  const createClass = useMutation(api.classes.createClass)

  // Handle color change with better state management
  const handleColorChange = (color: string) => {
    setFormData(prevData => ({ ...prevData, color }))
  }

  // Handle other form changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prevData => ({ ...prevData, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toast.error("You must be signed in to create a class.")
      return
    }

    if (!formData.termId) {
      toast.error("No term selected. Please select a term.")
      return
    }

    setIsSubmitting(true)

    try {
      console.log("Creating class with data:", {
        userId,
        termId: formData.termId,
        name: formData.name,
        code: formData.code,
        professor: formData.professor,
        credits: Number.parseInt(formData.credits) || 0,
        color: formData.color,
        description: formData.description,
        meetingTimes: formData.meetingTimes,
        location: formData.location,
      })

      await createClass({
        userId,
        termId: formData.termId as Id<"terms">,
        name: formData.name,
        code: formData.code,
        professor: formData.professor,
        credits: Number.parseInt(formData.credits) || 0,
        color: formData.color,
        description: formData.description,
        meetingTimes: formData.meetingTimes,
        location: formData.location,
        gradingScheme: {
          categories: getSuggestedGradingCategories().map(cat => ({
            name: cat.name,
            weight: cat.weight,
            count: cat.count,
          }))
        },
      })

      // Reset form
      setFormData({
        name: "",
        code: "",
        professor: "",
        credits: "",
        termId: currentTerm?._id || currentTerm?.id || "",
        color: "bg-blue-500",
        description: "",
        meetingTimes: "",
        location: "",
      })

      toast.success("Class added successfully!")
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding class:", error)
      toast.error(`Failed to add class: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
          <DialogDescription>Add a new class to track assignments and grades for the selected term.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Class Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="col-span-3"
                placeholder="Calculus II"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Course Code
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className="col-span-3"
                placeholder="MATH 201"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="professor" className="text-right">
                Professor
              </Label>
              <Input
                id="professor"
                value={formData.professor}
                onChange={(e) => setFormData({ ...formData, professor: e.target.value })}
                className="col-span-3"
                placeholder="Dr. Smith"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credits" className="text-right">
                Credits
              </Label>
              <Input
                id="credits"
                type="number"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                className="col-span-3"
                placeholder="3"
                min="1"
                max="6"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="term" className="text-right">
                Term
              </Label>
              <Select value={formData.termId} onValueChange={(value) => setFormData({ ...formData, termId: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms?.map((term) => (
                    <SelectItem key={term._id || term.id} value={term._id || term.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{term.name}</span>
                        {term.isActive && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
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
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color.value} ${
                        formData.color === color.value 
                          ? 'border-white shadow-lg scale-110' 
                          : 'border-gray-300 hover:scale-105'
                      }`}
                      onClick={() => handleColorChange(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {colorOptions.find(c => c.value === formData.color)?.name}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="meetingTimes" className="text-right">
                Meeting Times
              </Label>
              <Input
                id="meetingTimes"
                value={formData.meetingTimes}
                onChange={(e) => setFormData({ ...formData, meetingTimes: e.target.value })}
                className="col-span-3"
                placeholder="MWF 10:00-11:00 AM"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="col-span-3"
                placeholder="Room 101, Science Building"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Course description and notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
