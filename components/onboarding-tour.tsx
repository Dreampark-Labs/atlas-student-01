"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookOpen, CheckSquare, Plus, BarChart3, ArrowRight, Sparkles, Calendar, FileText, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface OnboardingTourProps {
  open: boolean
  onComplete: () => void
  onCreateFirstTerm: () => Promise<void> | void
  showCreateTermButton?: boolean
  hasExistingTerm?: boolean
}

export function OnboardingTour({ open, onComplete, onCreateFirstTerm, showCreateTermButton = false, hasExistingTerm = false }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [termCreated, setTermCreated] = useState(hasExistingTerm)
  const [isCreatingTerm, setIsCreatingTerm] = useState(false)

  const handleCreateTerm = async () => {
    setIsCreatingTerm(true)
    try {
      await onCreateFirstTerm()
      setTermCreated(true)
      setCurrentStep(currentStep + 1) // Move to next step after creating term
    } catch (error) {
      console.error("Failed to create term:", error)
    } finally {
      setIsCreatingTerm(false)
    }
  }

  const steps = [
    {
      title: "Welcome to Atlas Student! 🎓",
      description: "Your personal academic management system",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-lg mb-4">
              Atlas Student helps you organize your classes, track assignments, and manage your academic progress.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-green-600" />
                <span>Track assignments</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span>Manage classes</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span>Monitor grades</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <span>File backups</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Create Your First Term",
      description: "Terms help you organize your academic year",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="mb-4">
              First, let's create your current academic term. This will be your workspace for classes and assignments.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-2">We'll create:</p>
              <Badge variant="outline" className="text-sm">
                {new Date().getMonth() < 6 ? "Spring" : new Date().getMonth() < 9 ? "Summer" : "Fall"} {new Date().getFullYear()}
              </Badge>
            </div>
            {showCreateTermButton && (
              <Button onClick={handleCreateTerm} disabled={isCreatingTerm} className="mt-4">
                {isCreatingTerm ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Term...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Term
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )
    },
    {
      title: "Add Your Classes",
      description: "Organize your coursework by class",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="mb-4">
              After creating your term, you'll add the classes you're taking. Each class can have:
            </p>
            <div className="space-y-2 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">Class name and code (e.g., Math 101)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">Instructor information</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">Credit hours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">Schedule and location</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Track Assignments",
      description: "Never miss a deadline again",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <CheckSquare className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="mb-4">
              For each class, you can add assignments with due dates, priorities, and file backups.
            </p>
            <div className="bg-muted p-4 rounded-lg text-left">
              <p className="font-medium mb-2">Assignment features:</p>
              <ul className="text-sm space-y-1">
                <li>• Due date tracking</li>
                <li>• Priority levels (High, Medium, Low)</li>
                <li>• File upload for backups</li>
                <li>• Progress tracking</li>
                <li>• Grade recording</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set! 🚀",
      description: "Ready to start your academic journey",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="h-16 w-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="mb-4">
              Great! You now know how to use Atlas Student. Let's create your first term and get started.
            </p>
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 Tip: Use Cmd+K (Mac) or Ctrl+K (Windows) to quickly search and navigate anywhere in the app!
              </p>
            </div>
          </div>
        </div>
      )
    }
  ]

  const handleNext = () => {
    if (currentStep === 1 && !termCreated && showCreateTermButton) {
      // On create term step, require term creation first
      return
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // On last step, complete onboarding
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = async () => {
    if (!termCreated && !hasExistingTerm) {
      setIsCreatingTerm(true)
      try {
        await onCreateFirstTerm()
        setTermCreated(true)
      } catch (error) {
        console.error("Failed to create term:", error)
      } finally {
        setIsCreatingTerm(false)
      }
    }
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{steps[currentStep].title}</DialogTitle>
          <DialogDescription>{steps[currentStep].description}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {steps[currentStep].content}
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : index < currentStep ? "bg-primary/60" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious} disabled={isCreatingTerm}>
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip} disabled={isCreatingTerm}>
              {isCreatingTerm ? "Creating..." : "Skip Tour"}
            </Button>
            <Button onClick={handleNext} disabled={(currentStep === 1 && !termCreated && showCreateTermButton) || isCreatingTerm}>
              {currentStep === steps.length - 1 ? "Get Started" : 
               currentStep === 1 && !termCreated && showCreateTermButton ? "Create Term First" : "Next"}
              {!(currentStep === 1 && !termCreated && showCreateTermButton) && !isCreatingTerm && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
