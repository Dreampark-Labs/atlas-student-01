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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileText, Check, X, AlertTriangle, Download } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { getCurrentUserId } from "@/lib/user"
import { categorizeAssignmentType } from "@/lib/assignment-categorization"

interface GradeImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTerm: any
  userId: string
}

interface ParsedGrade {
  assignmentTitle: string
  grade: number
  maxPoints: number
  className?: string
  type?: string
  confidence: number
  matched?: boolean
  assignmentId?: string
}

export function GradeImportDialog({
  open,
  onOpenChange,
  currentTerm,
  userId,
}: GradeImportDialogProps) {
  const [importMethod, setImportMethod] = useState<"manual" | "file" | "">("")
  const [gradeText, setGradeText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedGrades, setParsedGrades] = useState<ParsedGrade[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const updateAssignment = useMutation(api.assignments.updateAssignment)
  const assignments = useQuery(api.assignments.getAssignmentsByTerm, {
    userId,
    termId: currentTerm._id
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB.')
        return
      }
      setSelectedFile(file)
    }
  }

  const parseGradesFromText = (text: string): ParsedGrade[] => {
    const lines = text.split('\n').filter(line => line.trim())
    const grades: ParsedGrade[] = []
    
    for (const line of lines) {
      // Try different patterns to extract grades
      const patterns = [
        // "Assignment Name: 95/100"
        /(.+?):\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/,
        // "Assignment Name - 95/100"
        /(.+?)\s*-\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/,
        // "Assignment Name, 95, 100"
        /(.+?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/,
        // "Assignment Name 95 100"
        /(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/,
      ]
      
      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          const title = match[1].trim()
          const grade = parseFloat(match[2])
          const maxPoints = parseFloat(match[3])
          
          if (!isNaN(grade) && !isNaN(maxPoints) && maxPoints > 0) {
            grades.push({
              assignmentTitle: title,
              grade,
              maxPoints,
              confidence: 0.8,
              matched: false
            })
            break
          }
        }
      }
    }
    
    return grades
  }

  const matchGradesToAssignments = (grades: ParsedGrade[]): ParsedGrade[] => {
    if (!assignments) return grades
    
    return grades.map(grade => {
      // Try to find matching assignment
      const matchedAssignment = assignments.find(assignment => {
        const titleMatch = assignment.title.toLowerCase().includes(grade.assignmentTitle.toLowerCase()) ||
                          grade.assignmentTitle.toLowerCase().includes(assignment.title.toLowerCase())
        return titleMatch
      })
      
      if (matchedAssignment) {
        return {
          ...grade,
          matched: true,
          className: matchedAssignment.className,
          type: matchedAssignment.type,
          assignmentId: matchedAssignment._id
        }
      }
      
      return grade
    })
  }

  const processTextInput = () => {
    if (!gradeText.trim()) {
      toast.error("Please enter grade data")
      return
    }
    
    setIsProcessing(true)
    try {
      const parsed = parseGradesFromText(gradeText)
      const matched = matchGradesToAssignments(parsed)
      setParsedGrades(matched)
      
      if (matched.length === 0) {
        toast.error("No valid grades found in the text")
      } else {
        toast.success(`Found ${matched.length} grades, ${matched.filter(g => g.matched).length} matched to existing assignments`)
      }
    } catch (error) {
      toast.error("Error parsing grades")
    } finally {
      setIsProcessing(false)
    }
  }

  const processFileInput = async () => {
    if (!selectedFile) {
      toast.error("Please select a file")
      return
    }
    
    setIsProcessing(true)
    try {
      const text = await selectedFile.text()
      const parsed = parseGradesFromText(text)
      const matched = matchGradesToAssignments(parsed)
      setParsedGrades(matched)
      
      if (matched.length === 0) {
        toast.error("No valid grades found in the file")
      } else {
        toast.success(`Found ${matched.length} grades, ${matched.filter(g => g.matched).length} matched to existing assignments`)
      }
    } catch (error) {
      toast.error("Error reading file")
    } finally {
      setIsProcessing(false)
    }
  }

  const importGrades = async () => {
    const gradesToImport = parsedGrades.filter(grade => grade.matched && grade.assignmentId)
    
    if (gradesToImport.length === 0) {
      toast.error("No matched grades to import")
      return
    }
    
    setIsImporting(true)
    try {
      for (const grade of gradesToImport) {
        await updateAssignment({
          assignmentId: grade.assignmentId as Id<"assignments">,
          userId,
          updates: {
            grade: grade.grade,
            maxPoints: grade.maxPoints,
            completed: true
          }
        })
      }
      
      toast.success(`Successfully imported ${gradesToImport.length} grades`)
      onOpenChange(false)
    } catch (error) {
      toast.error("Error importing grades")
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `# Grade Import Template
# Format: Assignment Name: Grade/Max Points
# Examples:
Homework 1: 95/100
Quiz 2: 18/20
Project 1 - Final Report: 88/100
Midterm Exam, 85, 100
`
    
    const blob = new Blob([template], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'grade-import-template.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Grades</DialogTitle>
          <DialogDescription>
            Import grades from external sources or manual entry
          </DialogDescription>
        </DialogHeader>

        {!importMethod && (
          <div className="grid gap-4 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Choose Import Method</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            
            <div className="grid gap-4">
              <Card 
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" 
                onClick={() => setImportMethod("manual")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Manual Entry</CardTitle>
                      <CardDescription className="text-sm">
                        Paste grade data as text
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" 
                onClick={() => setImportMethod("file")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <Upload className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">File Upload</CardTitle>
                      <CardDescription className="text-sm">
                        Upload a text file with grade data
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {importMethod === "manual" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="grade-text">Grade Data</Label>
              <Textarea
                id="grade-text"
                placeholder="Enter grades in format: Assignment Name: Grade/MaxPoints&#10;Example:&#10;Homework 1: 95/100&#10;Quiz 2: 18/20"
                value={gradeText}
                onChange={(e) => setGradeText(e.target.value)}
                rows={8}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setImportMethod("")} variant="outline">
                Back
              </Button>
              <Button onClick={processTextInput} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Parse Grades"}
              </Button>
            </div>
          </div>
        )}

        {importMethod === "file" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="grade-file">Grade File</Label>
              <Input
                id="grade-file"
                type="file"
                accept=".txt,.csv"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setImportMethod("")} variant="outline">
                Back
              </Button>
              <Button onClick={processFileInput} disabled={isProcessing || !selectedFile}>
                {isProcessing ? "Processing..." : "Parse File"}
              </Button>
            </div>
          </div>
        )}

        {parsedGrades.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Parsed Grades</h3>
              <Badge variant="outline">
                {parsedGrades.filter(g => g.matched).length} of {parsedGrades.length} matched
              </Badge>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedGrades.map((grade, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{grade.assignmentTitle}</div>
                          {grade.className && (
                            <div className="text-sm text-muted-foreground">{grade.className}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {grade.grade}/{grade.maxPoints} ({((grade.grade / grade.maxPoints) * 100).toFixed(1)}%)
                      </TableCell>
                      <TableCell>
                        {grade.matched ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Matched
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            No Match
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {parsedGrades.length > 0 && (
            <Button onClick={importGrades} disabled={isImporting}>
              {isImporting ? "Importing..." : `Import ${parsedGrades.filter(g => g.matched).length} Grades`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
