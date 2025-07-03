"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Upload,
  FileText,
  Image,
  Save,
  Trash2,
  Download,
  Eye,
  Edit3,
  FileIcon,
  CheckCircle2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { getCurrentUserId } from "@/lib/user";
import {
  categorizeAssignmentType,
  findMatchingGradingCategory,
} from "@/lib/assignment-categorization";
import { useConvexFileUpload } from "@/hooks/use-convex-file-upload";
import { toast } from "sonner";

// Type definition for submission files
interface SubmissionFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: number;
  fileId?: string; // Convex storage ID for secure file access
}
import { ConvexHttpClient } from "convex/browser";

interface AssignmentDetailDialogProps {
  assignment: Doc<"assignments"> | null;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface SubmissionFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: number;
  fileId?: string; // New field for Convex file storage ID
}

export function AssignmentDetailDialog({
  assignment,
  children,
  open: controlledOpen,
  onOpenChange,
}: AssignmentDetailDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // New state for upload progress
  const [progress, setProgress] = useState(0); // New state for upload progress percentage
  const { formatDate, formatTime, formatDateTime } = useSettings();
  const userId = getCurrentUserId();

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  // Initialize form state with defaults, will be updated when assignment is available
  const [title, setTitle] = useState(assignment?.title || "");
  const [description, setDescription] = useState(assignment?.description || "");
  const [instructions, setInstructions] = useState(
    assignment?.instructions || "",
  );
  const [rubric, setRubric] = useState(assignment?.rubric || "");
  const [dueDate, setDueDate] = useState(assignment?.dueDate || "");
  const [dueTime, setDueTime] = useState(assignment?.dueTime || "");
  const [priority, setPriority] = useState(assignment?.priority || "medium");
  const [category, setCategory] = useState(assignment?.type || "");
  const [completed, setCompleted] = useState(assignment?.completed || false);
  const [grade, setGrade] = useState(assignment?.grade?.toString() || "");
  const [maxPoints, setMaxPoints] = useState(
    assignment?.maxPoints?.toString() || "",
  );
  const [notes, setNotes] = useState(assignment?.notes || "");
  const [estimatedTime, setEstimatedTime] = useState(
    assignment?.estimatedTime || "",
  );

  // Submission state
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<SubmissionFile[]>([]);

  const updateAssignment = useMutation(api.assignments.updateAssignment);
  const softDeleteAssignment = useMutation(
    api.assignments.softDeleteAssignment,
  );
  const submitAssignment = useMutation(api.assignments.submitAssignment);
  const { toast } = useToast();
  
  // Add a state for file URL loading
  const [loadingFileUrl, setLoadingFileUrl] = useState<string | null>(null);

  // Initialize file upload hook
  const { uploadMultipleFiles } = useConvexFileUpload();

  // Get class data to show available categories - always call the hook consistently
  const classData = useQuery(
    api.classes.getClass,
    assignment?.classId ? { classId: assignment.classId, userId } : "skip",
  );

  // Reset form when assignment changes (including when assignment data is updated)
  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title);
      setDescription(assignment.description || "");
      setInstructions(assignment.instructions || "");
      setRubric(assignment.rubric || "");
      setDueDate(formatDateForInput(assignment.dueDate));
      setDueTime(formatTimeForInput(assignment.dueTime));
      setPriority(assignment.priority);
      setCategory(assignment.type);
      setCompleted(assignment.completed);
      setGrade(assignment.grade?.toString() || "");
      setMaxPoints(assignment.maxPoints?.toString() || "");
      setNotes(assignment.notes || "");
      setEstimatedTime(assignment.estimatedTime || "");

      // Load existing submission data
      setSubmissionText(assignment.submissionText || "");
      setUploadedFiles(assignment.submissionFiles || []);
      setSubmissionFiles([]);
    }
  }, [assignment, assignment?.updatedAt]); // Also react to updatedAt changes

  // Auto-save assignment type when it changes during editing
  useEffect(() => {
    if (assignment && isEditing && category !== assignment.type) {
      const timeoutId = setTimeout(async () => {
        try {
          const assignmentType = getAssignmentType(category);
          await updateAssignment({
            assignmentId: assignment._id,
            updates: {
              type: assignmentType,
            },
            userId,
          });
        } catch (error) {
          console.error("Error auto-saving assignment type:", error);
        }
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [category, assignment, isEditing, updateAssignment, userId]);

  const getDaysUntilDue = (dueDate: string) => {
    // Get today's date at midnight (normalize time to 00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse due date (handle both YYYY-MM-DD and legacy MM/DD/YYYY formats)
    let due: Date;
    if (dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // New ISO format
      due = new Date(dueDate + "T00:00:00");
    } else {
      // Legacy format or other format
      due = new Date(dueDate);
    }
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to determine the correct assignment type
  // If the type exactly matches a grading category, use it as-is
  // Otherwise, use the standardized categorization
  const getAssignmentType = (inputType: string) => {
    if (!classData?.gradingScheme?.categories) {
      return categorizeAssignmentType(inputType);
    }

    // Check if the input type exactly matches any grading category
    const exactMatch = classData.gradingScheme.categories.find(
      (cat) => cat.name.toLowerCase() === inputType.toLowerCase(),
    );

    if (exactMatch) {
      return exactMatch.name; // Use the exact category name
    }

    // Otherwise, use standardized categorization
    return categorizeAssignmentType(inputType);
  };

  // Helper function to convert date string to HTML date input format (YYYY-MM-DD)
  const formatDateForInput = (dateStr: string) => {
    try {
      if (!dateStr) return "";

      // If already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }

      // Parse various date formats (including legacy MM/DD/YYYY) and convert to YYYY-MM-DD
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date for input:", error);
      return "";
    }
  };

  // Helper function to convert time string to HTML time input format (HH:MM)
  const formatTimeForInput = (timeStr: string) => {
    try {
      if (!timeStr) return "";

      // If already in HH:MM 24-hour format, return as-is
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
      }

      // Parse 12-hour format like "11:59 PM" to "23:59" (for legacy data)
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      if (!timeMatch) return "";

      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const ampm = timeMatch[3]?.toUpperCase();

      // Convert to 24-hour format
      if (ampm === "PM" && hours !== 12) {
        hours += 12;
      } else if (ampm === "AM" && hours === 12) {
        hours = 0;
      }

      return `${String(hours).padStart(2, "0")}:${minutes}`;
    } catch (error) {
      console.error("Error formatting time for input:", error);
      return "";
    }
  };

  // Helper function to convert HTML date input format (YYYY-MM-DD) to storage format (also YYYY-MM-DD)
  const formatDateForStorage = (htmlDateStr: string) => {
    try {
      if (!htmlDateStr) return "";

      // HTML date inputs always return YYYY-MM-DD format, which is what we want for storage
      if (/^\d{4}-\d{2}-\d{2}$/.test(htmlDateStr)) {
        return htmlDateStr;
      }

      // If somehow we get a different format, parse and convert to YYYY-MM-DD
      const date = new Date(htmlDateStr);
      if (isNaN(date.getTime())) {
        return htmlDateStr;
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date for storage:", error);
      return htmlDateStr;
    }
  };

  // Helper function to convert HTML time input format (HH:MM) to storage format (also HH:MM 24-hour)
  const formatTimeForStorage = (htmlTimeStr: string) => {
    try {
      if (!htmlTimeStr) return "";

      // HTML time inputs always return HH:MM in 24-hour format, which is what we want for storage
      if (/^\d{2}:\d{2}$/.test(htmlTimeStr)) {
        return htmlTimeStr;
      }

      // If somehow we get a different format, parse and convert to HH:MM 24-hour
      const timeMatch = htmlTimeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      if (!timeMatch) return htmlTimeStr;

      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const ampm = timeMatch[3]?.toUpperCase();

      // Convert to 24-hour format if needed
      if (ampm === "PM" && hours !== 12) {
        hours += 12;
      } else if (ampm === "AM" && hours === 12) {
        hours = 0;
      }

      return `${String(hours).padStart(2, "0")}:${minutes}`;
    } catch (error) {
      console.error("Error formatting time for storage:", error);
      return htmlTimeStr;
    }
  };

  // Helper function to create a Date object from date and time strings
  const createDateTime = (dateStr: string, timeStr: string) => {
    try {
      if (!dateStr || !timeStr) return new Date();

      // Handle both new ISO format (YYYY-MM-DD) and legacy format (MM/DD/YYYY)
      let isoDateStr = dateStr;
      if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Convert legacy format to ISO format
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        isoDateStr = `${year}-${month}-${day}`;
      }

      // Handle both new 24-hour format (HH:MM) and legacy 12-hour format
      let isoTimeStr = timeStr;
      if (!timeStr.match(/^\d{2}:\d{2}$/)) {
        // Convert legacy 12-hour format to 24-hour format
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2];
          const ampm = timeMatch[3]?.toUpperCase();

          if (ampm === "PM" && hours !== 12) {
            hours += 12;
          } else if (ampm === "AM" && hours === 12) {
            hours = 0;
          }

          isoTimeStr = `${String(hours).padStart(2, "0")}:${minutes}`;
        }
      }

      // Create ISO datetime string: YYYY-MM-DDTHH:MM
      const isoString = `${isoDateStr}T${isoTimeStr}:00`;
      return new Date(isoString);
    } catch (error) {
      console.error("Error creating date/time:", error);
      return new Date();
    }
  };

  // Calculate derived values safely
  const currentDueDate = assignment
    ? isEditing
      ? formatDateForStorage(dueDate)
      : assignment.dueDate
    : "";
  const currentDueTime = assignment
    ? isEditing
      ? formatTimeForStorage(dueTime)
      : assignment.dueTime
    : "";
  const daysUntil = currentDueDate ? getDaysUntilDue(currentDueDate) : 0;
  const isOverdue = currentDueDate ? daysUntil < 0 && !completed : false;

  const handleSave = async () => {
    if (!assignment) return;

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setLoading(true);
    try {
      // Use the correct assignment type (preserve exact matches with grading categories)
      const assignmentType = getAssignmentType(category);

      // Convert dates for storage
      const convertedDueDate = formatDateForStorage(dueDate);
      const convertedDueTime = formatTimeForStorage(dueTime);

      const updateData = {
        title,
        type: assignmentType,
        description: description || undefined,
        instructions: instructions || undefined,
        rubric: rubric || undefined,
        dueDate: convertedDueDate,
        dueTime: convertedDueTime,
        priority: priority as "low" | "medium" | "high",
        completed,
        grade: grade ? parseFloat(grade) : undefined,
        maxPoints: maxPoints ? parseFloat(maxPoints) : undefined,
        notes: notes || undefined,
        estimatedTime: estimatedTime || undefined,
      };

      const result = await updateAssignment({
        assignmentId: assignment._id,
        updates: updateData,
        userId,
      });

      toast({
        title: "Assignment Updated",
        description: "Your changes have been saved successfully.",
      });

      setIsEditing(false);

      // The parent component's Convex query should automatically update
      // with the new data due to Convex's reactivity system.
      // The useEffect hook will sync the form state with the new assignment data.
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      // Add new files to existing ones
      const newFiles = Array.from(e.target.files);
      
      // Check for duplicate files in both selected files and uploaded files
      const existingFileNames = [
        ...submissionFiles.map(f => f.name),
        ...uploadedFiles.map(f => f.name)
      ];
      
      const filteredNewFiles = newFiles.filter(file => !existingFileNames.includes(file.name));
      
      if (filteredNewFiles.length < newFiles.length) {
        toast({
          title: "Duplicate files",
          description: "Some files were skipped because they were already selected.",
          variant: "destructive",
        });
      }
      
      // Append new files
      setSubmissionFiles(prev => [...prev, ...filteredNewFiles]);
      
      // Reset the input so the same file can be selected again if needed
      e.target.value = '';
    }
  };
  
  const removeFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Mark assignment as not completed if all files are removed
    if (uploadedFiles.length <= 1 && !submissionText.trim()) {
      setCompleted(false);
    }
  };

  const handleSubmissionUpload = async () => {
    if (!assignment) return;

    if (!submissionText.trim() && submissionFiles.length === 0 && uploadedFiles.length === 0) {
      toast({
        title: "No Submission",
        description: "Please add either text or files to submit.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setIsUploading(true); // Start upload progress
    setProgress(0); // Reset progress

    try {
      // Keep existing uploaded files
      let fileList: SubmissionFile[] = [...uploadedFiles];

      // Upload new files if any
      if (submissionFiles.length > 0) {
        try {
          // Use Convex for file storage
          const uploadResults = await uploadMultipleFiles(
            submissionFiles,
            userId,
            assignment._id
          );

          // Map the results to our SubmissionFile format
          const newFiles = uploadResults.map(result => ({
            name: result.fileName,
            size: result.fileSize,
            type: result.fileType,
            fileId: result.fileId, // Store the Convex file ID (for local tracking)
            uploadedAt: Date.now(),
          }));
          
          // Add new files to existing files
          fileList = [...fileList, ...newFiles];
          console.log("Files uploaded successfully:", fileList);
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Upload Failed",
            description: "Failed to upload files. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          setIsUploading(false);
          return;
        }
      }

      // Submit the assignment with updated files and text
      // Keep fileId in submissionFiles for secure file access
      const result = await submitAssignment({
        assignmentId: assignment._id,
        userId,
        submissionText: submissionText || undefined,
        submissionFiles: fileList.length > 0 ? fileList : undefined,
      });

      // Update the UI to reflect changes
      setSubmissionFiles([]);
      setUploadedFiles(fileList);
      setCompleted(true);

      toast({
        title: "Submission Uploaded",
        description: "Your assignment submission has been saved successfully.",
      });
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to submit assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsUploading(false); // End upload progress
      setProgress(0); // Reset progress
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDelete = async () => {
    if (!assignment) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${assignment.title}"? This action can be undone later.`,
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await softDeleteAssignment({
        userId: assignment.userId,
        assignmentId: assignment._id,
      });

      toast({
        title: "Assignment Deleted",
        description: "The assignment has been moved to trash.",
      });

      setOpen(false);
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to delete assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle viewing a file
  const handleViewFile = async (file: SubmissionFile) => {
    try {
      setLoadingFileUrl(file.name);
      
      // If it's a file stored in Convex storage with fileId
      if (file.fileId) {
        try {
          // Use the Convex HTTP action to get the file URL
          const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site') || 'https://avid-cow-972.convex.site';
          const httpActionUrl = `${convexSiteUrl}/get-file-url`;
          
          const response = await fetch(httpActionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storageId: file.fileId,
              userId: userId,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const fileUrl = data.url;
            
            if (fileUrl) {
              // Try to open file in a new window
              const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
              
              if (!newWindow) {
                // If popup is blocked, create a clickable link
                const link = document.createElement('a');
                link.href = fileUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.click();
                
                toast({
                  title: "File Opening",
                  description: "If the file didn't open, please check your popup blocker settings.",
                });
              }
            } else {
              throw new Error("No URL returned from HTTP action");
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
        } catch (fetchError) {
          console.error("Error calling HTTP action:", fetchError);
          toast({
            title: "Access Denied",
            description: "You don't have permission to view this file, or it no longer exists.",
            variant: "destructive",
          });
        }
      } 
      // If it's a file with a direct URL (legacy or external files)
      else if (file.url) {
        const fileUrl = file.url.startsWith('http') ? file.url : `${window.location.origin}${file.url}`;
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast({
          title: "File Preview",
          description: "File preview is not available. Please download the file to view it.",
        });
      }
    } catch (error) {
      console.error("Error viewing file:", error);
      toast({
        title: "Error",
        description: "Unable to view this file. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingFileUrl(null);
    }
  };

  // Function to handle downloading a file
  const handleDownloadFile = async (file: SubmissionFile) => {
    try {
      setLoadingFileUrl(file.name);
      
      // If it's a file stored in Convex storage with fileId
      if (file.fileId) {
        try {
          // Use the Convex HTTP action to get the file URL
          const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site') || 'https://avid-cow-972.convex.site';
          const httpActionUrl = `${convexSiteUrl}/get-file-url`;
          
          const response = await fetch(httpActionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storageId: file.fileId,
              userId: userId,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const fileUrl = data.url;
            
            if (fileUrl) {
              // Force download by fetching the file and creating a blob
              try {
                const response = await fetch(fileUrl);
                if (!response.ok) {
                  throw new Error(`Failed to fetch file: ${response.status}`);
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                
                // Create a download link that forces download
                const link = document.createElement('a');
                link.href = url;
                link.download = file.name;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the object URL
                window.URL.revokeObjectURL(url);
                
                toast({
                  title: "Download Started",
                  description: `Downloading ${file.name}...`,
                });
              } catch (downloadError) {
                console.error("Error downloading file:", downloadError);
                // Fallback to opening in new tab if download fails
                const link = document.createElement('a');
                link.href = fileUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.click();
                
                toast({
                  title: "Download Failed",
                  description: "Opening file in new tab instead.",
                });
              }
            } else {
              throw new Error("No URL returned from HTTP action");
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
        } catch (fetchError) {
          console.error("Error calling HTTP action for download:", fetchError);
          toast({
            title: "Access Denied",
            description: "You don't have permission to download this file, or it no longer exists.",
            variant: "destructive",
          });
        }
      } 
      // If it's a file with a direct URL (legacy or external files)
      else if (file.url) {
        const fileUrl = file.url.startsWith('http') ? file.url : `${window.location.origin}${file.url}`;
        
        try {
          // Force download by fetching the file and creating a blob
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          // Create a download link that forces download
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the object URL
          window.URL.revokeObjectURL(url);
          
          toast({
            title: "Download Started",
            description: `Downloading ${file.name}...`,
          });
        } catch (downloadError) {
          console.error("Error downloading file:", downloadError);
          // Fallback to simple link if fetch fails
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = file.name;
          link.target = '_blank';
          link.click();
          
          toast({
            title: "Download Started",
            description: `Downloading ${file.name}...`,
          });
        }
      } else {
        toast({
          title: "Download Error",
          description: "This file cannot be downloaded. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Unable to download this file. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingFileUrl(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {children || (
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] pr-2">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: assignment?.classColor || "#3b82f6",
                  }}
                />
                <span>{assignment?.title || "Loading..."}</span>
                {assignment?.className && (
                  <Badge variant="outline" className="text-xs">
                    {assignment.className}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={!assignment}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel Edit" : "Edit"}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {!assignment ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                Loading assignment details...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Assignment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Assignment Details
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={completed}
                          onCheckedChange={setCompleted}
                          disabled={!isEditing}
                        />
                        <Label>Completed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="priority">Priority:</Label>
                        <Select
                          value={priority}
                          onValueChange={setPriority}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="category">Category:</Label>
                        <Select
                          value={category}
                          onValueChange={setCategory}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {classData?.gradingScheme.categories.map((cat) => (
                              <SelectItem key={cat.name} value={cat.name}>
                                {cat.name} ({cat.weight}%)
                              </SelectItem>
                            ))}
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueTime">Due Time</Label>
                        <Input
                          id="dueTime"
                          type="time"
                          value={dueTime}
                          onChange={(e) => setDueTime(e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!isEditing}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="estimatedTime">Estimated Time</Label>
                        <Input
                          id="estimatedTime"
                          value={estimatedTime}
                          onChange={(e) => setEstimatedTime(e.target.value)}
                          placeholder="e.g., 2 hours"
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade">Grade</Label>
                        <Input
                          id="grade"
                          type="number"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          placeholder="0-100"
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxPoints">Max Points</Label>
                        <Input
                          id="maxPoints"
                          type="number"
                          value={maxPoints}
                          onChange={(e) => setMaxPoints(e.target.value)}
                          placeholder="100"
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submission Section */}
                {!completed && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Submit Assignment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="submissionText">Submission Text</Label>
                        <Textarea
                          id="submissionText"
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder="Enter your assignment submission here..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-4">
                        {/* File upload section */}
                        <div className="space-y-2">
                          <Label htmlFor="submissionFiles">Upload Files</Label>
                          <Input
                            id="submissionFiles"
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            disabled={isUploading || loading}
                          />
                          
                          {/* Upload progress indicator */}
                          {isUploading && (
                            <div className="w-full space-y-2">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-muted-foreground text-right">{progress}% uploaded</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Display selected files in a more user-friendly way */}
                        {submissionFiles.length > 0 && (
                          <div className="mt-3">
                            <h4 className="font-medium text-sm mb-2">Files to Upload:</h4>
                            <div className="space-y-2">
                              {submissionFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">{file.name}</p>
                                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Display uploaded files */}
                        {uploadedFiles.length > 0 && (
                          <div className="mt-3">
                            <h4 className="font-medium text-sm mb-2">Submitted Files:</h4>
                            <div className="space-y-2">
                              {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <FileIcon className="h-5 w-5 text-primary" />
                                    <div>
                                      <p className="text-sm font-medium">{file.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(file.size)} • Uploaded {formatDate(new Date(file.uploadedAt))}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {(file.url || file.fileId) && (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleViewFile(file)}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDownloadFile(file)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                    {!completed && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeUploadedFile(index)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {!completed && (
                        <Button
                          onClick={handleSubmissionUpload}
                          disabled={loading || (!submissionText.trim() && submissionFiles.length === 0 && uploadedFiles.length === 0)}
                          className="w-full"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Submit Assignment
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Existing Submission Display */}
                {completed &&
                  (assignment.submissionText ||
                    assignment.submissionFiles?.length) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <CheckCircle2 className="h-5 w-5 mr-2 text-primary" />
                          Submitted Work
                        </CardTitle>
                        {assignment.submittedAt && (
                          <p className="text-sm text-muted-foreground">
                            Submitted on{" "}
                            {formatDateTime(new Date(assignment.submittedAt))}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {assignment.submissionText && (
                          <div className="space-y-2">
                            <Label>Submission Text</Label>
                            <div className="p-4 bg-muted/50 rounded-md">
                              <p className="text-sm whitespace-pre-wrap">
                                {assignment.submissionText}
                              </p>
                            </div>
                          </div>
                        )}

                        {assignment.submissionFiles &&
                          assignment.submissionFiles.length > 0 && (
                            <div className="space-y-2">
                              <Label>Submitted Files</Label>
                              <div className="space-y-2">
                                {assignment.submissionFiles.map(
                                  (file, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <FileIcon className="h-5 w-5 text-primary" />
                                        <div>
                                          <p className="text-sm font-medium">{file.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatFileSize(file.size)} • Uploaded {formatDate(new Date(file.uploadedAt))}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleViewFile(file)}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDownloadFile(file)}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Allow resubmission */}
                          <Button
                            variant="outline"
                            onClick={() => setCompleted(false)}
                            className="w-full"
                          >
                            Edit Submission
                          </Button>
                      </CardContent>
                    </Card>
                  )}

                {/* Notes Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add personal notes about this assignment..."
                      disabled={!isEditing}
                      rows={4}
                    />
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <div>
                    {isEditing && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      {isEditing ? "Cancel" : "Close"}
                    </Button>
                    {isEditing && (
                      <Button onClick={handleSave} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Due Date Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Due Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {isEditing
                            ? formatDate(
                                createDateTime(dueDate, dueTime || "23:59"),
                              )
                            : formatDate(
                                createDateTime(
                                  assignment.dueDate,
                                  assignment.dueTime || "23:59",
                                ),
                              )}
                        </span>
                      </div>
                      <div className="text-sm">
                        at{" "}
                        {isEditing
                          ? formatTime(
                              createDateTime(dueDate, dueTime || "23:59"),
                            )
                          : formatTime(
                              createDateTime(
                                assignment.dueDate,
                                assignment.dueTime || "23:59",
                              ),
                            )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {daysUntil === 0 && "Due today"}
                        {daysUntil === 1 && "Due tomorrow"}
                        {daysUntil > 1 && `Due in ${daysUntil} days`}
                        {daysUntil < 0 &&
                          `Overdue by ${Math.abs(daysUntil)} days`}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Badge
                        variant={completed ? "default" : "secondary"}
                        className="w-fit"
                      >
                        {completed ? "Completed" : "Pending"}
                      </Badge>
                      <Badge
                        variant={
                          priority === "high"
                            ? "destructive"
                            : priority === "medium"
                              ? "default"
                              : "secondary"
                        }
                        className="w-fit"
                      >
                        {priority} priority
                      </Badge>
                      {(isEditing
                        ? grade && maxPoints
                        : assignment.grade !== undefined &&
                          assignment.maxPoints) && (
                        <div className="text-sm">
                          <div className="font-medium">
                            Grade: {isEditing ? grade : assignment.grade}/
                            {isEditing ? maxPoints : assignment.maxPoints}
                          </div>
                          <div className="text-muted-foreground">
                            {isEditing
                              ? grade &&
                                maxPoints &&
                                parseFloat(grade) >= 0 &&
                                parseFloat(maxPoints) > 0
                                ? (
                                    (parseFloat(grade) /
                                      parseFloat(maxPoints)) *
                                    100
                                  ).toFixed(1) + "%"
                                : "Enter grade and max points"
                              : (
                                  assignment.grade !== undefined &&
                                  assignment.maxPoints
                                    ? ((assignment.grade / assignment.maxPoints) * 100).toFixed(1) + "%"
                                    : "N/A"
                                )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* File Attachments */}
                {uploadedFiles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Submitted Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm truncate">
                                {file.name}
                              </span>
                            </div>
                            {(file.url || file.fileId) && (
                              <div className="flex items-center space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewFile(file)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDownloadFile(file)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
