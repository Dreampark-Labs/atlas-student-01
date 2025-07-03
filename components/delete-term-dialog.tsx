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
import { useTermOperations } from "@/hooks/use-term-operations"

interface DeleteTermDialogProps {
  termData: Doc<"terms">
  children?: React.ReactNode
  type: "soft" | "restore" | "permanent"
  onSuccess?: () => void
}

export function DeleteTermDialog({ termData, children, type, onSuccess }: DeleteTermDialogProps) {
  const [open, setOpen] = useState(false)
  const { 
    operationInProgress,
    handleSoftDelete, 
    handleRestore, 
    handlePermanentDelete 
  } = useTermOperations()

  // Reset states when dialog closes
  useEffect(() => {
    if (!open && !operationInProgress) {
      // Dialog can be safely closed
    }
  }, [open, operationInProgress])

  const handleAction = async () => {
    console.log(`Delete dialog handleAction called for term: ${termData.name} (${termData._id}), type: ${type}`)
    if (operationInProgress) {
      console.log('Operation already in progress, ignoring click')
      return // Prevent multiple clicks
    }
    
    try {
      console.log(`Starting ${type} operation for term: ${termData._id}`)
      switch (type) {
        case "soft":
          await handleSoftDelete(termData._id)
          break
        case "restore":
          await handleRestore(termData._id)
          break
        case "permanent":
          await handlePermanentDelete(termData._id)
          break
      }
      
      console.log(`${type} operation completed successfully`)
      setOpen(false)
      // Call success callback after a brief delay to ensure state updates
      setTimeout(() => {
        console.log('Calling onSuccess callback')
        onSuccess?.()
      }, 100)
    } catch (error) {
      console.error(`Error in ${type} operation:`, error)
    }
  }

  const getDialogContent = () => {
    switch (type) {
      case "soft":
        return {
          title: "Delete Term?",
          description: `Are you sure you want to delete "${termData.name}"? This will move the term and all its classes and assignments to trash. You can restore it later.`,
          buttonText: "Delete",
          buttonVariant: "destructive" as const,
          icon: <Trash2 className="h-4 w-4 mr-2" />
        }
      case "restore":
        return {
          title: "Restore Term?",
          description: `Are you sure you want to restore "${termData.name}"? This will restore the term and all its classes and assignments.`,
          buttonText: "Restore",
          buttonVariant: "default" as const,
          icon: <RotateCcw className="h-4 w-4 mr-2" />
        }
      case "permanent":
        return {
          title: "Permanently Delete Term?",
          description: `Are you sure you want to permanently delete "${termData.name}"? This action cannot be undone. The term and all its classes and assignments will be permanently removed.`,
          buttonText: "Permanently Delete",
          buttonVariant: "destructive" as const,
          icon: <Trash className="h-4 w-4 mr-2" />
        }
    }
  }

  const content = getDialogContent()

  return (
    <AlertDialog open={open} onOpenChange={(newOpen) => {
      console.log(`Delete dialog open state changing: ${open} -> ${newOpen}`)
      setOpen(newOpen)
    }}>
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
          <AlertDialogCancel disabled={operationInProgress}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAction}
            disabled={operationInProgress}
            className={content.buttonVariant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {operationInProgress ? (
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
