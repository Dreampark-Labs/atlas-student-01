"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  CheckSquare,
  BarChart3,
  Calendar,
  FileText,
  Plus,
  Calculator,
  PenTool,
  Upload,
  MessageSquare,
  GraduationCap,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  File,
  Search,
} from "lucide-react";
import { getCurrentUserId, useAuthenticatedUserId } from "@/lib/user";
import { useSettings } from "@/hooks/use-settings";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: string, data?: any) => void;
  currentTermId?: string;
  onSelectAssignment?: (assignmentId: string) => void;
  onSelectClass?: (classId: string) => void;
}

export function SearchCommand({
  open,
  onOpenChange,
  onNavigate,
  currentTermId,
  onSelectAssignment,
  onSelectClass,
}: SearchCommandProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const userId = useAuthenticatedUserId();
  const { formatDate, formatTime } = useSettings();

  // Load real data from Convex - only if user is authenticated
  // Skip term-specific queries when in All Terms mode
  const isAllTermsMode = currentTermId === "all-terms";
  const classes = useQuery(
    api.classes.getClassesByTerm,
    currentTermId && userId && !isAllTermsMode ? { userId, termId: currentTermId as Id<"terms"> } : "skip",
  );
  const assignments = useQuery(
    api.assignments.getAssignmentsByTerm,
    currentTermId && userId && !isAllTermsMode ? { userId, termId: currentTermId as Id<"terms"> } : "skip",
  );
  // Also load all assignments for comprehensive search
  const allAssignments = useQuery(
    api.assignments.getAllAssignments,
    userId ? { userId } : "skip"
  );
  // Load all classes when in All Terms mode
  const allClasses = useQuery(
    api.classes.getAllClasses,
    userId && isAllTermsMode ? { userId } : "skip"
  );
  const terms = useQuery(
    api.terms.getTerms,
    userId ? { userId } : "skip"
  );

  // Advanced search results using fuzzy matching and content indexing
  const searchResults = useMemo(() => {
    if (!searchTerm.trim())
      return { assignments: [], classes: [], content: [] };

    // Don't search until data is loaded
    if (!allAssignments) {
      console.log("🔄 allAssignments still loading, skipping search");
      return { assignments: [], classes: [], content: [] };
    }

    const term = searchTerm.toLowerCase().trim();
    console.log("=== SEARCH DEBUG ===");
    console.log("Search term:", term);
    console.log("allAssignments loaded:", !!allAssignments);
    console.log("Available allAssignments:", allAssignments?.length || 0);
    console.log(
      "Available current term assignments:",
      assignments?.length || 0,
    );
    console.log(
      "allAssignments data:",
      allAssignments?.map((a) => ({
        id: a._id,
        title: a.title,
        files: a.submissionFiles?.length || 0,
      })),
    );

    const results = {
      assignments: [] as any[],
      classes: [] as any[],
      content: [] as any[],
    };

    // Search assignments with detailed matching - use allAssignments for comprehensive search
    const searchAssignments = allAssignments || [];
    console.log(
      "Using allAssignments for search, count:",
      searchAssignments.length,
    );
    console.log(
      "Final searchAssignments content:",
      searchAssignments.map((a) => ({
        title: a.title,
        fileCount: a.submissionFiles?.length || 0,
        files: a.submissionFiles?.map((f) => f.name) || [],
      })),
    );

    if (searchAssignments.length > 0) {
      searchAssignments.forEach((assignment) => {
        const matches: string[] = [];
        let relevanceScore = 0;

        // Title matching (highest priority) - improved for partial matches
        const titleLower = assignment.title.toLowerCase();
        const titleWords = titleLower.split(/\s+/);
        const searchWords = term
          .split(/\s+/)
          .filter((word) => word.length >= 2);

        if (titleLower.includes(term)) {
          matches.push("title");
          relevanceScore += 100;
        } else if (searchWords.some((word) => titleLower.includes(word))) {
          matches.push("title");
          relevanceScore += 60; // Lower score for partial title matches
        }

        // Type matching
        if (assignment.type.toLowerCase().includes(term)) {
          matches.push("type");
          relevanceScore += 50;
        }

        // Description matching - improved for partial matches
        if (assignment.description) {
          const descriptionLower = assignment.description.toLowerCase();
          if (descriptionLower.includes(term)) {
            matches.push("description");
            relevanceScore += 30;
          }
        }

        // Instructions matching - improved for partial matches
        if (assignment.instructions) {
          const instructionsLower = assignment.instructions.toLowerCase();
          if (instructionsLower.includes(term)) {
            matches.push("instructions");
            relevanceScore += 30;
          }
        }

        // Rubric matching - improved for partial matches
        if (assignment.rubric) {
          const rubricLower = assignment.rubric.toLowerCase();
          if (rubricLower.includes(term)) {
            matches.push("rubric");
            relevanceScore += 25;
          }
        }

        // Notes matching - improved for partial matches
        if (assignment.notes) {
          const notesLower = assignment.notes.toLowerCase();
          if (notesLower.includes(term)) {
            matches.push("notes");
            relevanceScore += 20;
          }
        }

        // Submission text matching (written submissions) - improved for partial matches
        if (assignment.submissionText) {
          const submissionTextLower = assignment.submissionText.toLowerCase();
          // Split search term into individual words for better matching
          const searchWords = term
            .split(/\s+/)
            .filter((word) => word.length > 0);

          // Check if the full term appears anywhere in the text
          if (submissionTextLower.includes(term)) {
            matches.push("submission");
            relevanceScore += 35; // Higher score for submission content
            console.log(
              `✅ Submission text full match: "${term}" found in submission`,
            );
          }
          // Also check if all individual words appear (doesn't need to be together)
          else if (
            searchWords.length > 1 &&
            searchWords.every((word) => submissionTextLower.includes(word))
          ) {
            matches.push("submission");
            relevanceScore += 25; // Slightly lower score for word-based matches
            console.log(
              `✅ Submission text word match: all words from "${term}" found in submission`,
            );
          }
          // Check for any individual word match if it's significant enough
          else if (
            searchWords.some(
              (word) => word.length >= 3 && submissionTextLower.includes(word),
            )
          ) {
            matches.push("submission");
            relevanceScore += 15; // Lower score for partial word matches
            console.log(
              `✅ Submission text partial match: some words from "${term}" found in submission`,
            );
          }
        }

        // File name and extension matching with specific file tracking
        const matchingFiles: any[] = [];
        if (
          assignment.submissionFiles &&
          assignment.submissionFiles.length > 0
        ) {
          console.log(
            `Assignment "${assignment.title}" has ${assignment.submissionFiles.length} files:`,
            assignment.submissionFiles.map((f) => ({
              name: f.name,
              type: f.type,
            })),
          );
          assignment.submissionFiles.forEach((file, fileIndex) => {
            let fileMatched = false;
            console.log(
              `Checking file ${fileIndex + 1}: "${file.name}" (type: ${file.type}) against term "${term}"`,
            );

            // Match file name (case-insensitive, partial match)
            const fileName = file.name.toLowerCase();
            const searchParts = term
              .split(/[\s\-_\.]+/)
              .filter((part) => part.length >= 2);

            if (
              fileName.includes(term) ||
              searchParts.some((part) => fileName.includes(part))
            ) {
              console.log(
                `✅ File name match: "${file.name}" matches "${term}"`,
              );
              matchingFiles.push(file);
              fileMatched = true;
            } else {
              console.log(
                `❌ File name no match: "${file.name}" does not contain "${term}"`,
              );
            }

            // Match file extension without dot (e.g., "pdf", "docx", "xlsx")
            const extension = file.name.split(".").pop()?.toLowerCase();
            console.log(`File extension extracted: "${extension}"`);
            if (
              extension &&
              (extension.includes(term) || term.includes(extension))
            ) {
              console.log(
                `✅ File extension match: "${extension}" matches "${term}"`,
              );
              if (!fileMatched) {
                matchingFiles.push(file);
                fileMatched = true;
              }
            } else {
              console.log(
                `❌ File extension no match: "${extension}" does not match "${term}"`,
              );
            }

            if (fileMatched && !matches.includes("files")) {
              matches.push("files");
              relevanceScore += 40; // Higher score for file matches to keep them visible
              console.log(
                `✅ Added "files" to matches for assignment "${assignment.title}"`,
              );
            }
          });

          console.log(
            `Assignment "${assignment.title}" - matching files count: ${matchingFiles.length}`,
          );
        } else {
          console.log(
            `Assignment "${assignment.title}" has no submission files`,
          );
        }

        // Class name matching
        if (assignment.className.toLowerCase().includes(term)) {
          matches.push("class");
          relevanceScore += 10;
        }

        // Include assignment if we have any matches OR matching files
        if (matches.length > 0 || matchingFiles.length > 0) {
          // If we only have file matches but no other matches, ensure we add the "files" match
          if (
            matches.length === 0 &&
            matchingFiles.length > 0 &&
            !matches.includes("files")
          ) {
            matches.push("files");
            relevanceScore += 40; // High score for file-only matches
          }

          // Give extra boost to assignments with matching files to keep them visible
          if (matchingFiles.length > 0) {
            relevanceScore += 20; // Additional boost for having matching files
          }

          console.log(
            `Including assignment "${assignment.title}" with ${matches.length} matches and ${matchingFiles.length} matching files (score: ${relevanceScore})`,
          );
          results.assignments.push({
            ...assignment,
            matches,
            relevanceScore,
            matchingFiles, // Include matching files for enhanced display
          });
        } else {
          console.log(
            `Excluding assignment "${assignment.title}" - no matches found`,
          );
        }
      });

      // Sort by relevance score
      results.assignments.sort((a, b) => b.relevanceScore - a.relevanceScore);
      console.log(
        `Found ${results.assignments.length} matching assignments for term "${term}"`,
      );
    }

    // Search classes - use allClasses in All Terms mode, otherwise use term-specific classes
    const classesToSearch = isAllTermsMode ? allClasses : classes;
    if (classesToSearch) {
      classesToSearch.forEach((cls) => {
        const matches: string[] = [];
        let relevanceScore = 0;

        if (cls.name.toLowerCase().includes(term)) {
          matches.push("name");
          relevanceScore += 100;
        }

        if (cls.code.toLowerCase().includes(term)) {
          matches.push("code");
          relevanceScore += 80;
        }

        if (cls.professor.toLowerCase().includes(term)) {
          matches.push("professor");
          relevanceScore += 60;
        }

        if (cls.description?.toLowerCase().includes(term)) {
          matches.push("description");
          relevanceScore += 30;
        }

        if (cls.location?.toLowerCase().includes(term)) {
          matches.push("location");
          relevanceScore += 20;
        }

        if (matches.length > 0) {
          results.classes.push({
            ...cls,
            matches,
            relevanceScore,
          });
        }
      });

      results.classes.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return results;
  }, [searchTerm, assignments, allAssignments, classes, allClasses, isAllTermsMode]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Get current term data for badge counts
  const currentTerm =
    currentTermId && terms ? terms.find((t) => t._id === currentTermId) : null;

  const handleSelect = (callback: () => void) => {
    callback();
    onOpenChange(false);
    setSearchTerm("");
  };

  const handleSelectWithoutClear = (callback: () => void) => {
    callback();
    // Don't close the main search or clear the term when opening expanded search
  };

  const getAssignmentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "homework":
        return <PenTool className="h-4 w-4" />;
      case "quiz":
        return <FileText className="h-4 w-4" />;
      case "essay":
        return <FileText className="h-4 w-4" />;
      case "lab report":
        return <FileText className="h-4 w-4" />;
      case "exam":
        return <GraduationCap className="h-4 w-4" />;
      case "project":
        return <Star className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getMatchIcon = (match: string) => {
    switch (match) {
      case "title":
        return <FileText className="h-3 w-3" />;
      case "type":
        return <Star className="h-3 w-3" />;
      case "description":
      case "instructions":
      case "rubric":
        return <MessageSquare className="h-3 w-3" />;
      case "notes":
        return <PenTool className="h-3 w-3" />;
      case "submission":
        return <Upload className="h-3 w-3" />;
      case "files":
        return <File className="h-3 w-3" />;
      case "class":
        return <BookOpen className="h-3 w-3" />;
      case "professor":
        return <GraduationCap className="h-3 w-3" />;
      case "name":
      case "code":
        return <BookOpen className="h-3 w-3" />;
      case "location":
        return <Calendar className="h-3 w-3" />;
      default:
        return <Search className="h-3 w-3" />;
    }
  };

  const getMatchText = (match: string) => {
    switch (match) {
      case "title":
        return "Title";
      case "type":
        return "Type";
      case "description":
        return "Description";
      case "instructions":
        return "Instructions";
      case "rubric":
        return "Rubric";
      case "notes":
        return "Notes";
      case "submission":
        return "Submission";
      case "files":
        return "Files";
      case "class":
        return "Class";
      case "professor":
        return "Professor";
      case "name":
        return "Name";
      case "code":
        return "Code";
      case "location":
        return "Location";
      default:
        return "Match";
    }
  };

  const getAssignmentStatusInfo = (assignment: any) => {
    const now = new Date();
    const dueDate = new Date(
      `${assignment.dueDate}T${assignment.dueTime || "23:59"}`,
    );
    const isOverdue = now > dueDate && !assignment.completed;
    const hasGrade =
      assignment.grade !== undefined && assignment.grade !== null;
    const hasSubmission =
      assignment.submissionText ||
      (assignment.submissionFiles && assignment.submissionFiles.length > 0);

    return {
      isOverdue,
      hasGrade,
      hasSubmission,
      dueDate,
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getFileTypeIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FileText className="h-3 w-3 text-red-600" />;
      case "doc":
      case "docx":
        return <FileText className="h-3 w-3 text-blue-600" />;
      case "xls":
      case "xlsx":
        return <FileText className="h-3 w-3 text-green-600" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileText className="h-3 w-3 text-purple-600" />;
      case "txt":
        return <FileText className="h-3 w-3 text-gray-600" />;
      case "zip":
      case "rar":
        return <FileText className="h-3 w-3 text-yellow-600" />;
      default:
        return <File className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput
          placeholder="Search assignments, files, submissions, grades, classes..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {!searchTerm.trim() && (
            <>
              {/* Navigation */}
              <CommandGroup heading="Navigation">
                <CommandItem
                  onSelect={() => handleSelect(() => onNavigate("dashboard"))}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => handleSelect(() => onNavigate("todo"))}
                >
                  <div className="flex items-center w-full">
                    <CheckSquare className="mr-2 h-4 w-4" />
                    <span>To-Do List</span>
                    <Badge variant="secondary" className="ml-auto">
                      {currentTerm?.stats?.pendingTasks || 0}
                    </Badge>
                  </div>
                </CommandItem>
                <CommandItem
                  onSelect={() => handleSelect(() => onNavigate("classes"))}
                >
                  <div className="flex items-center w-full">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>My Classes</span>
                    <Badge variant="secondary" className="ml-auto">
                      {currentTerm?.stats?.classes || 0}
                    </Badge>
                  </div>
                </CommandItem>
                <CommandItem
                  onSelect={() => handleSelect(() => onNavigate("grades"))}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Grade Tracker</span>
                </CommandItem>
              </CommandGroup>

              {/* Quick Actions */}
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => handleSelect(() => {})}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add Assignment</span>
                </CommandItem>
                <CommandItem onSelect={() => handleSelect(() => {})}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add Class</span>
                </CommandItem>
                <CommandItem onSelect={() => handleSelect(() => {})}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add Grade</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {/* Search Results - Assignments */}
          {searchResults.assignments.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup
                heading={`Assignments (${searchResults.assignments.length})`}
              >
                {searchResults.assignments.slice(0, 8).map((assignment) => {
                  const statusInfo = getAssignmentStatusInfo(assignment);
                  return (
                    <CommandItem
                      key={assignment._id}
                      onSelect={() =>
                        handleSelect(() => {
                          if (onSelectAssignment) {
                            onSelectAssignment(assignment._id);
                          } else {
                            onNavigate("todo", {
                              assignmentId: assignment._id,
                            });
                          }
                        })
                      }
                    >
                      {getAssignmentIcon(assignment.type)}
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {assignment.title}
                          </span>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {/* Completion status - clickable */}
                            {assignment.completed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectAssignment) {
                                    onSelectAssignment(assignment._id);
                                  } else {
                                    onNavigate("todo", {
                                      assignmentId: assignment._id,
                                    });
                                  }
                                }}
                                className="flex items-center text-green-600 hover:text-green-700 transition-colors"
                                title="Assignment completed - click to view details"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}

                            {/* Grade display - show percentage */}
                            {statusInfo.hasGrade && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSelectAssignment) {
                                    onSelectAssignment(assignment._id);
                                  } else {
                                    onNavigate("todo", {
                                      assignmentId: assignment._id,
                                    });
                                  }
                                }}
                                className="text-yellow-600 hover:text-yellow-700 text-xs font-medium transition-colors"
                                title="Click to view grade details"
                              >
                                {assignment.maxPoints
                                  ? `${Math.round((assignment.grade / assignment.maxPoints) * 100)}%`
                                  : `${assignment.grade}%`}
                              </button>
                            )}

                            {/* File upload status - clickable to view files */}
                            {statusInfo.hasSubmission &&
                              assignment.submissionFiles &&
                              assignment.submissionFiles.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // If only one file, open it directly
                                    if (
                                      assignment.submissionFiles.length === 1 &&
                                      assignment.submissionFiles[0]?.url
                                    ) {
                                      window.open(
                                        assignment.submissionFiles[0].url,
                                        "_blank",
                                      );
                                    } else {
                                      // Multiple files - open assignment details to show all files
                                      if (onSelectAssignment) {
                                        onSelectAssignment(assignment._id);
                                      } else {
                                        onNavigate("todo", {
                                          assignmentId: assignment._id,
                                        });
                                      }
                                    }
                                  }}
                                  className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                                  title={
                                    assignment.submissionFiles.length === 1
                                      ? `Click to open ${assignment.submissionFiles[0].name}`
                                      : `${assignment.submissionFiles.length} files - click to view all`
                                  }
                                >
                                  <File className="h-4 w-4" />
                                  <span className="ml-1 text-xs">
                                    {assignment.submissionFiles.length}
                                  </span>
                                </button>
                              )}

                            {/* Overdue indicator */}
                            {statusInfo.isOverdue && (
                              <div
                                className="text-red-500"
                                title="Assignment is overdue"
                              >
                                <XCircle className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <span className="px-2 py-0.5 bg-muted rounded text-xs mr-2">
                            {assignment.className}
                          </span>
                          <Calendar className="mr-1 h-3 w-3" />
                          <span className="mr-2">
                            {formatDate(statusInfo.dueDate)}{" "}
                            {formatTime(statusInfo.dueDate)}
                          </span>
                        </div>

                        {/* Match indicators - exclude basic ones like title/type */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {assignment.matches
                            .filter(
                              (match: string) =>
                                !["title", "type"].includes(match),
                            )
                            .slice(0, 3)
                            .map((match: string, index: number) => (
                              <div
                                key={index}
                                className="flex items-center text-xs text-muted-foreground bg-muted/50 px-1 py-0.5 rounded"
                              >
                                {getMatchIcon(match)}
                                <span className="ml-1">
                                  {getMatchText(match)}
                                </span>
                              </div>
                            ))}
                          {assignment.matches.filter(
                            (match: string) =>
                              !["title", "type"].includes(match),
                          ).length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +
                              {assignment.matches.filter(
                                (match: string) =>
                                  !["title", "type"].includes(match),
                              ).length - 3}{" "}
                              more
                            </span>
                          )}
                        </div>

                        {/* Show specific matching files */}
                        {assignment.matchingFiles &&
                          assignment.matchingFiles.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                Matching files:
                              </span>
                              {assignment.matchingFiles
                                .slice(0, 2)
                                .map((file: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (file.url) {
                                          window.open(file.url, "_blank");
                                        }
                                      }}
                                      className="flex items-center text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                      title={`Click to open ${file.name} in new tab`}
                                    >
                                      {getFileTypeIcon(file.name)}
                                      <span className="truncate max-w-24 ml-1">
                                        {file.name}
                                      </span>
                                    </button>
                                  </div>
                                ))}
                              {assignment.matchingFiles.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{assignment.matchingFiles.length - 2} more
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </CommandItem>
                  );
                })}
                {searchResults.assignments.length > 8 && (
                  <CommandItem
                    onSelect={() =>
                      handleSelectWithoutClear(() => {
                        // Navigate to search results or handle in-app
                        onNavigate("search", { query: searchTerm });
                      })
                    }
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <span>
                      View all {searchResults.assignments.length} assignment
                      results
                    </span>
                  </CommandItem>
                )}
              </CommandGroup>
            </>
          )}

          {/* Search Results - Classes */}
          {searchResults.classes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup
                heading={`Classes (${searchResults.classes.length})`}
              >
                {searchResults.classes.map((cls) => (
                  <CommandItem
                    key={cls._id}
                    onSelect={() =>
                      handleSelect(() => {
                        if (onSelectClass) {
                          onSelectClass(cls._id);
                        } else {
                          onNavigate("classes", { classId: cls._id });
                        }
                      })
                    }
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{cls.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {cls.code}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <GraduationCap className="mr-1 h-3 w-3" />
                        <span className="mr-2">{cls.professor}</span>
                        {cls.location && (
                          <>
                            <Calendar className="mr-1 h-3 w-3" />
                            <span>{cls.location}</span>
                          </>
                        )}
                      </div>
                      {/* Match indicators */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {cls.matches.map((match: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-center text-xs text-muted-foreground bg-muted/50 px-1 py-0.5 rounded"
                          >
                            {getMatchIcon(match)}
                            <span className="ml-1">{getMatchText(match)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
