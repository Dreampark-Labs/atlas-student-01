"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Upload } from "lucide-react"
import { AddAssignmentDialog } from "@/components/add-assignment-dialog"
import { BulkAssignmentUpload } from "@/components/bulk-assignment-upload"
import type { Doc } from "@/convex/_generated/dataModel"
import type { Term } from "@/types/academic"

interface AddAssignmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTerm: Doc<"terms">
  terms: Term[]
  userId: string
  classes: any[]
}

export function AddAssignmentsDialog({
  open,
  onOpenChange,
  currentTerm,
  terms,
  userId,
  classes,
}: AddAssignmentsDialogProps) {
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)

  // Utility function to adapt Convex data to component expectations
  const adaptTermForComponent = (convexTerm: Doc<"terms">) => ({
    ...convexTerm,
    id: convexTerm._id
  })

  const handleManualAdd = () => {
    setShowAddAssignment(true)
    onOpenChange(false)
  }

  const handleBulkAdd = () => {
    setShowBulkUpload(true)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Assignments</DialogTitle>
            <DialogDescription>
              Choose how you'd like to add assignments to {currentTerm?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={handleManualAdd}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Manual Entry</CardTitle>
                    <CardDescription className="text-sm">
                      Add individual assignments one at a time
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Perfect for adding single assignments with detailed information, due dates, and custom settings.
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={handleBulkAdd}>
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Upload className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Bulk Upload</CardTitle>
                    <CardDescription className="text-sm">
                      Upload assignments from a document or file
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Great for importing multiple assignments from syllabi, documents, or when setting up a new semester.
                </p>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Assignment Dialog */}
      <AddAssignmentDialog
        open={showAddAssignment}
        onOpenChange={setShowAddAssignment}
        currentTerm={adaptTermForComponent(currentTerm)}
        terms={terms}
      />

      {/* Bulk Upload Dialog */}
      <BulkAssignmentUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        currentTerm={currentTerm}
        userId={userId}
        classes={classes}
      />
    </>
  )
}
