"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthenticatedUserId } from "@/lib/user";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Doc, Id } from "@/convex/_generated/dataModel";

interface DashboardClassListProps {
  termId: Id<"terms">;
  onSelectClass?: (classId: string) => void;
}

export default function DashboardClassList({ termId, onSelectClass }: DashboardClassListProps) {
  const userId = useAuthenticatedUserId();
  const router = useRouter();
  
  const classes = useQuery(
    api.classes.getClassesByTerm,
    userId && termId ? { userId, termId } : "skip"
  );

  const assignments = useQuery(
    api.assignments.getAssignmentsByTerm,
    userId && termId ? { userId, termId } : "skip"
  );

  if (classes === undefined || assignments === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No classes found for this term.</p>
      </div>
    );
  }

  const calculateProgress = (classId: string) => {
    if (!assignments) return 0;
    
    const classAssignments = assignments.filter((a: Doc<"assignments">) => a.classId === classId);
    if (classAssignments.length === 0) return 0;
    
    const completedAssignments = classAssignments.filter((a: Doc<"assignments">) => a.completed);
    return Math.round((completedAssignments.length / classAssignments.length) * 100);
  };

  const calculateGrade = (classId: string) => {
    if (!assignments) return "N/A";
    
    const classAssignments = assignments.filter((a: Doc<"assignments">) => a.classId === classId);
    const gradedAssignments = classAssignments.filter((a: Doc<"assignments">) => a.grade !== undefined && a.grade !== null);
    
    if (gradedAssignments.length === 0) return "N/A";
    
    const totalPoints = gradedAssignments.reduce((sum: number, a: Doc<"assignments">) => sum + (a.maxPoints || 100), 0);
    const earnedPoints = gradedAssignments.reduce((sum: number, a: Doc<"assignments">) => sum + (a.grade || 0), 0);
    
    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    return `${percentage}%`;
  };

  const handleViewClass = (classItem: Doc<"classes">) => {
    if (onSelectClass) {
      onSelectClass(classItem._id);
    } else {
      // Use the class name for navigation since slug doesn't exist
      router.push(`/class/${classItem._id}`);
    }
  };

  return (
    <div className="space-y-3">
      {classes.map((classItem: Doc<"classes">) => {
        const progress = calculateProgress(classItem._id);
        const grade = calculateGrade(classItem._id);
        
        return (
          <div
            key={classItem._id}
            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-3">
              {/* Class name and ID on the same line */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{classItem.name}</h3>
                <p className="text-sm text-muted-foreground">{classItem.code}</p>
              </div>
              
              {/* Progress bar */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Progress:</span>
                <div className="flex-1 max-w-24">
                  <Progress value={progress} className="h-2" />
                </div>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              
              {/* Grade and View Class button underneath progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Grade:</span>
                  <span className="text-sm font-medium">{grade}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewClass(classItem)}
                >
                  View Class
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
