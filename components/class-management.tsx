import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Filter,
  Settings,
  Trash2,
  RotateCcw,
  Edit,
  BarChart3,
  Target,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { EditClassDialog } from "./edit-class-dialog";
import { DeleteClassDialog } from "./delete-class-dialog";
import { categorizeAssignmentType } from "@/lib/assignment-categorization";
import { generateClassPath } from "@/lib/url-utils";
import { useSettings } from "@/hooks/use-settings";

interface Term {
  id: string;
  name: string;
  isActive: boolean;
}

interface ClassManagementProps {
  terms: Term[];
  currentTerm: Term;
  onTermChange: (termId: string) => void;
  userId: string;
}

export function ClassManagement({
  terms,
  currentTerm,
  onTermChange,
  userId,
}: ClassManagementProps) {
  const [activeTab, setActiveTab] = useState("active");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { formatDate } = useSettings();

  // Query for active classes only
  const activeClasses = useQuery(api.classes.getActiveClasses, { userId });

  // Query for deleted classes - always load to get accurate counts
  const deletedClasses = useQuery(api.classes.getDeletedClasses, { userId });
  
  // Combined classes for selection purposes
  const allClasses = useMemo(() => [...(activeClasses || []), ...(deletedClasses || [])], 
    [activeClasses, deletedClasses]);

  // Force refresh when data changes by listening to the queries
  useEffect(() => {
    // This will cause a re-render when the queries return new data
    setRefreshKey(prev => prev + 1);
  }, [activeClasses, deletedClasses]);

  // Memoize filtered classes to prevent unnecessary re-renders
  const filteredActiveClasses = useMemo(() => {
    if (!activeClasses) return [];
    return activeClasses;
  }, [activeClasses]);

  const filteredDeletedClasses = useMemo(() => {
    if (!deletedClasses) return [];
    return deletedClasses;
  }, [deletedClasses]);

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const getTermName = useCallback(
    (termId: Id<"terms">) => {
      const term = terms.find((t) => t.id === termId);
      return term ? term.name : "Unknown Term";
    },
    [terms],
  );

  const getGradeColor = useCallback((grade: number) => {
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    return "text-red-600";
  }, []);

  // Memoized ClassCard component to prevent unnecessary re-renders
  const ClassCard = React.memo(
    ({
      classItem,
      isDeleted = false,
    }: {
      classItem: Doc<"classes">;
      isDeleted?: boolean;
    }) => {
      const term = terms.find((t) => t.id === classItem.termId);

      // Query assignments for this specific class to show grading breakdown
      const classAssignments = useQuery(
        api.assignments.getAssignmentsByClass,
        !isDeleted ? { userId, classId: classItem._id } : "skip",
      );

      // Function to count assignments per category
      const getAssignmentCountByCategory = (categoryName: string) => {
        if (!classAssignments) return 0;
        return classAssignments.filter((assignment) => {
          const standardizedType = categorizeAssignmentType(assignment.type);
          return (
            standardizedType === categoryName ||
            standardizedType
              .toLowerCase()
              .includes(categoryName.toLowerCase()) ||
            categoryName.toLowerCase().includes(standardizedType.toLowerCase())
          );
        }).length;
      };

      const handleViewAssignments = useCallback(() => {
        // Navigate to class assignments view with proper URL structure
        const term = terms.find(t => t.id === classItem.termId);
        if (term && currentTerm) {
          const classPath = generateClassPath(
            currentTerm.name,
            currentTerm.id as Id<"terms">,
            classItem.name,
            classItem._id
          );
          window.location.href = classPath;
        }
      }, [classItem.termId, classItem.name, classItem._id, terms, currentTerm]);

      return (
        <Card
          className={`hover:shadow-lg transition-shadow flex flex-col h-full ${isDeleted ? "opacity-75" : ""}`}
        >
          <CardHeader className="flex-shrink-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${classItem.color}`} />
                <div>
                  <CardTitle className="text-lg">{classItem.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="font-mono text-sm text-muted-foreground">
                      {classItem.code}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getTermName(classItem.termId)}
                    </Badge>
                    {isDeleted && (
                      <Badge variant="destructive" className="text-xs">
                        Deleted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!isDeleted ? (
                      <>
                        {/* Original Dialog */}
                        {/* <EditClassDialog classData={classItem}>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Class
                          </DropdownMenuItem>
                        </EditClassDialog> */}
                        
                        {/* New Controlled Dialog */}
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setSelectedClassId(classItem._id);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Class
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DeleteClassDialog classData={classItem} type="soft">
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Class
                          </DropdownMenuItem>
                        </DeleteClassDialog>
                      </>
                    ) : (
                      <>
                        <DeleteClassDialog classData={classItem} type="restore">
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore Class
                          </DropdownMenuItem>
                        </DeleteClassDialog>
                        <DropdownMenuSeparator />
                        <DeleteClassDialog
                          classData={classItem}
                          type="permanent"
                        >
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </DeleteClassDialog>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {classItem.currentGrade && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {term?.isActive ? "Current Grade" : "Final Grade"}
                  </span>
                  <span
                    className={`text-lg font-bold ${getGradeColor(classItem.currentGrade)}`}
                  >
                    {classItem.currentGrade.toFixed(1)}%
                  </span>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Professor:</span>
                  <span>{classItem.professor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credits:</span>
                  <span>{classItem.credits}</span>
                </div>
                {classItem.meetingTimes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule:</span>
                    <span>{classItem.meetingTimes}</span>
                  </div>
                )}
                {classItem.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{classItem.location}</span>
                  </div>
                )}
              </div>

              {/* Grading Breakdown */}
              {!isDeleted && classItem.gradingScheme.categories.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Grading Breakdown
                    </span>
                  </div>
                  <div className="space-y-2">
                    {classItem.gradingScheme.categories.map((category) => {
                      const actualCount = getAssignmentCountByCategory(
                        category.name,
                      );
                      const hasDropLowest =
                        category.dropLowest && category.dropLowest > 0;
                      return (
                        <div
                          key={category.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{category.name}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0"
                            >
                              {classItem.gradingScheme.mode === "points"
                                ? `${category.weight} pts`
                                : `${category.weight}%`}
                            </Badge>
                            {hasDropLowest && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1 py-0"
                                title={`Drops ${category.dropLowest} lowest grade${(category.dropLowest || 0) > 1 ? "s" : ""}`}
                              >
                                <Target className="h-2 w-2 mr-1" />-
                                {category.dropLowest}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <span
                              className={
                                actualCount === category.count
                                  ? "text-green-600"
                                  : actualCount < category.count
                                    ? "text-orange-600"
                                    : "text-blue-600"
                              }
                            >
                              {actualCount}
                            </span>
                            <span className="text-muted-foreground">
                              / {category.count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isDeleted && classItem.deletedAt && (
                <div className="text-xs text-muted-foreground">
                  Deleted on {formatDate(new Date(classItem.deletedAt))}
                </div>
              )}
            </div>

            {/* Spacer div to push assignment stats down */}
            <div className="mt-auto"></div>

            {/* Assignment Statistics - Right above button for consistent alignment */}
            {!isDeleted && (
              <div className="text-xs text-muted-foreground border-t pt-2 mt-4">
                {classAssignments ? (
                  <>Total assignments: {classAssignments.length} • Completed: {classAssignments.filter((a) => a.completed).length} • Graded: {classAssignments.filter((a) => a.grade !== undefined && a.grade !== null).length}</>
                ) : (
                  <>Total assignments: 0 • Completed: 0 • Graded: 0</>
                )}
              </div>
            )}

            {/* Button section - Always at bottom */}
            {!isDeleted && (
              <div className="pt-2">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleViewAssignments}
                >
                  View Assignments
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    },
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12">
      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No classes found</h3>
      <p className="text-muted-foreground text-center">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="active">
            Active Classes ({filteredActiveClasses.length})
          </TabsTrigger>
          <TabsTrigger value="deleted">
            Deleted Classes ({filteredDeletedClasses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {filteredActiveClasses.length === 0 ? (
            <EmptyState
              message="You haven't added any classes yet. Create your first class to get started."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActiveClasses.map((classItem) => (
                <ClassCard key={classItem._id} classItem={classItem} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deleted" className="space-y-6">
          {filteredDeletedClasses.length === 0 ? (
            <EmptyState
              message="No deleted classes found."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeletedClasses.map((classItem) => (
                <ClassCard
                  key={classItem._id}
                  classItem={classItem}
                  isDeleted={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Render the edit dialog with the selected class */}
      {(() => {
        const classData = selectedClassId 
          ? (allClasses.find(c => c._id === selectedClassId) ||
             activeClasses?.find(c => c._id === selectedClassId) ||
             deletedClasses?.find(c => c._id === selectedClassId))
          : (activeClasses?.[0] || deletedClasses?.[0]); // Use first available class for testing
        
        // Only render if we have valid class data
        if (!classData) return null;
        
        return (
          <EditClassDialog 
            open={showEditDialog}
            onOpenChange={(open) => {
              setShowEditDialog(open);
              if (!open) {
                setSelectedClassId(null); // Clear selection when dialog closes
              }
            }}
            classData={classData}
          />
        );
      })()}
    </div>
  );
}
