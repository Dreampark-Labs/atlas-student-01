"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  File, 
  Download, 
  Search, 
  Calendar, 
  BookOpen, 
  Filter, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Eye,
  ExternalLink
} from "lucide-react"
import { useQuery } from "convex/react"
import { useSettings } from "@/hooks/use-settings"
import { api } from "@/convex/_generated/api"
import { Doc } from "@/convex/_generated/dataModel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUserId } from "@/lib/user"

interface SubmittedAssignmentsProps {
  currentTermId?: string
}

interface GroupedAssignments {
  [termId: string]: {
    term: Doc<"terms">
    classes: {
      [classId: string]: {
        class: Doc<"classes">
        assignments: Doc<"assignments">[]
      }
    }
  }
}

export function SubmittedAssignments({ currentTermId }: SubmittedAssignmentsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTerm, setFilterTerm] = useState<string>(currentTermId || "all")
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set())
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())
  const [selectedAssignment, setSelectedAssignment] = useState<Doc<"assignments"> | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const userId = getCurrentUserId()
  const { formatDate } = useSettings()

  // Fetch data from Convex
  const terms = useQuery(api.terms.getTerms, { userId }) || []
  const assignments = useQuery(api.assignments.getSubmittedAssignments,
    (filterTerm === "all" || filterTerm === "all-terms") ? { userId } : { userId, termId: filterTerm as any }
  ) || []
  const classes = useQuery(api.classes.getAllClasses, { userId }) || []

  // Group assignments by term > class
  const groupedAssignments: GroupedAssignments = {}
  
  assignments.forEach(assignment => {
    const term = terms.find(t => t._id === assignment.termId)
    const assignmentClass = classes.find(c => c._id === assignment.classId)
    
    if (term && assignmentClass) {
      if (!groupedAssignments[assignment.termId]) {
        groupedAssignments[assignment.termId] = {
          term,
          classes: {}
        }
      }
      
      if (!groupedAssignments[assignment.termId].classes[assignment.classId]) {
        groupedAssignments[assignment.termId].classes[assignment.classId] = {
          class: assignmentClass,
          assignments: []
        }
      }
      
      groupedAssignments[assignment.termId].classes[assignment.classId].assignments.push(assignment)
    }
  })

  // Filter assignments based on search query
  const filteredGroupedAssignments: GroupedAssignments = {}
  
  Object.keys(groupedAssignments).forEach(termId => {
    const termData = groupedAssignments[termId]
    const filteredClasses: typeof termData.classes = {}
    
    Object.keys(termData.classes).forEach(classId => {
      const classData = termData.classes[classId]
      const filteredAssignments = classData.assignments.filter(assignment =>
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (assignment.submissionText && assignment.submissionText.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (assignment.submissionFiles && assignment.submissionFiles.some(file => 
          file.name.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
      
      if (filteredAssignments.length > 0) {
        filteredClasses[classId] = {
          ...classData,
          assignments: filteredAssignments
        }
      }
    })
    
    if (Object.keys(filteredClasses).length > 0) {
      filteredGroupedAssignments[termId] = {
        ...termData,
        classes: filteredClasses
      }
    }
  })

  const toggleTerm = (termId: string) => {
    const newExpanded = new Set(expandedTerms)
    if (newExpanded.has(termId)) {
      newExpanded.delete(termId)
    } else {
      newExpanded.add(termId)
    }
    setExpandedTerms(newExpanded)
  }

  const toggleClass = (classId: string) => {
    const newExpanded = new Set(expandedClasses)
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId)
    } else {
      newExpanded.add(classId)
    }
    setExpandedClasses(newExpanded)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive"
      case "medium": return "default"
      case "low": return "secondary"
      default: return "outline"
    }
  }

  const handleViewFile = (file: { url?: string; name: string }) => {
    if (file.url) {
      // Open file in new window/tab
      window.open(file.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleViewSubmission = (assignment: Doc<"assignments">) => {
    setSelectedAssignment(assignment)
    setViewDialogOpen(true)
  }

  const totalSubmissions = assignments.length
  const filteredSubmissions = Object.values(filteredGroupedAssignments)
    .reduce((total, termData) => 
      total + Object.values(termData.classes)
        .reduce((termTotal, classData) => termTotal + classData.assignments.length, 0), 0)

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No submitted work found.</p>
          <p className="text-sm">Complete assignments to see them here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Submitted Work
          </CardTitle>
          <CardDescription>
            All assignments with submitted work organized by term and class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments, content, or files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms?.map((term) => (
                  <SelectItem key={term._id} value={term._id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {filteredSubmissions} of {totalSubmissions} submissions
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Object.entries(filteredGroupedAssignments).map(([termId, termData]) => (
          <Card key={termId}>
            <Collapsible
              open={expandedTerms.has(termId)}
              onOpenChange={() => toggleTerm(termId)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {expandedTerms.has(termId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {termData.term.name}
                    </CardTitle>
                    <Badge variant="outline">
                      {Object.values(termData.classes).reduce(
                        (total, classData) => total + classData.assignments.length,
                        0
                      )} submissions
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {Object.entries(termData.classes).map(([classId, classData]) => (
                    <Card key={classId} className="border-l-4" style={{ borderLeftColor: classData.class.color }}>
                      <Collapsible
                        open={expandedClasses.has(classId)}
                        onOpenChange={() => toggleClass(classId)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                {expandedClasses.has(classId) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: classData.class.color }}
                                />
                                {classData.class.name}
                              </CardTitle>
                              <Badge variant="secondary">
                                {classData.assignments.length} assignments
                              </Badge>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-3">
                            {classData.assignments.map((assignment) => (
                              <Card key={assignment._id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-2 flex-1">
                                        <div>
                                          <h4 className="font-medium">{assignment.title}</h4>
                                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            Due: {formatDate(new Date(assignment.dueDate))}
                                            <BookOpen className="h-3 w-3 ml-2" />
                                            {assignment.type}
                                            <Badge 
                                              variant={getPriorityColor(assignment.priority) as any}
                                              className="text-xs"
                                            >
                                              {assignment.priority}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Written Response */}
                                        {assignment.submissionText && (
                                          <div className="p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">Written Response</span>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewSubmission(assignment)}
                                              >
                                                <Eye className="h-3 w-3 mr-1" />
                                                View
                                              </Button>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                              {assignment.submissionText.substring(0, 150)}
                                              {assignment.submissionText.length > 150 && "..."}
                                            </p>
                                          </div>
                                        )}

                                        {/* File Submissions */}
                                        {assignment.submissionFiles && assignment.submissionFiles.length > 0 && (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <File className="h-4 w-4 text-primary" />
                                              <span className="text-sm font-medium">File Submissions</span>
                                            </div>
                                            <div className="space-y-2">
                                              {assignment.submissionFiles.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                  <div className="flex items-center gap-3">
                                                    <File className="h-4 w-4 text-primary" />
                                                    <div>
                                                      <p className="text-sm font-medium">{file.name}</p>
                                                      <p className="text-xs text-muted-foreground">
                                                        {formatFileSize(file.size)} • 
                                                        Uploaded {formatDate(new Date(file.uploadedAt))}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {file.url && (
                                                      <>
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          onClick={() => handleViewFile(file)}
                                                        >
                                                          <ExternalLink className="h-3 w-3 mr-1" />
                                                          View
                                                        </Button>
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          asChild
                                                        >
                                                          <a href={file.url} download={file.name}>
                                                            <Download className="h-3 w-3 mr-1" />
                                                            Download
                                                          </a>
                                                        </Button>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Written Response Viewer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedAssignment?.title} - Written Response
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <Textarea
              value={selectedAssignment?.submissionText || ""}
              readOnly
              className="min-h-full resize-none border-none shadow-none focus-visible:ring-0 bg-muted/30"
              placeholder="No written response available"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}