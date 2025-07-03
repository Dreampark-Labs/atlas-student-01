"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, BarChart3, CheckSquare, FileText, Plus, Search, ChevronDown, User, SettingsIcon } from "lucide-react"
import { ClassAssignmentsView } from "@/components/class-assignments-view"
import { SearchCommand } from "@/components/search-command"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { getCurrentUserId } from "@/lib/user"
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
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ClassViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const classId = searchParams.get("classId")
  const userId = getCurrentUserId()
  const [showSearch, setShowSearch] = useState(false)

  // Fetch class data
  const classData = useQuery(api.classes.getClass, classId ? {
    classId: classId as Id<"classes">,
    userId
  } : "skip")

  // Fetch term data and other required data for sidebar
  const termData = useQuery(api.terms.getTerm, classData?.termId ? {
    termId: classData.termId
  } : "skip")
  
  const terms = useQuery(api.terms.getTerms, { userId })
  const activeTerm = useQuery(api.terms.getActiveTerm, { userId })
  const assignments = useQuery(api.assignments.getAssignmentsByTerm, 
    activeTerm ? { userId, termId: activeTerm._id } : "skip"
  )

  const currentTerm = activeTerm || termData

  // Navigation items (same as main app)
  const navigationItems = [
    {
      title: "To-Do List",
      icon: CheckSquare,
      id: "todo",
      badge: currentTerm?.stats?.pendingTasks && currentTerm.stats.pendingTasks > 0 ? currentTerm.stats.pendingTasks.toString() : undefined,
    },
    {
      title: "My Classes", 
      icon: BookOpen,
      id: "classes",
      badge: currentTerm?.stats?.classes?.toString() || "0",
    },
    {
      title: "Grade Tracker",
      icon: BarChart3,
      id: "grades",
    },
    {
      title: "Submitted Work",
      icon: FileText,
      id: "submitted",
      badge: assignments ? assignments.filter(a => a.completed).length.toString() : "0",
    },
  ]

  const handleBack = () => {
    router.push("/?tab=classes")
  }

  const handleNavigateToTab = (tab: string) => {
    router.push(`/?tab=${tab}`)
  }

  const handleViewChange = (view: string, data?: any) => {
    if (data?.assignmentId) {
      // Navigate to main app with assignment highlight
      router.push(`/?tab=todo&highlight=${data.assignmentId}`)
    } else if (data?.classId) {
      // Navigate to main app with class highlight
      router.push(`/?tab=classes&highlight=${data.classId}`)
    } else if (data?.search) {
      // Navigate to main app with search
      router.push(`/?tab=${view}&search=${encodeURIComponent(data.search)}`)
    } else {
      router.push(`/?tab=${view}`)
    }
  }

  const handleSelectAssignment = (assignmentId: string) => {
    // Navigate to main app todo view with assignment highlight
    router.push(`/?tab=todo&highlight=${assignmentId}`)
  }

  const handleSelectClass = (classId: string) => {
    // Navigate to main app classes view with class highlight
    router.push(`/?tab=classes&highlight=${classId}`)
  }

  const handleTermChange = (termId: string) => {
    // Navigate back to main app with the selected term
    router.push(`/?tab=classes&term=${termId}`)
  }

  if (!classId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">No class selected</p>
          <Button onClick={handleBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
        </div>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading class data...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          {/* Term Selector - same as main app */}
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <BookOpen className="size-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none flex-1">
                      <span className="font-semibold">Academic Tracker</span>
                      <span className="text-xs">{currentTerm?.name || 'Loading...'}</span>
                    </div>
                    <ChevronDown className="size-4 shrink-0" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56" align="start">
                  <DropdownMenuLabel>Switch Term</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {terms?.map((term) => (
                    <DropdownMenuItem
                      key={term._id}
                      onClick={() => handleTermChange(term._id)}
                      className={term._id === currentTerm?._id ? "bg-accent" : ""}
                    >
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">{term.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {term.stats.classes} classes • GPA: {term.stats.gpa}
                        </span>
                      </div>
                      {term._id === currentTerm?._id && (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/?tab=dashboard")}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Manage Terms</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Search Button */}
          <SidebarGroup className="py-0">
            <SidebarGroupContent className="relative">
              <Button
                variant="outline"
                className="w-full justify-start text-sm text-muted-foreground h-9 px-3"
                onClick={() => setShowSearch(true)}
              >
                <Search className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">Search...</span>
                <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => handleViewChange("dashboard")}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={item.id === "classes"} 
                      onClick={() => handleViewChange(item.id)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                          {item.badge}
                        </span>
                      )}
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
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => handleViewChange("dashboard")}>
                    <Plus className="h-4 w-4" />
                    <span>Add Assignments</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => handleViewChange("classes")}>
                    <Plus className="h-4 w-4" />
                    <span>Add Class</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                      <User className="size-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-medium">Student</span>
                      <span className="text-xs text-muted-foreground">Academic Tracker</span>
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
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                        <User className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">Student</span>
                        <span className="truncate text-xs text-muted-foreground">Academic Tracker User</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewChange("settings")}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/settings/profile'}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <Separator orientation="vertical" className="mr-2 h-4" />
          
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" onClick={() => handleViewChange("dashboard")}>
                  Atlas Student
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink onClick={handleBack} className="cursor-pointer">
                  My Classes
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {classData?.name} ({classData?.code})
                </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <span className="text-xs text-muted-foreground">{currentTerm?.name}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <ClassAssignmentsView
            classData={classData}
            userId={userId}
          />
        </div>
      </SidebarInset>

      <SearchCommand 
        open={showSearch} 
        onOpenChange={setShowSearch} 
        onNavigate={handleViewChange} 
        currentTermId={currentTerm?._id}
        onSelectAssignment={handleSelectAssignment}
        onSelectClass={handleSelectClass}
      />
    </SidebarProvider>
  )
}
