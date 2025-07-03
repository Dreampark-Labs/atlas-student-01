"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useAction } from "convex/react";
import { useUser, UserProfile, OrganizationProfile } from "@clerk/nextjs";
import { Profile } from "@/components/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Moon,
  Sun,
  Globe,
  Download,
  Upload,
  Trash2,
  Shield,
  Palette,
  Calendar,
  Clock,
  Monitor,
  Zap,
  Brain,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthenticatedUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SettingsProps {
  activeTab?: string;
}

export function Settings({ activeTab }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const { user: clerkUser } = useUser();
  const userId = useAuthenticatedUserId();
  const [mounted, setMounted] = useState(false);

  // Get user settings from Convex
  const userData = useQuery(
    api.users.getUserProfile,
    userId ? { userId } : "skip",
  );

  const updateUserSettings = useMutation(api.users.updateUserSettings);
  const deleteUserAccount = useAction(api.users.deleteUserAccount);
  const testNotification = useAction(api.notifications.testNotification);

  const [localSettings, setLocalSettings] = useState({
    preferences: {
      theme: "system",
      language: "en",
      timezone: "America/New_York",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
    },
    notifications: {
      assignmentReminders: true,
      deadlineAlerts: true,
      emailNotifications: false,
      smsNotifications: false,
    },
    privacy: {
      shareGrades: false,
      shareSchedule: false,
      analytics: true,
    },
  });

  // Initialize settings from Convex data
  useEffect(() => {
    if (userData) {
      setLocalSettings({
        preferences: userData.preferences || {
          theme: "system",
          language: "en",
          timezone: "America/New_York",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
        },
        notifications: userData.notifications || {
          assignmentReminders: true,
          deadlineAlerts: true,
          emailNotifications: false,
          smsNotifications: false,
        },
        privacy: userData.privacy || {
          shareGrades: false,
          shareSchedule: false,
          analytics: true,
        },
      });
    }
  }, [userData]);

  // Handle hydration for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    const themeNames = { light: "Light", dark: "Dark", system: "System" };
    toast.success(
      `Theme changed to ${themeNames[newTheme as keyof typeof themeNames]}`,
    );

    // Update preferences in state and database
    updatePreferences({ theme: newTheme });
  };

  const updatePreferences = async (
    updates: Partial<typeof localSettings.preferences>,
  ) => {
    const newPreferences = { ...localSettings.preferences, ...updates };
    setLocalSettings((prev) => ({ ...prev, preferences: newPreferences }));

    if (userId) {
      try {
        await updateUserSettings({ userId, preferences: newPreferences });
      } catch (error) {
        console.error("Failed to update preferences:", error);
        toast.error("Failed to save preferences");
      }
    }
  };

  const updateNotifications = async (
    updates: Partial<typeof localSettings.notifications>,
  ) => {
    const newNotifications = { ...localSettings.notifications, ...updates };
    setLocalSettings((prev) => ({ ...prev, notifications: newNotifications }));

    if (userId) {
      try {
        await updateUserSettings({ userId, notifications: newNotifications });
        toast.success("Notification settings updated");
      } catch (error) {
        console.error("Failed to update notifications:", error);
        toast.error("Failed to save notification settings");
      }
    }
  };

  const updatePrivacy = async (
    updates: Partial<typeof localSettings.privacy>,
  ) => {
    const newPrivacy = { ...localSettings.privacy, ...updates };
    setLocalSettings((prev) => ({ ...prev, privacy: newPrivacy }));

    if (userId) {
      try {
        await updateUserSettings({ userId, privacy: newPrivacy });
        toast.success("Privacy settings updated");
      } catch (error) {
        console.error("Failed to update privacy:", error);
        toast.error("Failed to save privacy settings");
      }
    }
  };

  const formatDate = (date: Date): string => {
    const format = localSettings.preferences.dateFormat;
    switch (format) {
      case "DD/MM/YYYY":
        return date.toLocaleDateString("en-GB");
      case "YYYY-MM-DD":
        return date.toISOString().split("T")[0];
      default:
        return date.toLocaleDateString("en-US");
    }
  };

  const formatTime = (date: Date): string => {
    const format = localSettings.preferences.timeFormat;
    return format === "24h"
      ? date.toLocaleTimeString("en-US", { hour12: false })
      : date.toLocaleTimeString("en-US", { hour12: true });
  };

  const handleDeleteAllData = async () => {
    if (!userId || !clerkUser) {
      toast.error("User not authenticated");
      return;
    }

    try {
      // First delete all Convex data
      const result = await deleteUserAccount({ userId });

      if (result.success) {
        // Then delete the Clerk user account
        await clerkUser.delete();
        toast.success("Account and all data have been deleted successfully");
        // Redirect to home page since user is now deleted
        window.location.href = "/";
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
    }
  };

  const handleTestNotification = async (type: "email" | "sms" | "both") => {
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    try {
      const result = await testNotification({ userId, type });
      if (result.success) {
        toast.success(`Test ${type} notification sent successfully!`);
      } else {
        toast.error(result.error || "Failed to send test notification");
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast.error("Failed to send test notification. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs value={activeTab || "general"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the application looks and feels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === "light" && "Light mode is active"}
                    {theme === "dark" && "Dark mode is active"}
                    {theme === "system" && "Follows your system preference"}
                  </p>
                </div>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center">
                        <Monitor className="mr-2 h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Theme Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Light Theme Preview */}
                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      theme === "light" ? "ring-2 ring-primary" : ""
                    }`}
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      borderColor: "#e5e7eb",
                    }}
                    onClick={() => handleThemeChange("light")}
                  >
                    <div className="space-y-1">
                      <div
                        className="h-2 rounded"
                        style={{ backgroundColor: "#3b82f6" }}
                      ></div>
                      <div
                        className="h-1 rounded w-3/4"
                        style={{ backgroundColor: "#6b7280" }}
                      ></div>
                      <div
                        className="h-1 rounded w-1/2"
                        style={{ backgroundColor: "#9ca3af" }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1 font-medium">Light</div>
                  </div>

                  {/* Dark Theme Preview */}
                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      theme === "dark" ? "ring-2 ring-primary" : ""
                    }`}
                    style={{
                      backgroundColor: "#1f2937",
                      color: "#ffffff",
                      borderColor: "#374151",
                    }}
                    onClick={() => handleThemeChange("dark")}
                  >
                    <div className="space-y-1">
                      <div
                        className="h-2 rounded"
                        style={{ backgroundColor: "#3b82f6" }}
                      ></div>
                      <div
                        className="h-1 rounded w-3/4"
                        style={{ backgroundColor: "#9ca3af" }}
                      ></div>
                      <div
                        className="h-1 rounded w-1/2"
                        style={{ backgroundColor: "#6b7280" }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1 font-medium">Dark</div>
                  </div>

                  {/* System Theme Preview */}
                  <div
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      theme === "system" ? "ring-2 ring-primary" : ""
                    }`}
                    style={{
                      background:
                        "linear-gradient(45deg, #ffffff 50%, #1f2937 50%)",
                      color:
                        theme === "system" ? "var(--foreground)" : "#000000",
                      borderColor: "#e5e7eb",
                    }}
                    onClick={() => handleThemeChange("system")}
                  >
                    <div className="space-y-1">
                      <div
                        className="h-2 rounded"
                        style={{ backgroundColor: "#3b82f6" }}
                      ></div>
                      <div
                        className="h-1 rounded w-3/4"
                        style={{ backgroundColor: "#6b7280" }}
                      ></div>
                      <div
                        className="h-1 rounded w-1/2"
                        style={{ backgroundColor: "#9ca3af" }}
                      ></div>
                    </div>
                    <div className="text-xs mt-1 font-medium">System</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5" />
                Smart Features
              </CardTitle>
              <CardDescription>
                Enable intelligent features to enhance your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Smart Prioritization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically prioritize assignments based on due dates,
                    importance, and your grade impact
                  </p>
                </div>
                <Switch
                  checked={localSettings.privacy.analytics}
                  onCheckedChange={(checked) =>
                    updatePrivacy({ analytics: checked })
                  }
                />
              </div>

              {/* Preview of current date/time formatting */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Format Preview</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Date: {mounted && formatDate(new Date())}</div>
                  <div>Time: {mounted && formatTime(new Date())}</div>
                  <div>
                    Language: {localSettings.preferences.language.toUpperCase()}
                  </div>
                  <div>Timezone: {localSettings.preferences.timezone}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" />
                Localization
              </CardTitle>
              <CardDescription>
                Set your language and regional preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={localSettings.preferences.language}
                    onValueChange={(value) =>
                      updatePreferences({ language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={localSettings.preferences.timezone}
                    onValueChange={(value) =>
                      updatePreferences({ timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                      <SelectItem value="America/Phoenix">
                        Arizona Time
                      </SelectItem>
                      <SelectItem value="America/Anchorage">
                        Alaska Time
                      </SelectItem>
                      <SelectItem value="Pacific/Honolulu">
                        Hawaii Time
                      </SelectItem>
                      <SelectItem value="Europe/London">GMT</SelectItem>
                      <SelectItem value="Europe/Paris">
                        Central European Time
                      </SelectItem>
                      <SelectItem value="Asia/Tokyo">Japan Time</SelectItem>
                      <SelectItem value="Asia/Shanghai">China Time</SelectItem>
                      <SelectItem value="Australia/Sydney">
                        Australia Eastern Time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Date Format
                  </Label>
                  <Select
                    value={localSettings.preferences.dateFormat}
                    onValueChange={(value) =>
                      updatePreferences({ dateFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">
                        MM/DD/YYYY (US)
                      </SelectItem>
                      <SelectItem value="DD/MM/YYYY">
                        DD/MM/YYYY (UK/EU)
                      </SelectItem>
                      <SelectItem value="YYYY-MM-DD">
                        YYYY-MM-DD (ISO)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Time Format
                  </Label>
                  <Select
                    value={localSettings.preferences.timeFormat}
                    onValueChange={(value) =>
                      updatePreferences({ timeFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview of current date/time formatting */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Format Preview</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Date: {mounted && formatDate(new Date())}</div>
                  <div>Time: {mounted && formatTime(new Date())}</div>
                  <div>
                    Language: {localSettings.preferences.language.toUpperCase()}
                  </div>
                  <div>Timezone: {localSettings.preferences.timezone}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                User Profile
              </CardTitle>
              <CardDescription>
                Manage your personal information, academic details, and profile settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Profile />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Assignment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about upcoming assignments
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.assignmentReminders}
                  onCheckedChange={(checked) =>
                    updateNotifications({ assignmentReminders: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deadline Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get urgent alerts for approaching deadlines
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.deadlineAlerts}
                  onCheckedChange={(checked) =>
                    updateNotifications({ deadlineAlerts: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email at{" "}
                    {clerkUser?.emailAddresses[0]?.emailAddress || "your email"}
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    updateNotifications({ emailNotifications: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    <Phone className="mr-2 h-4 w-4" />
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive text message alerts{" "}
                    {userData?.phone
                      ? `at ${userData.phone}`
                      : "(add phone number in profile)"}
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.smsNotifications}
                  onCheckedChange={(checked) =>
                    updateNotifications({ smsNotifications: checked })
                  }
                  disabled={!userData?.phone}
                />
              </div>
              {!userData?.phone && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <strong>Note:</strong> Add a phone number in your profile to
                  enable SMS notifications.
                </div>
              )}

              {/* Test Notification Buttons */}
              <Separator />
              <div className="space-y-3">
                <Label>Test Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send test notifications to verify your settings are working
                  correctly.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestNotification("email")}
                    disabled={
                      !localSettings.notifications.emailNotifications ||
                      !clerkUser?.emailAddresses[0]?.emailAddress
                    }
                  >
                    Test Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestNotification("sms")}
                    disabled={
                      !localSettings.notifications.smsNotifications ||
                      !userData?.phone
                    }
                  >
                    Test SMS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestNotification("both")}
                    disabled={
                      (!localSettings.notifications.emailNotifications ||
                        !clerkUser?.emailAddresses[0]?.emailAddress) &&
                      (!localSettings.notifications.smsNotifications ||
                        !userData?.phone)
                    }
                  >
                    Test Both
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Share Grades</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see your academic performance
                  </p>
                </div>
                <Switch
                  checked={localSettings.privacy.shareGrades}
                  onCheckedChange={(checked) =>
                    updatePrivacy({ shareGrades: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Share Schedule</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see your class schedule
                  </p>
                </div>
                <Switch
                  checked={localSettings.privacy.shareSchedule}
                  onCheckedChange={(checked) =>
                    updatePrivacy({ shareSchedule: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve the app with anonymous usage data
                  </p>
                </div>
                <Switch
                  checked={localSettings.privacy.analytics}
                  onCheckedChange={(checked) =>
                    updatePrivacy({ analytics: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="mr-2 h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export, import, or delete your academic data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Export Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Download all your academic data
                    </p>
                  </div>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Import Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Import data from a backup file
                    </p>
                  </div>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Delete All Data</Label>
                    <p className="text-sm text-muted-foreground text-red-600">
                      Permanently delete all your data
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete all your terms, classes, assignments, and reset
                          your account to its initial state.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAllData}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, delete everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Account Management
              </CardTitle>
              <CardDescription>
                Manage your profile, email addresses, and connected accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Profile & Account
                  </h3>
                  <UserProfile
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "shadow-none border-0 bg-transparent",
                        navbar: "hidden",
                        pageScrollBox: "p-0",
                        profileSectionPrimaryButton:
                          "bg-primary hover:bg-primary/90",
                        formButtonPrimary: "bg-primary hover:bg-primary/90",
                        headerTitle: "text-foreground",
                        headerSubtitle: "text-muted-foreground",
                        profileSectionTitle: "text-foreground",
                        profileSectionContent: "text-muted-foreground",
                        accordionTriggerButton:
                          "text-foreground hover:text-foreground",
                        accordionContent: "text-muted-foreground",
                        formFieldLabel: "text-foreground",
                        formFieldInput:
                          "bg-background border-input text-foreground",
                        identityPreviewText: "text-foreground",
                        identityPreviewEditButton:
                          "text-primary hover:text-primary/90",
                      },
                      layout: {
                        showOptionalFields: true,
                      },
                    }}
                    routing="hash"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security & Authentication
              </CardTitle>
              <CardDescription>
                Manage your passwords, two-factor authentication, and security
                settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Security Settings
                  </h3>
                  <UserProfile
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "shadow-none border-0 bg-transparent",
                        navbar: "hidden",
                        pageScrollBox: "p-0",
                        profileSectionPrimaryButton:
                          "bg-primary hover:bg-primary/90",
                        formButtonPrimary: "bg-primary hover:bg-primary/90",
                        headerTitle: "text-foreground",
                        headerSubtitle: "text-muted-foreground",
                        profileSectionTitle: "text-foreground",
                        profileSectionContent: "text-muted-foreground",
                        accordionTriggerButton:
                          "text-foreground hover:text-foreground",
                        accordionContent: "text-muted-foreground",
                        formFieldLabel: "text-foreground",
                        formFieldInput:
                          "bg-background border-input text-foreground",
                        identityPreviewText: "text-foreground",
                        identityPreviewEditButton:
                          "text-primary hover:text-primary/90",
                      },
                      layout: {
                        showOptionalFields: false,
                      },
                    }}
                    routing="hash"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">💳</span>
                Billing & Subscription
              </CardTitle>
              <CardDescription>
                Manage your subscription, billing information, and payment
                methods.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Billing Management
                  </h3>
                  <OrganizationProfile
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "shadow-none border-0 bg-transparent",
                        navbar: "hidden",
                        pageScrollBox: "p-0",
                        profileSectionPrimaryButton:
                          "bg-primary hover:bg-primary/90",
                        formButtonPrimary: "bg-primary hover:bg-primary/90",
                        headerTitle: "text-foreground",
                        headerSubtitle: "text-muted-foreground",
                        profileSectionTitle: "text-foreground",
                        profileSectionContent: "text-muted-foreground",
                        accordionTriggerButton:
                          "text-foreground hover:text-foreground",
                        accordionContent: "text-muted-foreground",
                        formFieldLabel: "text-foreground",
                        formFieldInput:
                          "bg-background border-input text-foreground",
                      },
                      layout: {
                        showOptionalFields: false,
                      },
                    }}
                    routing="hash"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-blue-600 text-lg">ℹ️</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">
                        Atlas Student Dashboard
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Currently in beta - Free for all users during the
                        testing period.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
