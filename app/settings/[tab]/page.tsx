"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth, SignOutButton } from "@clerk/nextjs";
import { useAuthenticatedUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, SettingsIcon, User } from "lucide-react";
import { Settings } from "@/components/settings";
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

export default function SettingsTabPage() {
  const router = useRouter();
  const params = useParams();
  const { userId } = useAuth();
  const authenticatedUserId = useAuthenticatedUserId();
  const activeTab = params.tab as string || 'general';

  // Get user data for sidebar
  const userData = useQuery(
    api.users.getUserProfile,
    authenticatedUserId ? { userId: authenticatedUserId } : "skip"
  );

  const activeTerm = useQuery(
    api.terms.getActiveTerm, 
    authenticatedUserId ? { userId: authenticatedUserId } : "skip"
  );

  const handleBack = () => {
    // Get the referrer from session storage or browser history
    const referrer = sessionStorage.getItem('lastInternalPath');
    
    // Check if referrer exists and is within our domain
    if (referrer && 
        referrer.startsWith('/') && 
        !referrer.includes('/sign-in') && 
        !referrer.includes('/sign-up') && 
        !referrer.includes('/auth-callback') &&
        !referrer.includes('/settings')) {
      router.push(referrer);
    } else {
      router.push('/dashboard');
    }
  };

  // Store navigation tracking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Track this visit for breadcrumbs, but don't store settings pages as back destinations
      const currentPath = window.location.pathname;
      const referrer = document.referrer;
      
      // Only store non-settings internal paths
      if (referrer && 
          referrer.includes(window.location.origin) && 
          !referrer.includes('/settings') &&
          !referrer.includes('/sign-in') &&
          !referrer.includes('/sign-up') &&
          !referrer.includes('/auth-callback')) {
        const referrerPath = new URL(referrer).pathname;
        sessionStorage.setItem('lastInternalPath', referrerPath);
      }
    }
  }, []);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: `/settings/${activeTab}` }
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <SettingsIcon className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Settings</span>
                      <span className="truncate text-xs">Account & Preferences</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  {activeTerm && (
                    <DropdownMenuItem onClick={() => {
                      const termSlug = `${activeTerm.season.toLowerCase()}-${activeTerm.year}`;
                      router.push(`/term/${termSlug}/classes`);
                    }}>
                      <span>Back to {activeTerm.name}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'general'}
                  >
                    <a href="/settings/general">
                      <SettingsIcon className="size-4" />
                      <span>General</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'profile'}
                  >
                    <a href="/settings/profile">
                      <User className="size-4" />
                      <span>Profile</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'notifications'}
                  >
                    <a href="/settings/notifications">
                      <span className="size-4">🔔</span>
                      <span>Notifications</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'privacy'}
                  >
                    <a href="/settings/privacy">
                      <span className="size-4">🔒</span>
                      <span>Privacy</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'account'}
                  >
                    <a href="/settings/account">
                      <User className="size-4" />
                      <span>Account</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'security'}
                  >
                    <a href="/settings/security">
                      <span className="size-4">🛡️</span>
                      <span>Security</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'billing'}
                  >
                    <a href="/settings/billing">
                      <span className="size-4">💳</span>
                      <span>Billing</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeTab === 'data'}
                  >
                    <a href="/settings/data">
                      <span className="size-4">📊</span>
                      <span>Data</span>
                    </a>
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
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <User className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {userData?.firstName || "User"}
                      </span>
                      <span className="truncate text-xs">
                        {userData?.email || "user@example.com"}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <SignOutButton>
                      <span className="w-full text-left cursor-pointer">Sign out</span>
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
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.href} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator className="mx-2" />}
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={breadcrumb.href}>
                          {breadcrumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>

          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6">
            <Settings activeTab={activeTab} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
