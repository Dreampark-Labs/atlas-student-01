"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthenticatedUserId } from "@/lib/user"
import type { Id } from "@/convex/_generated/dataModel"

export function useTermOperations() {
  const [operationInProgress, setOperationInProgress] = useState(false)
  const { toast } = useToast()
  const userId = useAuthenticatedUserId()
  
  const softDeleteTerm = useMutation(api.terms.softDeleteTerm)
  const restoreTerm = useMutation(api.terms.restoreTerm)
  const permanentDeleteTerm = useMutation(api.terms.permanentDeleteTerm)

  const handleSoftDelete = async (termId: Id<"terms">) => {
    if (operationInProgress || !userId) return

    console.log(`Starting soft delete for term: ${termId}`)
    setOperationInProgress(true)
    try {
      await softDeleteTerm({ termId, userId })
      console.log(`Successfully deleted term: ${termId}`)
      toast({
        title: "Term deleted",
        description: "The term has been moved to trash. You can restore it later if needed.",
      })
    } catch (error) {
      console.error("Error soft deleting term:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete term. Please try again.",
        variant: "destructive",
      })
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleRestore = async (termId: Id<"terms">) => {
    if (operationInProgress || !userId) return

    setOperationInProgress(true)
    try {
      await restoreTerm({ termId, userId })
      toast({
        title: "Term restored",
        description: "The term and all its classes have been restored successfully.",
      })
    } catch (error) {
      console.error("Error restoring term:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore term. Please try again.",
        variant: "destructive",
      })
    } finally {
      setOperationInProgress(false)
    }
  }

  const handlePermanentDelete = async (termId: Id<"terms">) => {
    if (operationInProgress || !userId) return

    setOperationInProgress(true)
    try {
      await permanentDeleteTerm({ termId, userId })
      toast({
        title: "Term permanently deleted",
        description: "The term and all its data have been permanently deleted.",
      })
    } catch (error) {
      console.error("Error permanently deleting term:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to permanently delete term. Please try again.",
        variant: "destructive",
      })
    } finally {
      setOperationInProgress(false)
    }
  }

  return {
    operationInProgress,
    handleSoftDelete,
    handleRestore,
    handlePermanentDelete,
  }
}
