"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, BookOpen, BarChart3, Trash2, MoreHorizontal, RotateCcw, Trash } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DeleteTermDialog } from "@/components/delete-term-dialog"
import { useTermOperations } from "@/hooks/use-term-operations"
import { useSettings } from "@/hooks/use-settings"
import type { Term } from "@/types/academic"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { createAllTermsSlug, isAllTermsId, generateAllTermsId } from "@/lib/url-utils"
import { getCurrentUserId } from "@/lib/user"

// Define a flexible term type that can work with both Convex docs and our UI representation
type TermData = {
  _id: Id<"terms"> | string;
  id?: Id<"terms"> | string; // Some components expect 'id' instead of '_id'
  name: string;
  year: number;
  season: string;
  isActive: boolean;
  stats: {
    pendingTasks: number;
    classes: number;
    gpa: number;
    completed: number;
  };
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt?: number;
  updatedAt?: number;
  userId?: string;
  _creationTime?: number;
}

interface TermSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  terms: TermData[]
  deletedTerms?: TermData[]
  currentTerm: TermData
  onTermChange: (termId: string) => void
  onCreateTerm: (term: { name: string; year: number; season: string }) => void
}

export function TermSelector({
  open,
  onOpenChange,
  terms,
  deletedTerms = [],
  currentTerm,
  onTermChange,
  onCreateTerm,
}: TermSelectorProps) {
  const [activeTab, setActiveTab] = useState("switch")
  const [newTerm, setNewTerm] = useState({
    season: "",
    year: new Date().getFullYear(),
    customName: "",
  })
  const [termToDelete, setTermToDelete] = useState<Doc<"terms"> | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [switchingTermId, setSwitchingTermId] = useState<string | null>(null)
  const { formatDate } = useSettings()

  const { operationInProgress, handleSoftDelete } = useTermOperations()

  const seasons = ["Spring", "Summer", "Fall", "Winter"]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  // Auto-switch to deleted tab when a term is moved to deleted
  useEffect(() => {
    if (deletedTerms.length > 0 && activeTab === "switch") {
      // Check if we just moved a term to deleted
      const termWasJustDeleted = deletedTerms.some(deletedTerm =>
        deletedTerm.deletedAt && Date.now() - deletedTerm.deletedAt < 5000 // Within last 5 seconds
      )
      if (termWasJustDeleted) {
        console.log('Term was just deleted, switching to deleted tab')
        setActiveTab("deleted")
      }
    }
  }, [deletedTerms, activeTab])

  const handleCreateTerm = async () => {
    if (!newTerm.season || !newTerm.year || isCreating) return
    
    setIsCreating(true)
    try {
      const termName = newTerm.customName || `${newTerm.season} ${newTerm.year}`
      await onCreateTerm({
        name: termName,
        year: newTerm.year,
        season: newTerm.season,
      })
      setNewTerm({
        season: "",
        year: currentYear,
        customName: "",
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating term:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleTermDeleted = (deletedTermId: string) => {
    console.log(`Term deleted: ${deletedTermId}, current term: ${currentTerm?._id}`)
    console.log(`Available terms before deletion:`, terms.map(t => `${t.name} (${t._id})`))
    
    // If the deleted term was the current term, switch to another term
    if (currentTerm?._id === deletedTermId) {
      const remainingTerms = terms.filter(term => term._id !== deletedTermId)
      console.log(`Remaining terms after deletion:`, remainingTerms.map(t => `${t.name} (${t._id})`))
      
      if (remainingTerms.length > 0) {
        // Find an active term or use the first available term
        const activeTermInList = remainingTerms.find(term => term.isActive)
        const nextTerm = activeTermInList || remainingTerms[0]
        console.log(`Switching to next term: ${nextTerm.name} (${nextTerm._id})`)
        onTermChange(nextTerm._id)
      } else {
        console.log('No remaining terms, staying on current selection')
      }
    }
    
    // Switch to deleted terms tab to show the result - don't close dialog
    console.log('Switching to deleted tab')
    setActiveTab("deleted")
  }

  const handleDeleteConfirm = async () => {
    if (!termToDelete || operationInProgress) return
    
    try {
      await handleSoftDelete(termToDelete._id)
      setShowDeleteDialog(false)
      setTermToDelete(null)
      handleTermDeleted(termToDelete._id)
    } catch (error) {
      console.error('Error deleting term:', error)
    }
  }

  const handleTermSelect = async (termId: string) => {
    if (isSwitching || switchingTermId === termId) return
    
    setIsSwitching(true)
    setSwitchingTermId(termId)
    try {
      // Check if we're switching to "All Terms"
      const isAllTerms = isAllTermsId(termId) || termId === "all-terms";
      
      // Use "all-terms" as a special identifier for the All Terms view
      // This ensures the handler in TermLayout recognizes it properly
      if (isAllTerms) {
        console.log("Selecting All Terms view")
        // Close dialog immediately before the navigation happens
        onOpenChange(false)
        await onTermChange("all-terms")
      } else {
        console.log("Selecting regular term:", termId)
        // Close dialog immediately before the navigation happens
        onOpenChange(false)
        await onTermChange(termId)
      }
    } catch (error) {
      console.error('Error switching term:', error)
    } finally {
      setIsSwitching(false)
      setSwitchingTermId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[80vh] overflow-y-auto">
        {operationInProgress && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2 text-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-sm font-medium">Processing...</span>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>Manage Academic Terms</DialogTitle>
          <DialogDescription>Switch between terms or create new ones to organize your academic data.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="switch">Switch Terms</TabsTrigger>
            <TabsTrigger value="create">Create New Term</TabsTrigger>
            <TabsTrigger value="deleted">Deleted Terms</TabsTrigger>
          </TabsList>

          <TabsContent value="switch" className="space-y-4">
            <div className="grid gap-4">
              {/* All Terms option */}
              <div
                className={`cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
                  isAllTermsId(currentTerm?._id) || currentTerm?._id === "all-terms"
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/50"
                }`}
                onClick={() => {
                  // Always use "all-terms" as the identifier
                  // The term handler will generate the correct URL based on the user ID
                  handleTermSelect("all-terms");
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">All Terms</h3>
                      <p className="text-sm text-muted-foreground">View all classes, assignments, and grades</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Permanent</Badge>
                    {(isAllTermsId(currentTerm?._id) || currentTerm?._id === "all-terms") && <Badge variant="outline">Selected</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        {terms?.reduce((total, term) => total + (term.stats?.classes || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Classes</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">All</p>
                      <p className="text-xs text-muted-foreground">Terms</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        {terms?.reduce((total, term) => total + (term.stats?.completed || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        {terms?.reduce((total, term) => total + (term.stats?.pendingTasks || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </div>
              </div>

              {terms?.length > 0 ? terms.map((term) => {
                const isSelected = term._id === currentTerm?._id
                const isLoading = switchingTermId === term._id
                
                return (
                  <div
                    key={term._id}
                    className={`cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                        : "border-border bg-card hover:border-muted-foreground/30 hover:bg-accent/50"
                    } ${isLoading ? "opacity-70 pointer-events-none" : ""}`}
                    onClick={() => !isLoading && handleTermSelect(term._id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {isLoading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{term.name}</h3>
                          <p className="text-sm text-muted-foreground">{term.season} term</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {term.isActive && <Badge>Current</Badge>}
                        {isSelected && <Badge variant="outline">Selected</Badge>}
                        {!term.isActive && (
                          <div onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                                  disabled={operationInProgress || isLoading}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    console.log(`Delete menu clicked for term: ${term.name} (${term._id})`)
                                    setTermToDelete(term)
                                    setShowDeleteDialog(true)
                                  }}
                                  disabled={operationInProgress}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Term
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.classes}</p>
                          <p className="text-xs text-muted-foreground">Classes</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.gpa}</p>
                          <p className="text-xs text-muted-foreground">GPA</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.completed}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.pendingTasks}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No terms available.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deleted" className="space-y-4">
            <div className="grid gap-4">
              {deletedTerms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No deleted terms found.</p>
                </div>
              ) : (
                deletedTerms.map((term) => (
                  <div
                    key={term._id}
                    className="rounded-lg border border-border bg-muted/30 p-4 opacity-80"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{term.name}</h3>
                        <p className="text-sm text-muted-foreground">{term.season} term</p>
                        <Badge variant="destructive" className="text-xs mt-1">Deleted</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DeleteTermDialog
                          termData={term}
                          type="restore"
                          onSuccess={() => setActiveTab("switch")}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-accent hover:text-accent-foreground"
                            disabled={operationInProgress}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                        </DeleteTermDialog>
                        <DeleteTermDialog termData={term} type="permanent">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="hover:bg-destructive/90"
                            disabled={operationInProgress}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete Forever
                          </Button>
                        </DeleteTermDialog>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.classes}</p>
                          <p className="text-xs text-muted-foreground">Classes</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.gpa}</p>
                          <p className="text-xs text-muted-foreground">GPA</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.completed}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{term.stats.pendingTasks}</p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </div>
                    {term.deletedAt && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Deleted on {formatDate(new Date(term.deletedAt))}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="mr-2 h-5 w-5" />
                  Create New Term
                </CardTitle>
                <CardDescription>Add a new academic term to track your courses and assignments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="season">Season</Label>
                    <Select value={newTerm.season} onValueChange={(value) => setNewTerm({ ...newTerm, season: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season} value={season}>
                            {season}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Select
                      value={newTerm.year.toString()}
                      onValueChange={(value) => setNewTerm({ ...newTerm, year: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="customName">Custom Name (Optional)</Label>
                  <Input
                    id="customName"
                    value={newTerm.customName}
                    onChange={(e) => setNewTerm({ ...newTerm, customName: e.target.value })}
                    placeholder={
                      newTerm.season && newTerm.year ? `${newTerm.season} ${newTerm.year}` : "e.g., Spring 2024"
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to use default format: {newTerm.season} {newTerm.year}
                  </p>
                </div>
                <Button
                  onClick={handleCreateTerm}
                  disabled={!newTerm.season || !newTerm.year || isCreating}
                  className="w-full"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Term
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Manual Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Term?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{termToDelete?.name}"? This will move the term and all its classes and assignments to trash. You can restore it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setTermToDelete(null)
              }}
              disabled={operationInProgress}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={operationInProgress}
            >
              {operationInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
