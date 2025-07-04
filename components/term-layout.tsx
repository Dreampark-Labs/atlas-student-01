"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth, SignOutButton } from "@clerk/nextjs";
import { useAuthenticatedUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import { generateTermPath, isAllTermsId, createAllTermsSlug } from "@/lib/url-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Id, Doc } from "@/convex/_generated/dataModel";
import {
  BookOpen,
  CheckSquare,
  BarChart3,
  Plus,
  Search,
  ChevronDown,
  SettingsIcon,
  User,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TermSelector } from "@/components/term-selector";
import { SearchCommand } from "@/components/search-command";
import { AddClassDialog } from "@/components/add-class-dialog";
import { AddAssignmentsDialog } from "@/components/add-assignments-dialog";

// This type allows for both Convex IDs and string IDs (for All Terms)
type TermId = Id<"terms"> | string;

interface TermStats {
  pendingTasks: number;
  classes: number;
  gpa: number;
  completed: number;
}

// Define a proper interface for our term objects
interface TermData {
  _id: TermId;
  id?: TermId; // Some components expect 'id' instead of '_id'
  name: string;
  year: number;
  season: string;
  isActive: boolean;
  stats: TermStats;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface TermLayoutProps {
  children: React.ReactNode;
  currentTerm: TermData;
  activeView: string;
  pageTitle: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function TermLayout({ children, currentTerm, activeView, pageTitle, breadcrumbs }: TermLayoutProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const userId = useAuthenticatedUserId();
  
  const [showSearch, setShowSearch] = useState(false);
  const [showTermSelector, setShowTermSelector] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddAssignments, setShowAddAssignments] = useState(false);

  // Get user's terms
  const terms = useQuery(
    api.terms.getTerms, 
    (isLoaded && isSignedIn && userId) ? { userId } : "skip"
  );

  // Get classes and assignments for badges
  const classes = useQuery(
    api.classes.getClassesByTerm,
    (isLoaded && isSignedIn && userId && currentTerm && !isAllTermsId(currentTerm._id)) 
      ? { userId, termId: currentTerm._id as any } 
      : "skip"
  );
  
  const assignments = useQuery(
    api.assignments.getAssignmentsByTerm,
    (isLoaded && isSignedIn && userId && currentTerm && !isAllTermsId(currentTerm._id)) 
      ? { userId, termId: currentTerm._id as any } 
      : "skip"
  );
  
  // For All Terms view, we need to get all classes and assignments
  const allClasses = useQuery(
    api.classes.getAllClasses,
    (isLoaded && isSignedIn && userId && currentTerm && isAllTermsId(currentTerm._id)) 
      ? { userId } 
      : "skip"
  );
  
  const allAssignments = useQuery(
    api.assignments.getAllAssignments,
    (isLoaded && isSignedIn && userId && currentTerm && isAllTermsId(currentTerm._id)) 
      ? { userId } 
      : "skip"
  );

  const setActiveTerm = useMutation(api.terms.setActiveTerm);

  const handleTermChange = async (termId: string) => {
    console.log("handleTermChange called with termId:", termId);
    
    // Get the current path to determine if we're in class-management view
    const currentPath = window.location.pathname;
    const isClassManagementView = currentPath.includes('class-management');
    
    if (termId === "all-terms") {
      try {
        // Handle "All Terms" selection - generate proper URL with unique slug
        const allTermsSlug = createAllTermsSlug(userId || "");
        console.log("Generated All Terms slug:", allTermsSlug);
        
        // Construct the target path
        const targetPath = isClassManagementView 
          ? `/term/${allTermsSlug}/class-management` 
          : `/term/${allTermsSlug}`;
        
        console.log("Navigating to All Terms path:", targetPath);
        
        // Use replace instead of push to avoid back-button issues
        window.location.href = targetPath;
      } catch (error) {
        console.error("Error navigating to All Terms:", error);
      }
    } else if (userId) {
      // Handle regular term selection
      try {
        // Convert the string ID to a proper Convex ID
        const convexId = termId as any; // Convert to Id<"terms"> type that Convex expects
        await setActiveTerm({ userId, termId: convexId });
        
        const selectedTerm = terms?.find(t => t._id === termId);
        if (selectedTerm) {
          // Generate the path for the selected term
          const termPath = `/term/${selectedTerm.name.toLowerCase().replace(/\s+/g, '-')}-${termId.slice(-8)}`;
          
          // Construct the target path
          const targetPath = isClassManagementView 
            ? `${termPath}/class-management` 
            : termPath;
          
          console.log("Navigating to term path:", targetPath);
          
          // Use replace instead of push to avoid back-button issues
          window.location.href = targetPath;
        }
      } catch (error) {
        console.error("Error changing term:", error);
      }
    }
  };

  const handleNavigateToView = (view: string) => {
    if (!currentTerm) return;

    const termPath = generateTermPath(currentTerm.name, currentTerm._id);
    
    switch (view) {
      case "dashboard":
        router.push(termPath);
        break;
      case "todo":
        router.push(`${termPath}/todo`);
        break;
      case "classes":
        router.push(`${termPath}/classes`);
        break;
      case "grade-tracker":
        router.push(`${termPath}/grade-tracker`);
        break;
      case "submitted-work":
        router.push(`${termPath}/submitted-work`);
        break;
      case "class-management":
        router.push(`${termPath}/class-management`);
        break;
      case "assignment-management":
        router.push(`${termPath}/assignment-management`);
        break;
      case "settings":
        router.push(`/settings`);
        break;
      case "profile":
        router.push(`/settings/profile`);
        break;
      default:
        break;
    }
  };

  const handleNavigate = (view: string, data?: any) => {
    if (view === "assignment-detail" && data?.assignmentId) {
      const termPath = generateTermPath(currentTerm.name, currentTerm._id);
      router.push(`${termPath}/assignment-management?highlight=${data.assignmentId}`);
    } else if (view === "class-detail" && data?.classId) {
      const classData = classes?.find(c => c._id === data.classId);
      if (classData) {
        const termPath = generateTermPath(currentTerm.name, currentTerm._id);
        router.push(`${termPath}/class/${classData.name.toLowerCase().replace(/\s+/g, '-')}-${classData._id.slice(-8)}`);
      }
    }
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: BarChart3,
      id: "dashboard",
    },
    {
      title: "To-Do List",
      icon: CheckSquare,
      id: "todo",
      badge: assignments ? assignments.filter(a => !a.completed && !a.isDeleted).length : 0
    },
    {
      title: "My Classes",
      icon: BookOpen,
      id: "classes",
      badge: classes ? classes.length : 0
    },
    {
      title: "Grade Tracker",
      icon: BarChart3,
      id: "grade-tracker",
    },
    {
      title: "Submitted Work",
      icon: FileText,
      id: "submitted-work",
      badge: assignments ? assignments.filter(a => a.completed && !a.isDeleted).length : 0
    },
    {
      title: "My Classes",
      icon: BookOpen,
      id: "class-management",
    },
    {
      title: "All Assignments",
      icon: CheckSquare,
      id: "assignment-management",
    },
  ];

  const quickActionItems = [
    {
      title: "Add Class",
      icon: Plus,
      id: "add-class",
      action: () => setShowAddClass(true),
      description: "Create a new class"
    },
    {
      title: "Add Assignments",
      icon: Plus,
      id: "add-assignments",
      action: () => setShowAddAssignments(true),
      description: "Create new assignments"
    },
  ];

  // Convert Convex terms to the expected format for TermSelector
  // Convert terms to the expected format for TermSelector
  const convertedTerms = terms?.map(term => ({
    id: term._id,
    _id: term._id,
    name: term.name,
    year: term.year,
    season: term.season,
    isActive: term.isActive,
    stats: term.stats
  })) || [];
  
  // Convert current term to expected format for dialogs
  const termForDialogs = {
    id: currentTerm._id as string,
    name: currentTerm.name,
    year: currentTerm.year,
    season: currentTerm.season,
    isActive: currentTerm.isActive,
    stats: currentTerm.stats,
    _id: currentTerm._id as string
  };

  // No need to convert the current term - use it directly

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <button
                  onClick={() => setShowTermSelector(true)}
                  className="flex w-full"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-sidebar-primary-foreground">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Atlas Student</span>
                    <span className="truncate text-xs">
                      {currentTerm.name}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {/* Search Command at the top */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => setShowSearch(true)}
                      className="flex w-full items-center justify-between"
                    >
                      <div className="flex items-center">
                        <Search className="mr-2 h-4 w-4" />
                        <span>Search...</span>
                      </div>
                      <kbd className="text-xs bg-muted px-2 py-1 rounded">⌘K</kbd>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={activeView === item.id}>
                      <button
                        onClick={() => handleNavigateToView(item.id)}
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
          <SidebarGroup>
            <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {quickActionItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={item.action}
                        className="flex w-full items-center"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <User className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          Student
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          Academic Tracker
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={() => handleNavigateToView("profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigateToView("settings")}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <SignOutButton>
                      <button className="flex w-full items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </SignOutButton>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermSelector(true);
                    }}
                    className="cursor-pointer hover:text-foreground"
                  >
                    {currentTerm.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs && breadcrumbs.length > 0 ? (
                  // Custom breadcrumbs for complex pages like class assignments
                  breadcrumbs.map((breadcrumb, index) => (
                    <div key={index} className="flex items-center">
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {breadcrumb.href || breadcrumb.onClick ? (
                          <BreadcrumbLink
                            href={breadcrumb.href || "#"}
                            onClick={breadcrumb.onClick ? (e) => {
                              e.preventDefault();
                              breadcrumb.onClick?.();
                            } : undefined}
                            className="cursor-pointer hover:text-foreground"
                          >
                            {breadcrumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>
                            {breadcrumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))
                ) : (
                  // Default breadcrumb for simple pages
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {pageTitle}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>

      {/* Dialogs */}
      {terms && (
        <TermSelector
          open={showTermSelector}
          onOpenChange={setShowTermSelector}
          terms={convertedTerms}
          currentTerm={currentTerm}
          onTermChange={handleTermChange}
          onCreateTerm={async () => {}} // Not used in this context
        />
      )}

      <SearchCommand
        open={showSearch}
        onOpenChange={setShowSearch}
        onNavigate={handleNavigate}
        currentTermId={currentTerm._id}
        onSelectAssignment={(id) => {
          const termPath = generateTermPath(currentTerm.name, currentTerm._id);
          router.push(`${termPath}/assignment-management?highlight=${id}`);
        }}
        onSelectClass={(id) => {
          const classData = classes?.find(c => c._id === id);
          if (classData) {
            const termPath = generateTermPath(currentTerm.name, currentTerm._id);
            router.push(`${termPath}/class/${classData.name.toLowerCase().replace(/\s+/g, '-')}-${classData._id.slice(-8)}`);
          }
        }}
      />

      {currentTerm && (
        <AddClassDialog
          open={showAddClass}
          onOpenChange={setShowAddClass}
          currentTerm={termForDialogs}
          terms={convertedTerms}
        />
      )}

      {currentTerm && (
        <AddAssignmentsDialog
          open={showAddAssignments}
          onOpenChange={setShowAddAssignments}
          currentTerm={currentTerm as Doc<"terms">}
          userId={userId || ""}
          terms={convertedTerms}
          classes={classes || []}
        />
      )}
    </SidebarProvider>
  );
}
