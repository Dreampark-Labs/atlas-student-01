"use client"

import { useState, useEffect } from "react"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2, RotateCcw, Trash } from "lucide-react"
import { Doc } from "@/convex/_generated/dataModel"
import { useClassOperations } from "@/hooks/use-class-operations"
import { useAuthenticatedUserId } from "@/lib/user"

interface DeleteClassDialogProps {
  classData: Doc<"classes">
  children?: React.ReactNode
  type: "soft" | "restore" | "permanent"
}

export function DeleteClassDialog({ classData, children, type }: DeleteClassDialogProps) {
  const [open, setOpen] = useState(false)
  const userId = useAuthenticatedUserId()
  const { 
    isOperationInProgress, 
    performSoftDelete, 
    performRestore, 
    performPermanentDelete 
  } = useClassOperations()

  const isLoading = isOperationInProgress(classData._id)

  // Reset states when dialog closes
  useEffect(() => {
    if (!open && !isLoading) {
      // Dialog can be safely closed
    }
  }, [open, isLoading])

  const handleAction = async () => {
    if (isLoading || !userId) return // Prevent multiple clicks
    
    let success = false
    
    try {
      switch (type) {
        case "soft":
          success = await performSoftDelete(classData._id, classData.name, userId)
          break
        case "restore":
          success = await performRestore(classData._id, classData.name, userId)
          break
        case "permanent":
          success = await performPermanentDelete(classData._id, classData.name, userId)
          break
      }
      
      if (success) {
        setOpen(false)
      }
    } catch (error) {
      console.error(`Error in ${type} operation:`, error)
    }
  }

  const getDialogContent = () => {
    switch (type) {
      case "soft":
        return {
          title: "Delete Class?",
          description: `Are you sure you want to delete "${classData.name}"? This will move the class and all its assignments to trash. You can restore it later.`,
          buttonText: "Delete",
          buttonVariant: "destructive" as const,
          icon: <Trash2 className="h-4 w-4 mr-2" />
        }
      case "restore":
        return {
          title: "Restore Class?",
          description: `Are you sure you want to restore "${classData.name}"? This will restore the class and all its assignments.`,
          buttonText: "Restore",
          buttonVariant: "default" as const,
          icon: <RotateCcw className="h-4 w-4 mr-2" />
        }
      case "permanent":
        return {
          title: "Permanently Delete Class?",
          description: `Are you sure you want to permanently delete "${classData.name}"? This action cannot be undone. The class and all its assignments will be permanently removed.`,
          buttonText: "Permanently Delete",
          buttonVariant: "destructive" as const,
          icon: <Trash className="h-4 w-4 mr-2" />
        }
    }
  }

  const content = getDialogContent()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant={content.buttonVariant} size="sm">
            {content.icon}
            {content.buttonText}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={isLoading}
            className={content.buttonVariant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              content.buttonText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
