"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Term } from "@/types/academic";
import { toast } from "sonner";
import { AssignmentDetailDialog } from "@/components/assignment-detail-dialog";
import { AssignmentWorkDialog } from "@/components/assignment-work-dialog";
import { GradeInputDialog } from "@/components/grade-input-dialog";
import { getCurrentUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { categorizeAssignmentType } from "@/lib/assignment-categorization";
import { useSettings } from "@/hooks/use-settings";

interface TodoListProps {
  currentTerm: Term;
  highlightAssignmentId?: string;
  searchTerm?: string;
  openDialog?: boolean;
}

export function TodoList({
  currentTerm,
  highlightAssignmentId,
  searchTerm,
  openDialog = false,
}: TodoListProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [workAssignment, setWorkAssignment] = useState<any>(null);
  const [showWorkDialog, setShowWorkDialog] = useState(false);
  const [gradeAssignment, setGradeAssignment] = useState<any>(null);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const userId = getCurrentUserId();
  const { formatDate, formatTime } = useSettings();
  
  // Add a mounted state to prevent hydration mismatches
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allAssignments = useQuery(
    api.assignments.getAllAssignments,
    currentTerm.id === "all-terms" ? { userId } : "skip"
  );

  const termAssignments = useQuery(
    api.assignments.getAssignmentsByTerm,
    currentTerm.id !== "all-terms" ? { userId, termId: currentTerm.id as Id<"terms"> } : "skip"
  );

  const assignments = currentTerm.id === "all-terms" ? allAssignments : termAssignments;

  const selectedAssignment = selectedAssignmentId && assignments
    ? assignments.find((a) => a._id === selectedAssignmentId)
    : null;

  const allClasses = useQuery(
    api.classes.getAllClasses,
    currentTerm.id === "all-terms" ? { userId } : "skip"
  );

  const termClasses = useQuery(
    api.classes.getClassesByTerm,
    currentTerm.id !== "all-terms" ? { userId, termId: currentTerm.id as Id<"terms"> } : "skip"
  );

  const classes = currentTerm.id === "all-terms" ? allClasses : termClasses;

  const updateAssignment = useMutation(api.assignments.updateAssignment);

  const handleToggleComplete = async (assignmentId: string, completed: boolean) => {
    try {
      await updateAssignment({
        assignmentId: assignmentId as Id<"assignments">,
        updates: { completed },
        userId,
      });
      toast.success(completed ? "Assignment completed! 🎉" : "Assignment marked as incomplete");
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    }
  };

  // Helper function to get days until due date
  const getDaysUntilDue = (dueDate: string) => {
    if (!isMounted) return 0; // Prevent hydration mismatch
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let due: Date;
    if (dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      due = new Date(dueDate + "T00:00:00");
    } else {
      due = new Date(dueDate);
    }
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to categorize assignments by due date
  const categorizeAssignmentsByDueDate = (assignments: any[]) => {
    if (!isMounted) {
      // Return empty categories during SSR to prevent hydration mismatch
      return {
        overdue: [],
        dueToday: [],
        dueTomorrow: [],
        dueThisWeek: [],
        dueLater: []
      };
    }
    
    // Get current date in user's timezone
    const now = new Date();
    
    // Get today's date properly - normalize to midnight for date-only comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const categories = {
      overdue: [] as any[],
      dueToday: [] as any[],
      dueTomorrow: [] as any[],
      dueThisWeek: [] as any[],
      dueLater: [] as any[]
    };

    assignments.forEach(assignment => {
      if (assignment.completed) {
        // Do nothing with completed assignments or handle separately if needed
        return;
      }

      // Parse the assignment due date using the same logic as getDaysUntilDue
      let dueDate: Date;
      if (assignment.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dueDate = new Date(assignment.dueDate + "T00:00:00");
      } else {
        dueDate = new Date(assignment.dueDate);
      }
      // Create a date-only version for comparison (in local timezone)
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      // Compare dates using getTime() for exact comparison
      const todayTime = today.getTime();
      const tomorrowTime = tomorrow.getTime();
      const dueDateTime = dueDateOnly.getTime();
      
      if (dueDateTime === todayTime) {
        categories.dueToday.push(assignment);
      } 
      else if (dueDateTime < todayTime) {
        categories.overdue.push(assignment);
      } 
      else if (dueDateTime === tomorrowTime) {
        categories.dueTomorrow.push(assignment);
      } 
      else if (dueDateTime <= weekFromNow.getTime()) {
        categories.dueThisWeek.push(assignment);
      } 
      else {
        categories.dueLater.push(assignment);
      }
    });

    return categories;
  };

  const getPriorityIcon = (priority: string, daysUntil: number) => {
    if (daysUntil <= 1 && daysUntil >= 0)
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (priority === "high")
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "High Priority";
      case "medium":
        return "Medium Priority";
      case "low":
        return "Low Priority";
      default:
        return "Medium Priority";
    }
  };

  // Function to render individual assignment
  const renderAssignment = (assignment: any) => {
    const daysUntil = getDaysUntilDue(assignment.dueDate);
    const displayPriority = assignment.autoPriority || assignment.priority || "medium";
    const isHighlighted = highlightAssignmentId === assignment._id;

    return (
      <Card
        key={assignment._id}
        data-assignment-id={assignment._id}
        className={`${assignment.completed ? "opacity-60" : ""} ${
          isHighlighted ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Checkbox
              checked={assignment.completed}
              onCheckedChange={(checked) =>
                handleToggleComplete(assignment._id, checked as boolean)
              }
              className="mt-1"
              disabled={!currentTerm.isActive}
              aria-label={`Mark ${assignment.title} as ${assignment.completed ? "incomplete" : "complete"}`}
            />

            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className={`font-medium text-foreground ${assignment.completed ? "line-through" : ""}`}
                  >
                    {assignment.title}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className={`w-3 h-3 rounded-full ${assignment.classColor}`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {assignment.className}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {assignment.type}
                    </Badge>
                    {assignment.grade && assignment.maxPoints && (
                      <Badge variant="secondary" className="text-xs">
                        {assignment.grade}/{assignment.maxPoints} (
                        {(
                          (assignment.grade / assignment.maxPoints) *
                          100
                        ).toFixed(1)}
                        %)
                      </Badge>
                    )}
                    {assignment.grade && !assignment.maxPoints && (
                      <Badge variant="secondary" className="text-xs">
                        {assignment.grade}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {currentTerm.isActive && getPriorityIcon(displayPriority, daysUntil)}
                  <Badge
                    variant={getPriorityBadgeVariant(displayPriority) as any}
                    title={`Priority: ${getPriorityLabel(displayPriority)}`}
                  >
                    {displayPriority}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {(() => {
                      let fullDateTime: Date;
                      if (assignment.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        fullDateTime = new Date(assignment.dueDate + "T" + (assignment.dueTime || "23:59") + ":00");
                      } else {
                        fullDateTime = new Date(assignment.dueDate);
                      }
                      return formatDate(fullDateTime);
                    })()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {(() => {
                      let fullDateTime: Date;
                      if (assignment.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        fullDateTime = new Date(assignment.dueDate + "T" + (assignment.dueTime || "23:59") + ":00");
                      } else {
                        fullDateTime = new Date(assignment.dueDate);
                      }
                      return formatTime(fullDateTime);
                    })()}
                  </div>
                  {assignment.estimatedTime && (
                    <span className="text-xs">
                      Est. {assignment.estimatedTime}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {currentTerm.isActive && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignmentId(assignment._id);
                          setShowDetailDialog(true);
                        }}
                        className="text-xs h-8"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setWorkAssignment(assignment);
                          setShowWorkDialog(true);
                        }}
                        className="text-xs h-8"
                      >
                        Add Work
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGradeAssignment(assignment);
                          setShowGradeDialog(true);
                        }}
                        className="text-xs h-8"
                      >
                        Add Grade
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Filter and sort assignments
  const filteredAndSortedAssignments = useMemo(() => {
    if (!assignments) return [];

    let filtered = assignments.filter((assignment) => {
      if (assignment.completed) return false;
      if (assignment.isDeleted) return false;

      if (classFilter !== "all" && assignment.classId !== classFilter) {
        return false;
      }

      if (typeFilter !== "all" && assignment.type !== typeFilter) {
        return false;
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          assignment.title.toLowerCase().includes(searchLower) ||
          assignment.className.toLowerCase().includes(searchLower) ||
          assignment.type.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Sort by due date
    return filtered.sort((a, b) => {
      const aDate = new Date(a.dueDate);
      const bDate = new Date(b.dueDate);
      return aDate.getTime() - bDate.getTime();
    });
  }, [assignments, classFilter, typeFilter, searchTerm]);

  // Get available class and type filters
  const availableClasses = useMemo(() => {
    if (!classes) return [];
    return classes.map((c) => ({ id: c._id, name: c.name, code: c.code }));
  }, [classes]);

  const availableTypes = useMemo(() => {
    if (!assignments) return [];
    const types = new Set(assignments.map((a) => a.type));
    return Array.from(types).sort();
  }, [assignments]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-[180px] bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-[180px] bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!assignments || !classes) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-[180px] bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-[180px] bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {availableClasses.map((classItem) => (
              <SelectItem key={classItem.id} value={classItem.id}>
                {classItem.code} - {classItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(classFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setClassFilter("all");
              setTypeFilter("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Render assignments by categories */}
      {(() => {
        const categories = categorizeAssignmentsByDueDate(filteredAndSortedAssignments);
        
        return (
          <div className="space-y-8">
            {/* Overdue - Collapsible */}
            {categories.overdue.length > 0 && (
              <Collapsible open={isOverdueOpen} onOpenChange={setIsOverdueOpen}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center space-x-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Overdue ({categories.overdue.length})</h2>
                    {isOverdueOpen ? (
                      <ChevronDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-4">
                    {categories.overdue.map((assignment) => renderAssignment(assignment))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Due Today */}
            {categories.dueToday.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <h2 className="text-xl font-semibold text-orange-600 dark:text-orange-400">Due Today ({categories.dueToday.length})</h2>
                </div>
                <div className="space-y-4">
                  {categories.dueToday.map((assignment) => renderAssignment(assignment))}
                </div>
              </div>
            )}

            {/* Due Tomorrow */}
            {categories.dueTomorrow.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">Due Tomorrow ({categories.dueTomorrow.length})</h2>
                </div>
                <div className="space-y-4">
                  {categories.dueTomorrow.map((assignment) => renderAssignment(assignment))}
                </div>
              </div>
            )}

            {/* Due This Week */}
            {categories.dueThisWeek.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Due This Week ({categories.dueThisWeek.length})</h2>
                </div>
                <div className="space-y-4">
                  {categories.dueThisWeek.map((assignment) => renderAssignment(assignment))}
                </div>
              </div>
            )}

            {/* Due Later */}
            {categories.dueLater.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400">Due Later ({categories.dueLater.length})</h2>
                </div>
                <div className="space-y-4">
                  {categories.dueLater.map((assignment) => renderAssignment(assignment))}
                </div>
              </div>
            )}

            {/* No assignments message */}
            {filteredAndSortedAssignments.length === 0 && (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">No pending assignments for {currentTerm.name}.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Dialogs */}
      {selectedAssignment && (
        <AssignmentDetailDialog
          open={showDetailDialog}
          onOpenChange={(open) => {
            setShowDetailDialog(open);
            if (!open) {
              setSelectedAssignmentId(null);
            }
          }}
          assignment={selectedAssignment}
        />
      )}

      {workAssignment && (
        <AssignmentWorkDialog
          open={showWorkDialog}
          onOpenChange={setShowWorkDialog}
          assignment={workAssignment}
        />
      )}

      {gradeAssignment && (
        <GradeInputDialog
          open={showGradeDialog}
          onOpenChange={setShowGradeDialog}
          assignment={gradeAssignment}
          onGradeAdded={() => setShowGradeDialog(false)}
        />
      )}
    </div>
  );
}
