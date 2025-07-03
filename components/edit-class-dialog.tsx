"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Edit, BarChart3 } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Doc } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface EditClassDialogProps {
  classData: Doc<"classes">
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface GradingCategory {
  name: string
  weight: number
  count: number
  dropLowest?: number
}

const colorOptions = [
  { value: "bg-blue-500", label: "Blue", class: "bg-blue-500" },
  { value: "bg-green-500", label: "Green", class: "bg-green-500" },
  { value: "bg-red-500", label: "Red", class: "bg-red-500" },
  { value: "bg-purple-500", label: "Purple", class: "bg-purple-500" },
  { value: "bg-yellow-500", label: "Yellow", class: "bg-yellow-500" },
  { value: "bg-orange-500", label: "Orange", class: "bg-orange-500" },
  { value: "bg-pink-500", label: "Pink", class: "bg-pink-500" },
  { value: "bg-indigo-500", label: "Indigo", class: "bg-indigo-500" },
]

export function EditClassDialog({ classData, children, open: externalOpen, onOpenChange }: EditClassDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  
  // Form state
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [professor, setProfessor] = useState("")
  const [credits, setCredits] = useState("")
  const [color, setColor] = useState("")
  const [description, setDescription] = useState("")
  const [meetingTimes, setMeetingTimes] = useState("")
  const [location, setLocation] = useState("")
  const [gradingCategories, setGradingCategories] = useState<GradingCategory[]>([])
  const [gradingMode, setGradingMode] = useState<string>("percentage")
  const [showGradingScheme, setShowGradingScheme] = useState(false)

  const updateClass = useMutation(api.classes.updateClass)
  const { toast } = useToast()

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && classData) {
      setName(classData.name || "")
      setCode(classData.code || "")
      setProfessor(classData.professor || "")
      setCredits(classData.credits?.toString() || "")
      setColor(classData.color || "bg-blue-500")
      setDescription(classData.description || "")
      setMeetingTimes(classData.meetingTimes || "")
      setLocation(classData.location || "")
      setGradingCategories(classData.gradingScheme?.categories || [])
      setGradingMode(classData.gradingScheme?.mode || "percentage")
      setLoading(false)
    }
  }, [open, classData])

  // Auto-save draft periodically to prevent data loss (disabled for now to prevent issues)
  // useEffect(() => {
  //   if (!open) return
    
  //   const autoSaveInterval = setInterval(() => {
  //     // Store current form state in localStorage as backup
  //     try {
  //       const draftData = {
  //         name, code, professor, credits, color, description,
  //         meetingTimes, location, gradingCategories, gradingMode,
  //         timestamp: Date.now()
  //       }
  //       localStorage.setItem(`edit-class-draft-${classData._id}`, JSON.stringify(draftData))
  //     } catch (error) {
  //       console.warn('Failed to save draft:', error)
  //     }
  //   }, 10000) // Save every 10 seconds

  //   return () => clearInterval(autoSaveInterval)
  // }, [open, name, code, professor, credits, color, description, meetingTimes, location, gradingCategories, gradingMode, classData._id])

  // Load draft if available when dialog opens (disabled for now)
  // useEffect(() => {
  //   if (open) {
  //     try {
  //       const draftKey = `edit-class-draft-${classData._id}`
  //       const savedDraft = localStorage.getItem(draftKey)
  //       if (savedDraft) {
  //         const draft = JSON.parse(savedDraft)
  //         // Only use draft if it's less than 1 hour old
  //         if (Date.now() - draft.timestamp < 3600000) {
  //           setName(draft.name || classData.name)
  //           setCode(draft.code || classData.code)
  //           setProfessor(draft.professor || classData.professor)
  //           setCredits(draft.credits || classData.credits.toString())
  //           setColor(draft.color || classData.color)
  //           setDescription(draft.description || classData.description || "")
  //           setMeetingTimes(draft.meetingTimes || classData.meetingTimes || "")
  //           setLocation(draft.location || classData.location || "")
  //           setGradingCategories(draft.gradingCategories || classData.gradingScheme.categories)
  //           setGradingMode(draft.gradingMode || classData.gradingScheme.mode || "percentage")
  //         }
  //       }
  //     } catch (error) {
  //       console.warn('Failed to load draft:', error)
  //     }
  //   } else {
  //     // Clear draft when dialog closes successfully
  //     try {
  //       localStorage.removeItem(`edit-class-draft-${classData._id}`)
  //     } catch (error) {
  //       console.warn('Failed to clear draft:', error)
  //     }
  //   }
  // }, [open, classData])

  // Handle keyboard shortcuts (disabled for now to prevent issues)
  // useEffect(() => {
  //   if (!open) return

  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     // Prevent accidental ESC key closure while typing
  //     if (e.key === 'Escape' && loading) {
  //       e.preventDefault()
  //       e.stopPropagation()
  //       return
  //     }
      
  //     // Save draft on Ctrl+S
  //     if (e.ctrlKey && e.key === 's') {
  //       e.preventDefault()
  //       // Trigger auto-save
  //       try {
  //         const draftData = {
  //           name, code, professor, credits, color, description,
  //           meetingTimes, location, gradingCategories, gradingMode,
  //           timestamp: Date.now()
  //         }
  //         localStorage.setItem(`edit-class-draft-${classData._id}`, JSON.stringify(draftData))
  //         toast({
  //           title: "Draft Saved",
  //           description: "Your changes have been saved as a draft.",
  //         })
  //       } catch (error) {
  //         console.warn('Failed to save draft:', error)
  //       }
  //     }
  //   }

  //   document.addEventListener('keydown', handleKeyDown)
  //   return () => document.removeEventListener('keydown', handleKeyDown)
  // }, [open, loading, name, code, professor, credits, color, description, meetingTimes, location, gradingCategories, gradingMode, classData._id, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) {
      return
    }
    
    setLoading(true)

    try {
      await updateClass({
        classId: classData._id,
        userId: classData.userId,
        updates: {
          name: name.trim(),
          code: code.trim(),
          professor: professor.trim(),
          credits: parseInt(credits) || 1,
          color,
          description: description.trim() || undefined,
          meetingTimes: meetingTimes.trim() || undefined,
          location: location.trim() || undefined,
          ...(showGradingScheme && {
            gradingScheme: {
              mode: gradingMode,
              categories: gradingCategories,
            },
          }),
        },
      })

      toast({
        title: "Class Updated",
        description: "Class information has been successfully updated.",
      })
      
      setOpen(false)
    } catch (error) {
      console.error("Error updating class:", error)
      toast({
        title: "Error",
        description: "Failed to update class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addGradingCategory = () => {
    setGradingCategories([...gradingCategories, { name: "", weight: 0, count: 1, dropLowest: 0 }])
  }

  const removeGradingCategory = (index: number) => {
    setGradingCategories(gradingCategories.filter((_, i) => i !== index))
  }

  const updateGradingCategory = (index: number, field: keyof GradingCategory, value: string | number) => {
    const updated = gradingCategories.map((cat, i) =>
      i === index ? { ...cat, [field]: value } : cat
    )
    setGradingCategories(updated)
  }

  const totalWeight = gradingCategories.reduce((sum, cat) => sum + cat.weight, 0)

  const dialogContent = (
    <DialogContent className="sm:max-w-[600px] w-[95%] max-w-[95vw] p-6">
      <DialogHeader>
        <DialogTitle>Edit Class</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-6 max-h-[65vh] overflow-y-auto pr-2">

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  placeholder="Enter class name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  placeholder="e.g., MATH 108"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="professor">Professor</Label>
                <Input
                  id="professor"
                  name="professor"
                  type="text"
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  placeholder="Professor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  name="credits"
                  type="number"
                  min="1"
                  max="10"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  placeholder="3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${color}`} />
                      <span>{colorOptions.find(c => c.value === color)?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full ${option.class}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="Course description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meetingTimes">Meeting Times (Optional)</Label>
                <Input
                  id="meetingTimes"
                  name="meetingTimes"
                  type="text"
                  value={meetingTimes}
                  onChange={(e) => setMeetingTimes(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., MWF 10:00-11:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., Room 101"
                />
              </div>
            </div>
          </div>

          {/* Grading Scheme */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Grading Scheme</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGradingScheme(!showGradingScheme)}
              >
                {showGradingScheme ? "Hide" : "Edit"} Grading Scheme
              </Button>
            </div>

            {showGradingScheme && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Define how grades are calculated for this class
                      </p>
                    </div>
                    <Badge variant={gradingMode === "percentage" && totalWeight === 100 ? "default" :
                                   gradingMode === "percentage" ? "destructive" : "default"}>
                      {gradingMode === "percentage" ? `Total: ${totalWeight}%` : `Total Points: ${totalWeight}`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Grading Mode</Label>
                      <Select value={gradingMode} onValueChange={setGradingMode} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage-based (weights must total 100%)</SelectItem>
                          <SelectItem value="points">Points-based (weights are point values)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-muted-foreground">
                        {gradingMode === "percentage"
                          ? "Each category weight represents a percentage of the total grade"
                          : "Each category weight represents the total points for that category"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {gradingCategories.map((category, index) => {
                  return (
                    <div key={index} className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label>Category Name</Label>
                          <Input
                            value={category.name}
                            onChange={(e) => updateGradingCategory(index, "name", e.target.value)}
                            placeholder="e.g., Homework"
                            disabled={loading}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>{gradingMode === "percentage" ? "Weight (%)" : "Total Points"}</Label>
                          <Input
                            type="number"
                            min="0"
                            max={gradingMode === "percentage" ? "100" : undefined}
                            value={category.weight}
                            onChange={(e) => updateGradingCategory(index, "weight", parseFloat(e.target.value) || 0)}
                            disabled={loading}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Expected</Label>
                          <Input
                            type="number"
                            min="1"
                            value={category.count}
                            onChange={(e) => updateGradingCategory(index, "count", parseInt(e.target.value) || 1)}
                            disabled={loading}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Drop Lowest</Label>
                          <Input
                            type="number"
                            min="0"
                            value={category.dropLowest || 0}
                            onChange={(e) => updateGradingCategory(index, "dropLowest", parseInt(e.target.value) || 0)}
                            disabled={loading}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeGradingCategory(index)}
                            disabled={gradingCategories.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addGradingCategory}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>

                {gradingMode === "percentage" && totalWeight !== 100 && (
                  <div className="text-sm text-destructive">
                    Warning: Category weights must add up to 100%
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 mt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Class"}
            </Button>
          </div>
        </form>
    </DialogContent>
  )

  // If external control is provided and no children, render dialog directly
  if (externalOpen !== undefined && !children) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    )
  }

  // Default behavior with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant="outline" 
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  )
}
