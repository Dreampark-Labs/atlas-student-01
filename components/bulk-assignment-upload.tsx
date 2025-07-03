"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, Image, Loader2, CheckCircle, Eye } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { categorizeAssignmentType } from "@/lib/assignment-categorization"

interface BulkAssignmentUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTerm: any
  userId: string
  classes: Array<{
    _id: string
    name: string
    code: string
    professor: string
    credits: number
    color: string
  }>
}

interface ExtractedAssignment {
  title: string
  description: string
  dueDate: string
  type: string
  points?: number
  confidence: number
}

export function BulkAssignmentUpload({
  open,
  onOpenChange,
  currentTerm,
  userId,
  classes,
}: BulkAssignmentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedAssignments, setExtractedAssignments] = useState<ExtractedAssignment[]>([])
  const [processingStep, setProcessingStep] = useState<string>("")
  const [previewContent, setPreviewContent] = useState<string>("")
  const [showPreview, setShowPreview] = useState<boolean>(false)

  const createAssignment = useMutation(api.assignments.createAssignment)

  // Debug logging for classes
  console.log('BulkAssignmentUpload rendered with:', {
    classesCount: classes?.length,
    classesStructure: classes?.map(c => ({ id: c._id, name: c.name, code: c.code })),
    selectedClassId
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a PDF, PNG, or JPEG file.')
        return
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.')
        return
      }
      
      setSelectedFile(file)
    }
  }

  const processFileWithGemini = async (file: File): Promise<ExtractedAssignment[]> => {
    console.log('processFileWithGemini called with file:', { name: file.name, size: file.size, type: file.type })
    
    setProcessingStep("Converting file to base64...")
    
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64Data = result.split(',')[1]
        console.log('File converted to base64, length:', base64Data.length)
        resolve(base64Data)
      }
      reader.readAsDataURL(file)
    })

    setProcessingStep("Analyzing document...")
    console.log('Making API request to /api/extract-assignments')

    const response = await fetch('/api/extract-assignments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: {
          data: base64,
          mimeType: file.type,
          name: file.name
        }
      }),
    })

    console.log('API response status:', response.status, 'ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error Response:', errorText)
      console.error('Response headers:', Object.fromEntries(response.headers.entries()))
      throw new Error(`Failed to process file with Gemini API: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('API Response success:', result)
    return result.assignments || []
  }

  const handleExtractAssignments = async () => {
    console.log('handleExtractAssignments called')
    console.log('Current state:', { selectedClassId, selectedFileName: selectedFile?.name })
    
    if (!selectedFile) {
      console.log('No file selected')
      alert('Please select a file first.')
      return
    }

    if (!selectedClassId) {
      console.log('No class selected, available classes:', classes?.map(c => ({ id: c._id, name: c.name })))
      alert('Please select a class for the assignments.')
      return
    }

    console.log('Starting extraction with:', { 
      fileName: selectedFile.name, 
      fileSize: selectedFile.size, 
      fileType: selectedFile.type,
      selectedClassId 
    })

    setIsProcessing(true)
    setProcessingStep("Starting analysis...")

    try {
      const assignments = await processFileWithGemini(selectedFile)
      console.log('Extracted assignments:', assignments)
      
      if (assignments.length === 0) {
        console.log('No assignments found in document')
        setProcessingStep("No assignments found in the document.")
        alert('No assignments were found in the document. Please check if the document contains assignment information.')
        return
      }
      
      setExtractedAssignments(assignments)
      
      const preview = assignments.map((assignment, index) => 
        `${index + 1}. ${assignment.title}\n   Due: ${assignment.dueDate}\n   Type: ${assignment.type}\n   Points: ${assignment.points || 'N/A'}\n   Description: ${assignment.description}\n`
      ).join('\n')
      
      setPreviewContent(preview)
      setProcessingStep(`Extraction completed! Found ${assignments.length} assignments.`)
      console.log('Extraction successful, assignments set:', assignments.length)
    } catch (error) {
      console.error('Error extracting assignments:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setProcessingStep(`Error: ${errorMessage}`)
      alert(`Failed to extract assignments: ${errorMessage}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkCreate = async () => {
    if (!selectedClassId || extractedAssignments.length === 0) {
      console.log('Cannot create assignments:', { selectedClassId, assignmentsCount: extractedAssignments.length })
      return
    }

    console.log('Starting bulk creation...', { selectedClassId, assignmentsCount: extractedAssignments.length, currentTerm, userId })

    setIsProcessing(true)
    setProcessingStep("Creating assignments...")

    let successCount = 0
    let errorCount = 0

    try {
      for (let i = 0; i < extractedAssignments.length; i++) {
        const assignment = extractedAssignments[i]
        const selectedClass = classes?.find(c => c._id === selectedClassId)
        
        console.log(`Creating assignment ${i + 1}/${extractedAssignments.length}:`, { 
          assignment, 
          selectedClass,
          selectedClassId 
        })

        setProcessingStep(`Creating assignment ${i + 1}/${extractedAssignments.length}: ${assignment.title}`)

        try {
          // Standardize the assignment type using our categorization utility
          const standardizedType = categorizeAssignmentType(assignment.type)
          
          const assignmentData = {
            userId: userId,
            termId: currentTerm._id,
            classId: selectedClassId as Id<"classes">,
            className: selectedClass?.name || 'Unknown Class',
            classColor: selectedClass?.color || 'bg-gray-500',
            title: assignment.title,
            description: assignment.description || '',
            dueDate: assignment.dueDate,
            dueTime: '23:59',
            type: standardizedType,
            maxPoints: assignment.points || undefined,
            completed: false,
            priority: "medium",
          }

          console.log('Assignment data to create:', assignmentData)

          const result = await createAssignment(assignmentData)
          console.log(`Assignment ${i + 1} created successfully:`, result)
          successCount++
        } catch (assignmentError) {
          console.error(`Error creating assignment ${i + 1}:`, assignmentError)
          errorCount++
          // Continue with next assignment instead of stopping
        }
      }

      console.log(`Bulk creation completed! Success: ${successCount}, Errors: ${errorCount}`)
      
      if (successCount > 0) {
        setProcessingStep(`Successfully created ${successCount} assignments!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`)
      } else {
        setProcessingStep(`Failed to create assignments. Please check the console for errors.`)
      }
      
      setTimeout(() => {
        if (successCount > 0) {
          onOpenChange(false)
          setSelectedFile(null)
          setSelectedClassId("")
          setExtractedAssignments([])
          setPreviewContent("")
          setProcessingStep("")
        }
      }, 3000)
    } catch (error) {
      console.error('Error in bulk creation process:', error)
      setProcessingStep(`Error creating assignments: ${error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false)
      setSelectedFile(null)
      setSelectedClassId("")
      setExtractedAssignments([])
      setPreviewContent("")
      setProcessingStep("")
      setShowPreview(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Assignments
          </DialogTitle>
          <DialogDescription>
            Upload a PDF or image of your syllabus, assignment list, or course schedule. 
            Our AI will extract assignment information and add them to your selected class.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="class-select">Select Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder={
                  (classes?.length || 0) === 0
                    ? "No classes found for this term" 
                    : "Choose a class for the assignments"
                } />
              </SelectTrigger>
              <SelectContent>
                {(classes?.length || 0) === 0 ? (
                  <SelectItem value="no-classes" disabled>
                    No classes available in {currentTerm?.name || 'this term'}
                  </SelectItem>
                ) : (
                  classes?.map((classItem) => (
                    <SelectItem key={classItem._id} value={classItem._id}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${classItem.color}`} />
                        <span>{classItem.code} - {classItem.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file-upload">Upload File</Label>
            <div className="mt-2">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {selectedFile ? (
                    <>
                      {selectedFile.type.startsWith('image/') ? (
                        <Image className="w-8 h-8 mb-2 text-blue-500" />
                      ) : (
                        <FileText className="w-8 h-8 mb-2 text-red-500" />
                      )}
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF, PNG, JPG (max 10MB)</p>
                    </>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">{processingStep}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {extractedAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Extracted Assignments ({extractedAssignments.length})</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? 'Hide' : 'Preview'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Review the assignments extracted from your file before adding them to your class.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showPreview && (
                  <Textarea
                    value={previewContent}
                    readOnly
                    className="min-h-[200px] font-mono text-sm"
                  />
                )}
                <div className="grid gap-3 mt-4">
                  {extractedAssignments.slice(0, 3).map((assignment, index) => (                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-black">{assignment.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Due: {assignment.dueDate} • Type: {assignment.type}
                            </p>
                          {assignment.points && (
                            <p className="text-sm text-gray-600">Points: {assignment.points}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {extractedAssignments.length > 3 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{extractedAssignments.length - 3} more assignments
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          {extractedAssignments.length === 0 ? (
            <Button
              onClick={handleExtractAssignments}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Extract Assignments
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleBulkCreate}
              disabled={!selectedClassId || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add {extractedAssignments.length} Assignments
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
