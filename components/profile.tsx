"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, MapPin, Calendar, GraduationCap, Edit, Camera, Award, Target, Settings, RefreshCw, Globe, Plus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuthenticatedUserId } from "@/lib/user"
import { api } from "@/convex/_generated/api"
import Link from "next/link"

export function Profile() {
  const { user: clerkUser } = useUser()
  const userId = useAuthenticatedUserId()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Get user data from Convex
  const userData = useQuery(
    api.users.getUserProfile,
    userId ? { userId } : "skip"
  )

  const activeTerm = useQuery(api.terms.getActiveTerm, userId ? { userId } : "skip")
  const updateUserProfile = useMutation(api.users.updateUserProfile)

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    studentId: "",
    major: "",
    minor: "",
    expectedGraduation: "",
    bio: "",
  })

  // State for managing external accounts
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isDisconnectingAccount, setIsDisconnectingAccount] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Update local state when user data loads from both Clerk and Convex
  useEffect(() => {
    if (userData && clerkUser) {
      // Merge data from Clerk and Convex, prioritizing Clerk for basic info
      const clerkMetadata = (clerkUser.unsafeMetadata || {}) as Record<string, any>;

      setProfile({
        firstName: clerkUser.firstName || userData.firstName || "",
        lastName: clerkUser.lastName || userData.lastName || "",
        email: clerkUser.primaryEmailAddress?.emailAddress || userData.email || "",
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || userData.phone || "",
        address: (clerkMetadata.address as string) || userData.address || "",
        dateOfBirth: (clerkMetadata.dateOfBirth as string) || userData.dateOfBirth || "",
        studentId: (clerkMetadata.studentId as string) || userData.studentId || "",
        major: (clerkMetadata.major as string) || userData.major || "",
        minor: (clerkMetadata.minor as string) || userData.minor || "",
        expectedGraduation: (clerkMetadata.expectedGraduation as string) || userData.expectedGraduation || "",
        bio: (clerkMetadata.bio as string) || userData.bio || "",
      })
    } else if (userData) {
      // Fallback to Convex data if Clerk data isn't available yet
      setProfile({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
        phone: userData.phone || "",
        address: userData.address || "",
        dateOfBirth: userData.dateOfBirth || "",
        studentId: userData.studentId || "",
        major: userData.major || "",
        minor: userData.minor || "",
        expectedGraduation: userData.expectedGraduation || "",
        bio: userData.bio || "",
      })
    }
  }, [userData, clerkUser])

  // Mock data for academic stats (will be calculated from actual data)
  const academicStats = {
    gpa: 3.75,
    creditsEarned: 90,
    creditsRequired: 120,
    completedCourses: 0, // Will be calculated from past terms
    currentTerm: activeTerm?.name || "No active term",
    academicStanding: "Good Standing",
  }

  const achievements: any[] = [
    // Achievements will be populated based on actual user performance
    // For now, this is empty until achievement system is implemented
  ]

  const handleSave = async () => {
    if (!userId || !clerkUser) return;

    setIsSaving(true);
    try {
      // Update Clerk user profile first
      const clerkUpdates: any = {};

      // Update first name and last name in Clerk
      if (profile.firstName !== clerkUser.firstName) {
        clerkUpdates.firstName = profile.firstName;
      }
      if (profile.lastName !== clerkUser.lastName) {
        clerkUpdates.lastName = profile.lastName;
      }

      // Update phone number in Clerk if it changed
      if (profile.phone && profile.phone !== clerkUser.phoneNumbers?.[0]?.phoneNumber) {
        try {
          // If user has existing phone numbers, destroy and recreate
          if (clerkUser.phoneNumbers?.length > 0) {
            await clerkUser.phoneNumbers[0].destroy();
          }
          // Create new phone number
          await clerkUser.createPhoneNumber({ phoneNumber: profile.phone });
        } catch (phoneError) {
          console.warn("Failed to update phone number in Clerk:", phoneError);
          // Continue with other updates even if phone fails
        }
      }

      // Update basic profile info in Clerk
      if (Object.keys(clerkUpdates).length > 0) {
        await clerkUser.update(clerkUpdates);
      }

      // Update user metadata in Clerk with additional info
      await clerkUser.update({
        unsafeMetadata: {
          ...clerkUser.unsafeMetadata,
          address: profile.address,
          dateOfBirth: profile.dateOfBirth,
          studentId: profile.studentId,
          major: profile.major,
          minor: profile.minor,
          expectedGraduation: profile.expectedGraduation,
          bio: profile.bio,
        }
      });

      // Update Convex database
      await updateUserProfile({
        userId,
        updates: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          address: profile.address,
          dateOfBirth: profile.dateOfBirth,
          studentId: profile.studentId,
          major: profile.major,
          minor: profile.minor,
          expectedGraduation: profile.expectedGraduation,
          bio: profile.bio,
        }
      });

      toast.success("Profile updated successfully in both application and account!");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle profile image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !clerkUser) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      // Upload image to Clerk
      await clerkUser.setProfileImage({ file });

      // Force reload user data to get new image URL
      await clerkUser.reload();

      toast.success('Profile image updated successfully!');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      toast.error('Failed to update profile image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Google account connection
  const handleConnectGoogle = async () => {
    if (!clerkUser) return;

    setIsConnectingGoogle(true);
    try {
      // Check if Google is already connected
      const existingGoogleAccount = clerkUser.externalAccounts.find(acc => acc.provider === 'google');
      if (existingGoogleAccount) {
        toast.info("Google account is already connected!");
        setIsConnectingGoogle(false);
        return;
      }

      console.log("Attempting to connect Google account...");
      console.log("Available external accounts:", clerkUser.externalAccounts);
      console.log("User verification:", clerkUser.primaryEmailAddress?.verification);

      // Try different OAuth strategies for better compatibility
      let externalAccount;

      try {
        // Method 1: Standard OAuth flow
        externalAccount = await clerkUser.createExternalAccount({
          strategy: "oauth_google",
          redirectUrl: `${window.location.origin}${window.location.pathname}`,
          additionalScopes: ["email", "profile"],
        });
      } catch (primaryError: any) {
        console.log("Primary method failed, trying alternative...", primaryError);

        // Method 2: Try without additional scopes
        try {
          externalAccount = await clerkUser.createExternalAccount({
            strategy: "oauth_google",
            redirectUrl: `${window.location.origin}${window.location.pathname}`,
          });
        } catch (secondaryError: any) {
          console.log("Secondary method failed, trying redirect...", secondaryError);

          // Method 3: Try with different redirect URL
          externalAccount = await clerkUser.createExternalAccount({
            strategy: "oauth_google",
            redirectUrl: window.location.href,
          });
        }
      }

      console.log("Google account connected successfully:", externalAccount);
      toast.success("Google account connected! You can now sign in with Google.");

      // Reload user data to reflect the change
      await clerkUser.reload();

    } catch (error: any) {
      console.error("All connection methods failed:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        status: error.status,
        errors: error.errors,
        longMessage: error.longMessage
      });

      // Provide more specific error messages and solutions
      if (error?.errors?.[0]?.code === 'oauth_provider_not_enabled') {
        toast.error("Google OAuth is not enabled in your Clerk dashboard. Please enable it first.");
      } else if (error?.errors?.[0]?.code === 'external_account_exists') {
        toast.info("This Google account is already connected to another user.");
      } else if (error?.errors?.[0]?.code === 'not_allowed_access') {
        toast.error("Google OAuth access not allowed. Check your Clerk configuration.");
      } else if (error?.errors?.[0]?.message?.includes('reverification')) {
        // Special handling for reverification error - offer alternative
        toast.error("OAuth verification issue. Try using Clerk's account management instead.");

        // Provide alternative solution
        setTimeout(() => {
          toast.info("Alternative: Go to Settings → Account to connect Google through Clerk directly.");
        }, 2000);
      } else if (error?.errors?.[0]?.message?.includes('redirect')) {
        toast.error("OAuth redirect configuration issue. Check your Google Console redirect URLs.");
      } else if (error?.longMessage) {
        toast.error(`Connection failed: ${error.longMessage}`);
      } else if (error?.errors?.[0]?.message) {
        toast.error(`Connection failed: ${error.errors[0].message}`);
      } else {
        toast.error("Failed to connect Google account. Try the alternative method in Account Settings.");
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Handle disconnecting external accounts
  const handleDisconnectAccount = async (accountId: string, provider: string) => {
    if (!clerkUser) return;

    setIsDisconnectingAccount(accountId);
    try {
      const externalAccount = clerkUser.externalAccounts.find(acc => acc.id === accountId);
      if (externalAccount) {
        await externalAccount.destroy();
        toast.success(`${provider} login method removed successfully!`);

        // Reload user data to reflect the change
        await clerkUser.reload();
      }
    } catch (error) {
      console.error("Failed to disconnect account:", error);
      toast.error(`Failed to remove ${provider} login method. Please try again.`);
    } finally {
      setIsDisconnectingAccount(null);
    }
  };

  // Alternative method: Use Clerk's built-in account management
  const handleConnectGoogleAlternative = () => {
    // Redirect to the settings page where Clerk's UserProfile component handles Google connection
    window.location.href = '/settings/account';

    // Show helpful instructions
    toast.info("Redirecting to Account Settings where you can connect Google through Clerk's interface...", {
      duration: 4000,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profile</h2>
          <p className="text-muted-foreground">
            Manage your personal information and academic details. Changes sync automatically with your account.
          </p>
          <div className="flex items-center mt-2 text-sm text-muted-foreground">
            <RefreshCw className="mr-1 h-3 w-3" />
            <span>Synced with your Clerk account</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href="/settings/account">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </Button>
          </Link>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            disabled={isSaving}
          >
            <Edit className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
          </Button>
        </div>
      </div>

      {/* Profile content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={clerkUser?.imageUrl || "/placeholder-avatar.jpg"}
                    alt="Profile picture"
                  />
                  <AvatarFallback className="text-lg">
                    {clerkUser?.firstName?.[0] || profile.firstName[0]}
                    {clerkUser?.lastName?.[0] || profile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      id="profile-image-upload"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={() => document.getElementById('profile-image-upload')?.click()}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold">
                {profile.firstName} {profile.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">{profile.studentId}</p>
              <Badge variant="secondary">{academicStats.academicStanding}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                {profile.email}
              </div>
              <div className="flex items-center text-sm">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                {profile.phone}
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                {profile.address}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                ) : (
                  <p className="text-sm p-2">{profile.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                ) : (
                  <p className="text-sm p-2">{profile.lastName}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <p className="text-sm p-2 text-muted-foreground">{profile.email}</p>
                <p className="text-xs text-muted-foreground">Email is managed through your account settings</p>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                ) : (
                  <p className="text-sm p-2">{profile.phone}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              {isEditing ? (
                <Input
                  id="address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              ) : (
                <p className="text-sm p-2">{profile.address}</p>
              )}
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              {isEditing ? (
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={profile.dateOfBirth}
                  onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                />
              ) : (
                <p className="text-sm p-2">{profile.dateOfBirth}</p>
              )}
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-sm p-2">{profile.bio || "No bio added yet."}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Academic Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="mr-2 h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="studentId">Student ID</Label>
              {isEditing ? (
                <Input
                  id="studentId"
                  value={profile.studentId}
                  onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                />
              ) : (
                <p className="text-sm p-2">{profile.studentId}</p>
              )}
            </div>
            <div>
              <Label htmlFor="major">Major</Label>
              {isEditing ? (
                <Input
                  id="major"
                  value={profile.major}
                  onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                />
              ) : (
                <p className="text-sm p-2">{profile.major}</p>
              )}
            </div>
            <div>
              <Label htmlFor="minor">Minor</Label>
              {isEditing ? (
                <Input
                  id="minor"
                  value={profile.minor}
                  onChange={(e) => setProfile({ ...profile, minor: e.target.value })}
                />
              ) : (
                <p className="text-sm p-2">{profile.minor}</p>
              )}
            </div>
            <div>
              <Label htmlFor="expectedGraduation">Expected Graduation</Label>
              {isEditing ? (
                <Input
                  id="expectedGraduation"
                  value={profile.expectedGraduation}
                  onChange={(e) => setProfile({ ...profile, expectedGraduation: e.target.value })}
                />
              ) : (
                <p className="text-sm p-2">{profile.expectedGraduation}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Academic Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>GPA</span>
                <span className="font-medium">{academicStats.gpa}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Credits Earned</span>
                <span className="font-medium">{academicStats.creditsEarned}/{academicStats.creditsRequired}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Term</span>
                <span className="font-medium">{academicStats.currentTerm}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Academic Standing</span>
                <Badge variant="secondary">{academicStats.academicStanding}</Badge>
              </div>
            </div>
            <Separator />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Math.round((academicStats.creditsEarned / academicStats.creditsRequired) * 100)}%
              </div>
              <p className="text-sm text-muted-foreground">Degree Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Manage your login methods and connected accounts. Add Google to sign in with your Google account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info message for Google primary users */}
          {(() => {
            const hasGoogleEmail = clerkUser?.primaryEmailAddress?.emailAddress?.includes('@gmail.com');
            const hasNoPassword = !clerkUser?.passwordEnabled;
            const googleAccount = clerkUser?.externalAccounts?.find(acc => acc.provider === 'google');
            const emailVerification = clerkUser?.primaryEmailAddress?.verification;
            const isOAuthVerified = emailVerification?.strategy === 'oauth_google';

            const isGooglePrimaryUser = ((hasGoogleEmail && hasNoPassword) || isOAuthVerified) && !googleAccount;

            if (isGooglePrimaryUser) {
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium">You're signed in with Google</p>
                      <p className="text-blue-700">
                        Your Google account is your primary login method. You can sign in with Google or add additional login methods below.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Google Account */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const googleAccount = clerkUser?.externalAccounts?.find(acc => acc.provider === 'google');

                    // Case 1: Google connected as external account
                    if (googleAccount) {
                      return `Connected as ${googleAccount.emailAddress || googleAccount.username || 'Google User'}`;
                    }

                    // Case 2: User signed up/in with Google OAuth (primary method)
                    // Check if this appears to be a Google-authenticated user
                    const hasGoogleEmail = clerkUser?.primaryEmailAddress?.emailAddress?.includes('@gmail.com');
                    const hasNoPassword = !clerkUser?.passwordEnabled;
                    const hasNoOtherExternalAccounts = (clerkUser?.externalAccounts?.length || 0) === 0;

                    // Check verification data which might indicate OAuth signup
                    const emailVerification = clerkUser?.primaryEmailAddress?.verification;
                    const isOAuthVerified = emailVerification?.strategy === 'oauth_google' ||
                                          emailVerification?.externalVerificationRedirectURL?.toString().includes('google');

                    if ((hasGoogleEmail && hasNoPassword) || isOAuthVerified) {
                      return `Primary Google account (${clerkUser?.primaryEmailAddress?.emailAddress})`;
                    }

                    return 'Add Google as a login method';
                  })()}
                </p>
              </div>
            </div>
            <div>
              {(() => {
                const googleAccount = clerkUser?.externalAccounts?.find(acc => acc.provider === 'google');

                // Enhanced detection for Google primary login
                const hasGoogleEmail = clerkUser?.primaryEmailAddress?.emailAddress?.includes('@gmail.com');
                const hasNoPassword = !clerkUser?.passwordEnabled;
                const emailVerification = clerkUser?.primaryEmailAddress?.verification;
                const isOAuthVerified = emailVerification?.strategy === 'oauth_google' ||
                  emailVerification?.externalVerificationRedirectURL?.toString().includes('google');

                // User is using Google as primary login if they have Gmail + no password OR OAuth verified
                const isGooglePrimaryLogin = ((hasGoogleEmail && hasNoPassword) || isOAuthVerified) && !googleAccount;

                if (googleAccount) {
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectAccount(googleAccount.id, 'Google')}
                      disabled={isDisconnectingAccount === googleAccount.id}
                    >
                      {isDisconnectingAccount === googleAccount.id ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <X className="mr-2 h-3 w-3" />
                          Remove Login
                        </>
                      )}
                    </Button>
                  );
                } else if (isGooglePrimaryLogin) {
                  return (
                    <div className="text-sm text-muted-foreground">
                      <Badge variant="secondary">Primary Login</Badge>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleConnectGoogle}
                        disabled={isConnectingGoogle}
                      >
                        {isConnectingGoogle ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-3 w-3" />
                            Add Google Login
                          </>
                        )}
                      </Button>

                      {/* Alternative method button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleConnectGoogleAlternative}
                        className="text-xs h-6"
                      >
                        Or use Clerk account page
                      </Button>
                    </div>
                  );
                }
              })()}
            </div>
          </div>

          {/* Login Methods Explanation */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 mt-0.5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="text-gray-800 font-medium">About Login Methods</p>
                <p className="text-gray-700 mt-1">
                  Adding Google allows you to sign in with your Google account instead of a password.
                  You can have multiple login methods and use whichever is most convenient.
                  If the direct connection doesn't work, try the alternative method below.
                </p>
              </div>
            </div>
          </div>

          {/* Other External Accounts */}
          {clerkUser?.externalAccounts?.filter(acc => acc.provider !== 'google').map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium capitalize">{account.provider}</p>
                  <p className="text-sm text-muted-foreground">
                    Login method: {account.emailAddress || account.username || 'External User'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnectAccount(account.id, account.provider)}
                disabled={isDisconnectingAccount === account.id}
              >
                {isDisconnectingAccount === account.id ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-3 w-3" />
                    Remove Login
                  </>
                )}
              </Button>
            </div>
          ))}

          {/* Summary */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total Login Methods</span>
              <span className="font-medium">{(clerkUser?.externalAccounts?.length || 0) + 1}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Password + {clerkUser?.externalAccounts?.length || 0} OAuth method(s)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No achievements yet. Keep up the great work!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
