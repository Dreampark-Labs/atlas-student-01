"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  Upload, 
  Save, 
  FileIcon,
  Eye,
  Download,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Doc } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { useSettings } from "@/hooks/use-settings"
import { getCurrentUserId } from "@/lib/user"

interface AssignmentWorkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: Doc<"assignments"> | null
  onWorkSubmitted?: () => void
}

interface SubmissionFile {
  name: string
  size: number
  type: string
  url?: string
  uploadedAt: number
}

export function AssignmentWorkDialog({ 
  open, 
  onOpenChange, 
  assignment, 
  onWorkSubmitted 
}: AssignmentWorkDialogProps) {
  const [activeTab, setActiveTab] = useState("submission")
  const [submissionText, setSubmissionText] = useState("")
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<SubmissionFile[]>([])
  const [instructions, setInstructions] = useState("")
  const [rubric, setRubric] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditingInstructions, setIsEditingInstructions] = useState(false)
  const { formatDate } = useSettings()
  const userId = getCurrentUserId()

  const updateAssignment = useMutation(api.assignments.updateAssignment)
  const submitAssignment = useMutation(api.assignments.submitAssignment)

  // Reset form when assignment changes
  useEffect(() => {
    if (assignment) {
      setSubmissionText(assignment.submissionText || "")
      setUploadedFiles(assignment.submissionFiles || [])
      setInstructions(assignment.instructions || "")
      setRubric(assignment.rubric || "")
      setSubmissionFiles([])
    }
  }, [assignment])

  if (!assignment) return null

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

  const daysUntil = getDaysUntilDue(assignment.dueDate)
  const isOverdue = daysUntil < 0 && !assignment.completed

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setSubmissionFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmissionUpload = async () => {
    if (!submissionText.trim() && submissionFiles.length === 0 && uploadedFiles.length === 0) {
      toast.error("Please add either text or files to submit.")
      return
    }

    setIsSubmitting(true)
    try {
      let fileList: SubmissionFile[] = [...uploadedFiles]

      // For now, we'll store file metadata without actual file upload
      // In production, you'd upload to a file storage service first
      if (submissionFiles.length > 0) {
        const newFileMetadata = submissionFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: Date.now(),
          // In production, you'd get the URL from your file storage service
          url: `file://${file.name}` // Placeholder for file URL
        }))
        
        fileList = [...fileList, ...newFileMetadata]
      }

      await submitAssignment({
        assignmentId: assignment._id,
        userId,
        submissionText: submissionText || undefined,
        submissionFiles: fileList.length > 0 ? fileList : undefined,
      })

      toast.success("Work submitted successfully!")
      onWorkSubmitted?.()
      setSubmissionFiles([])
      setUploadedFiles(fileList)
    } catch (error) {
      console.error("Error submitting work:", error)
      toast.error("Failed to submit work. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveInstructions = async () => {
    try {
      await updateAssignment({
        assignmentId: assignment._id,
        updates: {
          instructions: instructions || undefined,
          rubric: rubric || undefined,
        },
        userId,
      })
      toast.success("Instructions and rubric saved!")
      setIsEditingInstructions(false)
    } catch (error) {
      console.error("Error saving instructions:", error)
      toast.error("Failed to save instructions. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: assignment.classColor || "#3b82f6" }}
              />
              <span>{assignment.title}</span>
              <Badge variant="outline" className="text-xs">
                {assignment.className}
              </Badge>
              {assignment.completed && (
                <Badge variant="default">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {isOverdue && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
              {daysUntil === 0 && !assignment.completed && (
                <Badge variant="destructive">
                  <Clock className="h-3 w-3 mr-1" />
                  Due Today
                </Badge>
              )}
              {daysUntil > 0 && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {daysUntil} days left
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0 m-6 mb-4">
              <TabsTrigger value="submission">My Work</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="rubric">Rubric</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden flex flex-col">
              <TabsContent value="submission" className="mt-0 h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-6 px-6">
                  {/* Assignment Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Assignment Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Due Date:</span>
                          <div className="font-medium">{assignment.dueDate} at {assignment.dueTime}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Priority:</span>
                          <div>
                            <Badge variant={
                              assignment.priority === "high" ? "destructive" :
                              assignment.priority === "medium" ? "default" : "secondary"
                            }>
                              {assignment.priority}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <div className="font-medium">{assignment.type}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Points:</span>
                          <div className="font-medium">
                            {assignment.maxPoints ? `${assignment.maxPoints} pts` : "Not set"}
                          </div>
                        </div>
                      </div>
                      {assignment.description && (
                        <div>
                          <span className="text-muted-foreground">Description:</span>
                          <div className="mt-1 p-3 bg-muted/50 rounded-md">
                            {assignment.description}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                {/* Written Response */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Written Response
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Type your response here..."
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      className="min-h-[200px]"
                      disabled={assignment.completed}
                    />
                  </CardContent>
                </Card>

                {/* File Submissions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Upload className="h-5 w-5 mr-2" />
                      File Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* File Upload */}
                    {!assignment.completed && (
                      <div>
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload files or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Support for images, documents, and other file types
                            </p>
                          </div>
                        </Label>
                        <Input
                          id="file-upload"
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    )}

                    {/* New Files to Upload */}
                    {submissionFiles.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Files to Upload:</h4>
                        <div className="space-y-2">
                          {submissionFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <FileIcon className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Uploaded Files */}
                    {uploadedFiles.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Submitted Files:</h4>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <FileIcon className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="text-sm font-medium">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)} • Uploaded {formatDate(new Date(file.uploadedAt))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {file.url && (
                                  <>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                                        <Eye className="h-4 w-4" />
                                      </a>
                                    </Button>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={file.url} download={file.name}>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </>
                                )}
                                {!assignment.completed && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeUploadedFile(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
                
                {/* Submission Actions - Fixed at bottom */}
                {!assignment.completed && (
                  <div className="flex-shrink-0 border-t bg-background p-4 px-6 flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Save Draft
                    </Button>
                    <Button
                      onClick={handleSubmissionUpload}
                      disabled={isSubmitting || (!submissionText.trim() && submissionFiles.length === 0 && uploadedFiles.length === 0)}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Submit Work
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="instructions" className="mt-0 h-full flex flex-col">
                <div className="flex-1 overflow-y-auto px-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Assignment Instructions</CardTitle>
                    {!isEditingInstructions ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingInstructions(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {instructions ? "Edit" : "Add"} Instructions
                      </Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingInstructions(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveInstructions}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isEditingInstructions ? (
                      <Textarea
                        placeholder="Enter assignment instructions here..."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="min-h-[300px]"
                      />
                    ) : instructions ? (
                      <div className="whitespace-pre-wrap p-4 bg-muted/50 rounded-lg">
                        {instructions}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No instructions have been added yet.</p>
                        <p className="text-sm">Click "Add Instructions" to get started.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              </TabsContent>

              <TabsContent value="rubric" className="mt-0 h-full flex flex-col">
                <div className="flex-1 overflow-y-auto px-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Grading Rubric</CardTitle>
                    {!isEditingInstructions ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingInstructions(true)}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        {rubric ? "Edit" : "Add"} Rubric
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    {isEditingInstructions ? (
                      <Textarea
                        placeholder="Enter grading rubric here..."
                        value={rubric}
                        onChange={(e) => setRubric(e.target.value)}
                        className="min-h-[300px]"
                      />
                    ) : rubric ? (
                      <div className="whitespace-pre-wrap p-4 bg-muted/50 rounded-lg">
                        {rubric}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No rubric has been added yet.</p>
                        <p className="text-sm">Click "Add Rubric" to get started.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
