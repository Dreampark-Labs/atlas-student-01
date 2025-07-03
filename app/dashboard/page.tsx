"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuth, useUser, RedirectToSignIn, SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  BookOpen,
  CheckSquare,
  BarChart3,
  Plus,
  Search,
  ChevronDown,
  SettingsIcon,
  User,
  Loader2,
  FileText,
  Upload,
} from "lucide-react";
import ClassList from "@/components/class-list";
import DashboardClassList from "@/components/dashboard-class-list";
import { ClassManagement } from "@/components/class-management";
import { GradeTracker } from "@/components/grade-tracker";
import { SubmittedAssignments } from "@/components/submitted-assignments";
import { TodoList } from "@/components/todo-list";
import { AddClassDialog } from "@/components/add-class-dialog";
import { AddAssignmentDialog } from "@/components/add-assignment-dialog";
import { AddAssignmentsDialog } from "@/components/add-assignments-dialog";
import { BulkAssignmentUpload } from "@/components/bulk-assignment-upload";
import { GradeImportDialog } from "@/components/grade-import-dialog";
import { SearchCommand } from "@/components/search-command";
import { TermSelector } from "@/components/term-selector";
import { createAllTermsSlug, generateAllTermsId } from "@/lib/url-utils";
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
import { Profile } from "@/components/profile";
import { AssignmentManagement } from "@/components/assignment-management";
import { OnboardingTour } from "@/components/onboarding-tour";
import { ErrorBoundary } from "@/components/error-boundary";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getCurrentUserId, useAuthenticatedUserId } from "@/lib/user";
import { generateTermPath, generateClassPath } from "@/lib/url-utils";
import type { Term } from "@/types/academic";
import { useSettings } from "@/hooks/use-settings";

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const userId = useAuthenticatedUserId();

  // Check if we're in All Terms mode (either via search param or pathname)
  const isAllTermsView = searchParams.get("view") === "all-terms" ||
    (pathname && pathname.includes("/term/all-terms-"));

  const [activeView, setActiveView] = useState("dashboard");
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddAssignments, setShowAddAssignments] = useState(false);
  const [showGradeImport, setShowGradeImport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showTermSelector, setShowTermSelector] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Get URL parameters for highlighting and search
  const highlightAssignmentId = searchParams.get("highlight");
  const searchTermParam = searchParams.get("search");
  const openDialogParam = searchParams.get("openDialog") === "true";
  const urlTermId = searchParams.get("termId");
  const urlActiveView = searchParams.get("activeView");

  // Set initial active view from URL parameter
  useEffect(() => {
    if (urlActiveView) {
      setActiveView(urlActiveView);
    }
  }, [urlActiveView]);

  // For classes, the highlight parameter could be either an assignment or class ID
  const highlightClassId = activeView === "classes" ? highlightAssignmentId : undefined;
  const [selectedTermId, setSelectedTermId] = useState<Id<"terms"> | null>(null);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // User creation mutation
  const ensureUserExists = useMutation(api.users.ensureUserExists);

  // Convex mutations - always declare at top
  const markOnboardingComplete = useMutation(api.users.markOnboardingComplete);
  const createFirstTerm = useMutation(api.terms.createFirstTerm);
  const setActiveTerm = useMutation(api.terms.setActiveTerm);
  const createTerm = useMutation(api.terms.createTerm);
  const updateAssignment = useMutation(api.assignments.updateAssignment);

  // Convex queries - always call hooks, but skip if user not authenticated
  const onboardingStatus = useQuery(
    api.users.getUserOnboardingStatus, 
    (isLoaded && isSignedIn && userId) ? { userId } : "skip"
  );
  const terms = useQuery(
    api.terms.getTerms, 
    (isLoaded && isSignedIn && userId) ? { userId } : "skip"
  );
  const deletedTerms = useQuery(
    api.terms.getDeletedTerms, 
    (isLoaded && isSignedIn && userId) ? { userId } : "skip"
  );
  const activeTerm = useQuery(
    api.terms.getActiveTerm, 
    (isLoaded && isSignedIn && userId) ? { userId } : "skip"
  );
  const classes = useQuery(
    api.classes.getClassesByTerm,
    (isLoaded && isSignedIn && userId && selectedTermId) 
      ? { userId, termId: selectedTermId } 
      : "skip"
  );
  const assignments = useQuery(
    api.assignments.getAssignmentsByTerm,
    (isLoaded && isSignedIn && userId && selectedTermId) 
      ? { userId, termId: selectedTermId } 
      : "skip"
  );

  // Initialize user in database
  useEffect(() => {
    const initializeUser = async () => {
      if (isLoaded && isSignedIn && user && userId) {
        try {
          console.log("Dashboard: Initializing user in database...");
          await ensureUserExists({
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            firstName: user.firstName || "Student",
            lastName: user.lastName || ""
          });
          console.log("Dashboard: User initialization successful");
        } catch (error) {
          console.error("Dashboard: Failed to initialize user:", error);
          // Don't fail silently - the app can still work if user already exists
        } finally {
          setIsInitializing(false);
        }
      } else if (isLoaded && !isSignedIn) {
        console.log("Dashboard: User not signed in");
        setIsInitializing(false);
      }
    };

    initializeUser();
  }, [isLoaded, isSignedIn, user, userId, ensureUserExists]);

  // Handle case where selected term is deleted
  useEffect(() => {
    if (selectedTermId && terms) {
      const selectedTermExists = terms.find((term) => term._id === selectedTermId);
      if (!selectedTermExists) {
        console.log("Selected term was deleted, resetting to active term");
        setSelectedTermId(activeTerm?._id || null);
      }
    }
  }, [selectedTermId, terms, activeTerm]);

  // Auto-select active term when it loads
  useEffect(() => {
    if (activeTerm && !selectedTermId) {
      setSelectedTermId(activeTerm._id);
    }
  }, [activeTerm, selectedTermId]);

  // Handle term from URL (only if it belongs to the authenticated user)
  useEffect(() => {
    // Check if we're on a term-specific URL and need to redirect
    const currentPath = window.location.pathname;
    
    if (urlTermId && terms && terms.length > 0 && userId) {
      // Verify the term belongs to the current user before allowing access
      const matchingTerm = terms.find(t => t._id === urlTermId && t.userId === userId);
      
      if (matchingTerm && matchingTerm._id !== selectedTermId) {
        setSelectedTermId(matchingTerm._id);
        // Set as active term to ensure proper authorization
        setActiveTerm({ userId, termId: matchingTerm._id });
      } else if (!matchingTerm && urlTermId) {
        // If term doesn't belong to user, redirect to dashboard without term param
        router.replace('/dashboard');
      }
    } else if (activeTerm && currentPath === '/dashboard' && !urlTermId) {
      // Only redirect from old dashboard to new term-based URL if we're specifically on /dashboard
      // and there's no term ID in URL (to prevent redirect loops)
      const termPath = generateTermPath(activeTerm.name, activeTerm._id);
      router.replace(termPath);
    }
  }, [urlTermId, terms, selectedTermId, userId, setActiveTerm, router, activeTerm]);

  // Open search dialog with search term from URL
  useEffect(() => {
    if (searchTermParam && openDialogParam) {
      setShowSearch(true);
    }
  }, [searchTermParam, openDialogParam]);

  // Handle onboarding
  useEffect(() => {
    if (onboardingStatus && onboardingStatus.hasCompletedOnboarding === false) {
      setShowOnboarding(true);
    }
    
    // Check for simulation flag in development
    if (typeof window !== 'undefined') {
      const simulateNewUser = localStorage.getItem('simulate-new-user');
      if (simulateNewUser === 'true') {
        setShowOnboarding(true);
      }
    }
  }, [onboardingStatus]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Redirect to sign-in if not authenticated
  if (isLoaded && !isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Show loading state while checking auth or initializing user
  if (!isLoaded || userId === undefined || isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">
            {!isLoaded ? "Loading..." : isInitializing ? "Setting up your account..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // If user is not signed in, redirect
  if (userId === null) {
    return <RedirectToSignIn />;
  }

  const handleCompleteOnboarding = async () => {
    try {
      // Clear simulation flag if it exists
      if (typeof window !== 'undefined') {
        localStorage.removeItem('simulate-new-user');
      }
      
      await markOnboardingComplete({ userId });
      setShowOnboarding(false);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      // Even if marking complete fails, clear simulation and hide onboarding
      if (typeof window !== 'undefined') {
        localStorage.removeItem('simulate-new-user');
      }
      setShowOnboarding(false);
    }
  };

  const handleCreateFirstTerm = async (termData: {
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      const termId = await createFirstTerm({
        userId,
        ...termData,
      });
      if (termId) {
        setSelectedTermId(termId);
      }
    } catch (error) {
      console.error("Failed to create first term:", error);
    }
  };

  const handleCreateTerm = async (termData: {
    name: string;
    year: number;
    season: string;
  }) => {
    try {
      const termId = await createTerm({
        userId,
        name: termData.name,
        year: termData.year,
        season: termData.season,
      });
      if (termId) {
        setSelectedTermId(termId);
      }
    } catch (error) {
      console.error("Failed to create term:", error);
    }
  };

  const handleTermChange = async (termId: Id<"terms"> | string) => {
    if (termId === "all-terms") {
      // Handle "All Terms" selection - generate proper URL with unique slug
      const allTermsSlug = createAllTermsSlug(userId);
      router.push(`/term/${allTermsSlug}`, { scroll: false });
    } else {
      setSelectedTermId(termId as Id<"terms">);
      await setActiveTerm({ userId, termId: termId as Id<"terms"> });
      
      // Update URL with proper term slug
      const selectedTerm = terms?.find(t => t._id === termId);
      if (selectedTerm) {
        const termPath = generateTermPath(selectedTerm.name, termId as Id<"terms">);
        router.push(termPath, { scroll: false });
      }
    }
  };

  const handleNavigate = (view: string, data?: any) => {
    const currentTerm = activeTerm;
    if (!currentTerm) return;

    if (view === "assignment-detail" && data?.assignmentId) {
      setActiveView("assignment-management");
      const termPath = generateTermPath(currentTerm.name, currentTerm._id, "assignments");
      router.push(`${termPath}?highlight=${data.assignmentId}`, { scroll: false });
    } else if (view === "class-detail" && data?.classId) {
      const classData = classes?.find(c => c._id === data.classId);
      if (classData) {
        const classPath = generateClassPath(currentTerm.name, currentTerm._id, classData.name, classData._id);
        router.push(classPath, { scroll: false });
      }
    } else {
      // Don't set active view for navigation - let the target page handle its own state
    }
  };

  // Helper functions to transform Convex data to Term type
  const convertConvexTermToTerm = (convexTerm: typeof activeTerm): any => {
    if (!convexTerm) return null;
    return {
      id: convexTerm._id,
      _id: convexTerm._id,
      name: convexTerm.name,
      year: convexTerm.year,
      season: convexTerm.season,
      isActive: convexTerm.isActive,
      stats: convexTerm.stats
    };
  };

  const convertConvexTermsToTerms = (convexTerms: typeof terms): any[] => {
    if (!convexTerms) return [];
    return convexTerms.map(term => ({
      id: term._id,
      _id: term._id,
      name: term.name,
      year: term.year,
      season: term.season,
      isActive: term.isActive,
      stats: term.stats
    }));
  };

  const isFirstTime = !terms || terms.length === 0;

  // Loading state - but allow onboarding to show for new users
  if (
    onboardingStatus === undefined ||
    terms === undefined ||
    (activeTerm === undefined && terms.length > 0) // Only require activeTerm if user has terms
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // First time experience
  if (isFirstTime) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome to Atlas Student! 🎓
            </CardTitle>
            <CardDescription className="text-lg mt-4">
              Your complete academic progress tracker. Ready to get started?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setShowOnboarding(true)}
                size="lg"
                className="flex-1"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Start Tour
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="flex-1"
                onClick={async () => {
                  try {
                    // Mark onboarding as complete and create a default first term
                    await markOnboardingComplete({ userId });
                    const currentDate = new Date();
                    const termEndDate = new Date(currentDate);
                    termEndDate.setMonth(termEndDate.getMonth() + 4); // 4 months from now
                    
                    const termId = await createFirstTerm({
                      userId,
                      // Uncomment the following lines if your mutation definition supports them:
                      // name: "Current Term",
                      // startDate: currentDate.toISOString().split('T')[0],
                      // endDate: termEndDate.toISOString().split('T')[0],
                    });
            
                    if (termId) {
                      setSelectedTermId(termId);
                    }
                  } catch (error) {
                    console.error("Failed to skip onboarding:", error);
                  }
                }}
              >
                Skip Tour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      title: "All Classes",
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

  const handleNavigateToView = (view: string, data?: any) => {
    const currentTerm = activeTerm;
    if (!currentTerm) return;

    // Generate URL based on view
    const termPath = generateTermPath(currentTerm.name, currentTerm._id);
    
    switch (view) {
      case "dashboard":
        router.push(termPath, { scroll: false });
        break;
      case "todo":
        router.push(`${termPath}/todo`, { scroll: false });
        break;
      case "classes":
        router.push(`${termPath}/classes`, { scroll: false });
        break;
      case "grade-tracker":
        router.push(`${termPath}/grade-tracker`, { scroll: false });
        break;
      case "submitted-work":
        router.push(`${termPath}/submitted-work`, { scroll: false });
        break;
      case "class-management":
        router.push(`${termPath}/class-management`, { scroll: false });
        break;
      case "assignment-management":
        router.push(`${termPath}/assignment-management`, { scroll: false });
        break;
      case "settings":
        router.push(`/settings`, { scroll: false });
        break;
      case "profile":
        router.push(`/settings/profile`, { scroll: false });
        break;
      default:
        // Don't set active view for navigation - let the target page handle its own state
        break;
    }
  };

  const getActiveViewTitle = () => {
    switch (activeView) {
      case "dashboard":
        return "Dashboard";
      case "todo":
        return "To-Do List";
      case "classes":
        return "My Classes";
      case "grade-tracker":
        return "Grade Tracker";
      case "submitted-work":
        return "Submitted Work";
      case "assignment-management":
        return "All Assignments";
      case "class-management":
        return "All Classes";
      case "profile":
        return "Profile";
      default:
        return "Dashboard";
    }
  };

  return (
    <ErrorBoundary>
      <SidebarProvider>
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
                        {isAllTermsView ? "All Terms" : (activeTerm ? activeTerm.name : "No Term Selected")}
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
                            {user?.firstName && user?.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user?.firstName || "Student"
                            }
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
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">{getActiveViewTitle()}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {isAllTermsView
                        ? "All Terms"
                        : selectedTermId && activeTerm
                          ? activeTerm.name
                          : "No Term Selected"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {/* Main Content */}
            {activeView === "dashboard" && (
              <div className="space-y-6">
                {/* Welcome Banner */}
                {(activeTerm || isAllTermsView) && (
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-6 w-6 text-primary" />
                          <span>
                            Welcome to {isAllTermsView
                              ? "All Terms Dashboard"
                              : `${activeTerm?.name} Dashboard`} 🎓
                          </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setShowTermSelector(true)}>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          {isAllTermsView ? "Switch View" : "Manage Terms"}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground">
                          {isAllTermsView
                            ? "View all your classes, assignments, and grades across all terms"
                            : "Track your academic progress and stay on top of deadlines"}
                        </p>
                        {!isAllTermsView && activeTerm && (
                          <Badge variant={activeTerm.isActive ? "default" : "secondary"}>
                            {activeTerm.isActive ? "Active Term" : "Past Term"}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions - Only show on dashboard view */}
                {activeView === "dashboard" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Button
                          onClick={() => setShowAddClass(true)}
                          className="h-auto p-4 flex-col items-start space-y-2"
                          variant="outline"
                        >
                          <Plus className="h-6 w-6" />
                          <div className="text-left w-full">
                            <div className="font-medium">Add Class</div>
                            <div className="text-sm text-muted-foreground text-wrap">
                              Create a new class for this term
                            </div>
                          </div>
                        </Button>
                        <Button
                          onClick={() => setShowAddAssignments(true)}
                          className="h-auto p-4 flex-col items-start space-y-2"
                          variant="outline"
                        >
                          <Plus className="h-6 w-6" />
                          <div className="text-left w-full">
                            <div className="font-medium">Add Assignments</div>
                            <div className="text-sm text-muted-foreground text-wrap">
                              Create new assignments
                            </div>
                          </div>
                        </Button>
                        <Button
                          onClick={() => handleNavigateToView("grade-tracker")}
                          className="h-auto p-4 flex-col items-start space-y-2"
                          variant="outline"
                        >
                          <BarChart3 className="h-6 w-6" />
                          <div className="text-left w-full">
                            <div className="font-medium">View Grades</div>
                            <div className="text-sm text-muted-foreground text-wrap">
                              Check your academic progress
                            </div>
                          </div>
                        </Button>
                        <Button
                          onClick={() => handleNavigateToView("assignment-management")}
                          className="h-auto p-4 flex-col items-start space-y-2"
                          variant="outline"
                        >
                          <CheckSquare className="h-6 w-6" />
                          <div className="text-left w-full">
                            <div className="font-medium">View Assignments</div>
                            <div className="text-sm text-muted-foreground text-wrap">
                              See all your assignments
                            </div>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Primary Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleNavigateToView("todo")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                      <CheckSquare className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {assignments ? assignments.filter(a => !a.completed && !a.isDeleted).length : 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignments && assignments.filter(a => !a.completed && !a.isDeleted && new Date(a.dueDate) < new Date()).length > 0
                          ? `${assignments.filter(a => !a.completed && !a.isDeleted && new Date(a.dueDate) < new Date()).length} overdue`
                          : "All caught up! 🎉"
                        }
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleNavigateToView("classes")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Classes</CardTitle>
                      <BookOpen className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{classes ? classes.length : 0}</div>
                      <p className="text-xs text-muted-foreground">This term</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleNavigateToView("grade-tracker")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                      <BarChart3 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {assignments && assignments.filter(a => a.completed && a.grade !== undefined).length > 0
                          ? `${Math.round(
                              assignments
                                .filter(a => a.completed && a.grade !== undefined)
                                .reduce((sum, a) => sum + ((a.grade || 0) / (a.maxPoints || 100)) * 100, 0) /
                              assignments.filter(a => a.completed && a.grade !== undefined).length
                            )}%`
                          : "N/A"
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignments ? assignments.filter(a => a.completed && a.grade !== undefined).length : 0} graded
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleNavigateToView("submitted-work")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                      <FileText className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {assignments && assignments.length > 0
                          ? `${Math.round((assignments.filter(a => a.completed && !a.isDeleted).length / assignments.filter(a => !a.isDeleted).length) * 100)}%`
                          : "0%"
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignments ? assignments.filter(a => a.completed && !a.isDeleted).length : 0} completed
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Assignments Due This Week */}
                {assignments && assignments.filter(a => {
                  if (a.completed || a.isDeleted) return false;
                  
                  // Use consistent date parsing logic
                  let dueDate: Date;
                  if (a.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dueDate = new Date(a.dueDate + "T00:00:00");
                  } else {
                    dueDate = new Date(a.dueDate);
                  }
                  
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  
                  // Normalize due date for comparison
                  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                  
                  return dueDateOnly.getTime() >= today.getTime() && dueDateOnly.getTime() <= weekFromNow.getTime();
                }).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckSquare className="h-5 w-5 text-orange-500" />
                          <span>Assignments Due This Week</span>
                          <Badge variant="outline">
                            {assignments.filter(a => {
                              if (a.completed || a.isDeleted) return false;
                              
                              // Use consistent date parsing logic
                              let dueDate: Date;
                              if (a.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                dueDate = new Date(a.dueDate + "T00:00:00");
                              } else {
                                dueDate = new Date(a.dueDate);
                              }
                              
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                              
                              // Normalize due date for comparison
                              const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                              
                              return dueDateOnly.getTime() >= today.getTime() && dueDateOnly.getTime() <= weekFromNow.getTime();
                            }).length}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleNavigateToView("todo")}>
                          View All
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {assignments && assignments
                          .filter(a => {
                            if (a.completed || a.isDeleted) return false;
                            
                            // Use consistent date parsing logic
                            let dueDate: Date;
                            if (a.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                              dueDate = new Date(a.dueDate + "T00:00:00");
                            } else {
                              dueDate = new Date(a.dueDate);
                            }
                            
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                            
                            // Normalize due date for comparison
                            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                            
                            return dueDateOnly.getTime() >= today.getTime() && dueDateOnly.getTime() <= weekFromNow.getTime();
                          })
                          .sort((a, b) => {
                            // Use consistent date parsing for sorting
                            let aDate: Date, bDate: Date;
                            if (a.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                              aDate = new Date(a.dueDate + "T00:00:00");
                            } else {
                              aDate = new Date(a.dueDate);
                            }
                            if (b.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                              bDate = new Date(b.dueDate + "T00:00:00");
                            } else {
                              bDate = new Date(b.dueDate);
                            }
                            return aDate.getTime() - bDate.getTime();
                          })
                          .slice(0, 5)
                          .map((assignment) => {
                            const classData = classes?.find(c => c._id === assignment.classId);
                            
                            // Use consistent date parsing logic
                            let dueDate: Date;
                            if (assignment.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                              dueDate = new Date(assignment.dueDate + "T00:00:00");
                            } else {
                              dueDate = new Date(assignment.dueDate);
                            }
                            
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            
                            // Normalize dates for comparison (remove time component)
                            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
                            const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
                            
                            let dueDateLabel = '';
                            let labelColor = 'text-muted-foreground';
                            
                            if (dueDateOnly.getTime() === yesterdayOnly.getTime()) {
                              dueDateLabel = 'OVERDUE (Due Yesterday)';
                              labelColor = 'text-red-600 font-medium';
                            } else if (dueDateOnly.getTime() === todayOnly.getTime()) {
                              dueDateLabel = 'DUE TODAY';
                              labelColor = 'text-orange-600 font-medium';
                            } else if (dueDateOnly.getTime() === tomorrowOnly.getTime()) {
                              dueDateLabel = 'DUE TOMORROW';
                              labelColor = 'text-yellow-600 font-medium';
                            } else {
                              dueDateLabel = `Due ${dueDate.toLocaleDateString()}`;
                            }
                            
                            return (
                              <div key={assignment._id} className="flex items-center space-x-2 p-3 rounded-lg border bg-card">
                                <Checkbox
                                  checked={assignment.completed}
                                  onCheckedChange={async (checked) => {
                                    if (checked && activeTerm?.isActive) {
                                      try {
                                        await updateAssignment({
                                          assignmentId: assignment._id as Id<"assignments">,
                                          updates: { completed: true },
                                          userId: userId!,
                                        });
                                        toast.success("Assignment completed! 🎉");
                                      } catch (error) {
                                        console.error("Error updating assignment:", error);
                                        toast.error("Failed to update assignment");
                                      }
                                    }
                                  }}
                                  disabled={!activeTerm?.isActive}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: classData?.color || '#6b7280' }}
                                    />
                                    <span className="font-medium text-sm">{assignment.title}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1 ml-5">
                                    <span className="text-xs text-muted-foreground">
                                      {classData?.name || 'Unknown Class'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className={`text-xs ${labelColor}`}>
                                      {dueDateLabel}
                                    </span>
                                  </div>
                                </div>
                                <Badge variant={assignment.priority === 'high' ? 'destructive' : 'secondary'}>
                                  {assignment.priority}
                                </Badge>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Assignments and Classes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <CardTitle className="text-lg font-medium">Recently Turned In</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigateToView("submitted-work")}
                      >
                        View All
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {assignments && assignments
                          .filter(a => {
                            if (!a.completed || a.isDeleted) return false;
                            const completedDate = new Date(a.updatedAt || a.createdAt);
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return completedDate >= weekAgo;
                          })
                          .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
                          .slice(0, 5)
                          .map((assignment) => {
                            const classData = classes?.find(c => c._id === assignment.classId);
                            const completedDate = new Date(assignment.updatedAt || assignment.createdAt);
                            
                            return (
                              <div key={assignment._id} className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                                <CheckSquare className="h-4 w-4 text-green-500" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: classData?.color || '#6b7280' }}
                                    />
                                    <span className="font-medium text-sm">{assignment.title}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {classData?.name || 'Unknown Class'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      Completed {completedDate.toLocaleDateString()}
                                    </span>
                                    {assignment.grade && (
                                      <>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {assignment.maxPoints ?
                                            `${assignment.grade}/${assignment.maxPoints}` :
                                            `${assignment.grade}%`
                                          }
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        {(!assignments || assignments.filter(a => {
                          if (!a.completed || a.isDeleted) return false;
                          const completedDate = new Date(a.updatedAt || a.createdAt);
                          const weekAgo = new Date();
                          weekAgo.setDate(weekAgo.getDate() - 7);
                          return completedDate >= weekAgo;
                        }).length === 0) && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No assignments completed in the past week</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                      <CardTitle className="text-lg font-medium">Your Classes</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigateToView("class-management")}
                      >
                        View All
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {activeTerm && (
                        <DashboardClassList
                          termId={activeTerm._id}
                          onSelectClass={(classId) => {
                            const classData = classes?.find(c => c._id === classId);
                            if (classData) {
                              const classPath = generateClassPath(
                                activeTerm.name,
                                activeTerm._id,
                                classData.name,
                                classData._id
                              );
                              router.push(classPath, { scroll: false });
                            }
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* My Classes View */}
            {activeView === "classes" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">My Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeTerm && userId && terms && (
                      <ClassManagement
                        terms={terms.map(term => ({
                          id: term._id,
                          name: term.name,
                          isActive: term.isActive
                        }))}
                        currentTerm={{
                          id: activeTerm._id,
                          name: activeTerm.name,
                          isActive: activeTerm.isActive
                        }}
                        onTermChange={(termId) => {
                          // Handle term change if needed
                          console.log("Term changed to:", termId);
                        }}
                        userId={userId}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Grade Tracker View */}
            {activeView === "grade-tracker" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Grade Tracker</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeTerm && (
                      <GradeTracker currentTerm={convertConvexTermToTerm(activeTerm)!} />
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Submitted Work View */}
            {activeView === "submitted-work" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Submitted Work</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SubmittedAssignments currentTermId={selectedTermId || undefined} />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "assignment-management" && activeTerm && (
              <AssignmentManagement
                terms={convertConvexTermsToTerms(terms)}
                currentTerm={convertConvexTermToTerm(activeTerm)!}
                onTermChange={async (termId: string) => {
                  const termIdTyped = termId as Id<"terms">;
                  await handleTermChange(termIdTyped);
                }}
                userId={userId}
              />
            )}

            {activeView === "class-management" && activeTerm && (
              <div className="space-y-4">
                <ClassManagement
                  terms={convertConvexTermsToTerms(terms)}
                  currentTerm={convertConvexTermToTerm(activeTerm)!}
                  onTermChange={handleTermChange}
                  userId={userId}
                />
              </div>
            )}

            {/* All Terms View */}
            {isAllTermsView && (
              <div className="space-y-6">
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-6 w-6 text-primary" />
                        <span>All Terms Dashboard 📚</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowTermSelector(true)}>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Switch View
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      View all your classes, assignments, and grades across all terms
                    </p>
                  </CardContent>
                </Card>

                {/* Todo List for All Terms */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      All Assignments
                    </CardTitle>
                    <CardDescription>
                      Pending assignments from all your terms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TodoList
                      currentTerm={{
                        id: "all-terms",
                        name: "All Terms",
                        year: new Date().getFullYear(),
                        season: "All",
                        isActive: true,
                        stats: {
                          pendingTasks: terms?.reduce((total, term) => total + (term.stats?.pendingTasks || 0), 0) || 0,
                          classes: terms?.reduce((total, term) => total + (term.stats?.classes || 0), 0) || 0,
                          gpa: 0,
                          completed: terms?.reduce((total, term) => total + (term.stats?.completed || 0), 0) || 0
                        }
                      } as any}
                    />
                  </CardContent>
                </Card>

                {/* Grade Tracker for All Terms */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      All Grades
                    </CardTitle>
                    <CardDescription>
                      Grade tracking across all terms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GradeTracker
                      currentTerm={{
                        id: "all-terms",
                        name: "All Terms",
                        year: new Date().getFullYear(),
                        season: "All",
                        isActive: true,
                        stats: {
                          pendingTasks: terms?.reduce((total, term) => total + (term.stats?.pendingTasks || 0), 0) || 0,
                          classes: terms?.reduce((total, term) => total + (term.stats?.classes || 0), 0) || 0,
                          gpa: 0,
                          completed: terms?.reduce((total, term) => total + (term.stats?.completed || 0), 0) || 0
                        }
                      } as any}
                    />
                  </CardContent>
                </Card>

                {/* Submitted Assignments for All Terms */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      All Submitted Work
                    </CardTitle>
                    <CardDescription>
                      Submitted assignments from all terms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SubmittedAssignments
                      currentTermId="all-terms"
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Dialogs - render when we have an active term OR when in All Terms view */}
      {(activeTerm || isAllTermsView) && (
        <>
          <TermSelector
            open={showTermSelector}
            onOpenChange={setShowTermSelector}
            terms={terms || []}
            deletedTerms={deletedTerms || []}
            currentTerm={isAllTermsView ? {
              _id: generateAllTermsId(userId),
              name: "All Terms",
              year: new Date().getFullYear(),
              season: "All",
              isActive: true,
              stats: {
                pendingTasks: terms?.reduce((total, term) => total + (term.stats?.pendingTasks || 0), 0) || 0,
                classes: terms?.reduce((total, term) => total + (term.stats?.classes || 0), 0) || 0,
                gpa: 0,
                completed: terms?.reduce((total, term) => total + (term.stats?.completed || 0), 0) || 0
              }
            } as any : activeTerm}
            onTermChange={async (termId: string) => {
              await handleTermChange(termId);
            }}
            onCreateTerm={handleCreateTerm}
          />
          {activeTerm && (
            <>
              <AddClassDialog
                open={showAddClass}
                onOpenChange={setShowAddClass}
                currentTerm={convertConvexTermToTerm(activeTerm)!}
                terms={convertConvexTermsToTerms(terms)}
              />
              <AddAssignmentsDialog
                open={showAddAssignments}
                onOpenChange={setShowAddAssignments}
                currentTerm={activeTerm}
                terms={convertConvexTermsToTerms(terms)}
                userId={userId}
                classes={classes || []}
              />
            </>
          )}
        </>
      )}
      <SearchCommand
        open={showSearch}
        onOpenChange={setShowSearch}
        onNavigate={handleNavigate}
        currentTermId={selectedTermId || undefined}
        onSelectAssignment={(id) => {
          handleNavigateToView("assignment-management");
          router.push(`/dashboard?highlight=${id}`, { scroll: false });
        }}
        onSelectClass={(id) => {
          const classData = classes?.find(c => c._id === id);
          if (classData && activeTerm) {
            const classPath = generateClassPath(
              activeTerm.name,
              activeTerm._id,
              classData.name,
              classData._id
            );
            router.push(classPath, { scroll: false });
          }
        }}
      />

      {/* Grade Import Dialog */}
      <GradeImportDialog
        open={showGradeImport}
        onOpenChange={setShowGradeImport}
        currentTerm={activeTerm}
        userId={userId}
      />

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour 
          open={showOnboarding} 
          onComplete={handleCompleteOnboarding}
          onCreateFirstTerm={async () => {
            const currentDate = new Date();
            const termEndDate = new Date(currentDate);
            termEndDate.setMonth(termEndDate.getMonth() + 4);
            
            await handleCreateFirstTerm({
              name: "My First Term",
              startDate: currentDate.toISOString().split('T')[0],
              endDate: termEndDate.toISOString().split('T')[0],
            });
          }}
          showCreateTermButton={!terms || terms.length === 0}
          hasExistingTerm={terms && terms.length > 0}
        />
      )}
    </ErrorBoundary>
  );
}
