"use client"

import { useState, useCallback } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

export function useClassOperations() {
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null)
  
  const softDeleteClass = useMutation(api.classes.softDeleteClass)
  const restoreClass = useMutation(api.classes.restoreClass)
  const permanentDeleteClass = useMutation(api.classes.permanentDeleteClass)
  const { toast } = useToast()

  const isOperationInProgress = useCallback((classId: string) => {
    return operationInProgress === classId
  }, [operationInProgress])

  const performSoftDelete = useCallback(async (classId: Id<"classes">, className: string, userId: string) => {
    if (operationInProgress) return false
    
    setOperationInProgress(classId)
    try {
      await softDeleteClass({ classId, userId })
      toast({
        title: "Class Deleted",
        description: `${className} has been moved to trash. You can restore it later.`,
      })
      return true
    } catch (error) {
      console.error('Error soft deleting class:', error)
      toast({
        title: "Error",
        description: "Failed to delete class. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setTimeout(() => setOperationInProgress(null), 500)
    }
  }, [operationInProgress, softDeleteClass, toast])

  const performRestore = useCallback(async (classId: Id<"classes">, className: string, userId: string) => {
    if (operationInProgress) return false
    
    setOperationInProgress(classId)
    try {
      await restoreClass({ classId, userId })
      toast({
        title: "Class Restored",
        description: `${className} has been restored successfully.`,
      })
      return true
    } catch (error) {
      console.error('Error restoring class:', error)
      toast({
        title: "Error",
        description: "Failed to restore class. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setTimeout(() => setOperationInProgress(null), 500)
    }
  }, [operationInProgress, restoreClass, toast])

  const performPermanentDelete = useCallback(async (classId: Id<"classes">, className: string, userId: string) => {
    if (operationInProgress) return false
    
    setOperationInProgress(classId)
    try {
      await permanentDeleteClass({ classId, userId })
      toast({
        title: "Class Permanently Deleted",
        description: `${className} and all its assignments have been permanently deleted.`,
      })
      return true
    } catch (error) {
      console.error('Error permanently deleting class:', error)
      toast({
        title: "Error",
        description: "Failed to permanently delete class. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setTimeout(() => setOperationInProgress(null), 500)
    }
  }, [operationInProgress, permanentDeleteClass, toast])

  return {
    operationInProgress,
    isOperationInProgress,
    performSoftDelete,
    performRestore,
    performPermanentDelete,
  }
}
