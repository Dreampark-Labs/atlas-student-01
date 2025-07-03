"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, File, X, Download, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { useAuthenticatedUserId } from "@/lib/user"

interface FileUploadProps {
  assignmentId: Id<"assignments">
  submissionFiles?: Array<{
    name: string
    size: number
    type: string
    url?: string
    uploadedAt: number
  }>
  onFileUploaded?: () => void
}

export function FileUpload({ assignmentId, submissionFiles = [], onFileUploaded }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const userId = useAuthenticatedUserId()

  const updateAssignment = useMutation(api.assignments.updateAssignment)

  const handleFileUpload = async (file: File) => {
    if (!file || !userId) return

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB")
      return
    }

    setIsUploading(true)
    try {
      // Convert file to base64 for storage
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.readAsDataURL(file)
      })

      // Add file to existing submission files
      const newFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: `data:${file.type};base64,${base64}`,
        uploadedAt: Date.now()
      }

      const updatedFiles = [...submissionFiles, newFile]

      await updateAssignment({
        assignmentId,
        userId,
        updates: {
          submissionFiles: updatedFiles
        }
      })

      toast.success("File uploaded successfully!")
      onFileUploaded?.()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload file")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileRemove = (fileIndex: number) => {
    if (!userId) return
    
    const updatedFiles = submissionFiles.filter((_, index) => index !== fileIndex)
    
    updateAssignment({
      assignmentId,
      userId,
      updates: {
        submissionFiles: updatedFiles
      }
    }).then(() => {
      toast.success("File removed successfully!")
      onFileUploaded?.()
    }).catch(() => {
      toast.error("Failed to remove file")
    })
  }

  const handleFileDownload = (file: any) => {
    if (file.url) {
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Backup
        </CardTitle>
        <CardDescription>
          Upload a copy of your work as backup in case your teacher loses your homework
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submissionFiles.length > 0 ? (
          <div className="space-y-4">
            {submissionFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <File className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      {file.name}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {formatFileSize(file.size)} • Uploaded {formatDate(file.uploadedAt.toString())}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Uploaded
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileDownload(file)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDrag}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Upload your work</p>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your file here, or click to browse
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Choose File"}
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Maximum file size: 10MB. Supported formats: PDF, DOC, DOCX, TXT, images, and more.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
