"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthenticatedUserId } from "@/lib/user";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { Loader2, Archive, ArrowUpFromLine } from "lucide-react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AllTermsClassListProps {
  onSelectClass?: (classId: string) => void;
  classes: Doc<"classes">[] | undefined;
  assignments: Doc<"assignments">[] | undefined;
  terms: Doc<"terms">[] | undefined;
}

export default function AllTermsClassList({ onSelectClass, classes, assignments, terms }: AllTermsClassListProps) {
  const userId = useAuthenticatedUserId();
  const router = useRouter();
  
  if (classes === undefined || assignments === undefined || terms === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No classes found across all terms.</p>
      </div>
    );
  }

  // Separate active and deleted classes
  const activeClasses = classes.filter(c => !c.isDeleted);
  const deletedClasses = classes.filter(c => c.isDeleted === true);

  const calculateProgress = (classId: Id<"classes">) => {
    if (!assignments) return 0;
    
    const classAssignments = assignments.filter((a) => a.classId === classId);
    if (classAssignments.length === 0) return 0;
    
    const completedAssignments = classAssignments.filter((a) => a.completed === true);
    return Math.round((completedAssignments.length / classAssignments.length) * 100);
  };

  const calculateGrade = (classId: Id<"classes">) => {
    if (!assignments) return "N/A";
    
    const classAssignments = assignments.filter((a) => a.classId === classId);
    const gradedAssignments = classAssignments.filter((a) => a.grade !== undefined && a.grade !== null);
    
    if (gradedAssignments.length === 0) return "N/A";
    
    const totalPoints = gradedAssignments.reduce((sum: number, a) => sum + (a.maxPoints || 100), 0);
    const earnedPoints = gradedAssignments.reduce((sum: number, a) => sum + (a.grade || 0), 0);
    
    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    return `${percentage}%`;
  };

  const handleViewClass = (classItem: Doc<"classes">) => {
    if (onSelectClass) {
      onSelectClass(classItem._id);
    } else {
      router.push(`/class/${classItem._id.toString()}`);
    }
  };

  const renderClassItem = (classItem: Doc<"classes"> & { termName?: string }, isDeleted: boolean) => {
    const progress = calculateProgress(classItem._id);
    const grade = calculateGrade(classItem._id);
    const termName = classItem.termName || "Unknown Term";
    
    return (
      <div
        key={classItem._id}
        className={cn(
          "flex items-center justify-between p-4 border rounded-lg transition-colors",
          isDeleted ? "bg-muted/30 hover:bg-muted/40" : "hover:bg-muted/50"
        )}
      >
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={cn("font-medium truncate", isDeleted && "text-muted-foreground")}>{classItem.name}</h3>
                {isDeleted && (
                  <Badge variant="outline" className="text-xs">Deleted</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{classItem.code}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">{termName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-sm text-muted-foreground">Progress:</span>
                <div className="w-20">
                  <Progress value={progress} className={cn("h-2", isDeleted && "opacity-70")} />
                </div>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Grade:</span>
                <span className="text-sm font-medium">{grade}</span>
              </div>
            </div>
          </div>
        </div>
        
        <Button
          variant={isDeleted ? "ghost" : "outline"}
          size="sm"
          onClick={() => handleViewClass(classItem)}
          className="ml-4"
        >
          View Class
        </Button>
      </div>
    );
  };

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <ArrowUpFromLine className="h-4 w-4" />
          Active Classes
          <Badge variant="secondary" className="ml-1">{activeClasses.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="deleted" className="flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Deleted Classes
          <Badge variant="secondary" className="ml-1">{deletedClasses.length}</Badge>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="active" className="space-y-3 mt-0">
        {activeClasses.length > 0 ? (
          activeClasses.map((classItem) => renderClassItem(classItem, false))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active classes found.</p>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="deleted" className="space-y-3 mt-0">
        {deletedClasses.length > 0 ? (
          deletedClasses.map((classItem) => renderClassItem(classItem, true))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No deleted classes found.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
