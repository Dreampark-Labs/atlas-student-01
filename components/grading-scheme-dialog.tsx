"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { getSuggestedGradingCategories, categorizeAssignmentType } from "@/lib/assignment-categorization"

interface GradingSchemeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classData?: {
    id: number
    name: string
    code: string
    gradingScheme: Record<string, { weight: number; count: number }>
  }
}

export function GradingSchemeDialog({ open, onOpenChange, classData }: GradingSchemeDialogProps) {
  // Use suggested categories as default, or existing class data
  const getInitialScheme = () => {
    if (classData?.gradingScheme) {
      return classData.gradingScheme
    }
    
    // Convert suggested categories to the expected format
    const suggested = getSuggestedGradingCategories()
    const initialScheme: Record<string, { weight: number; count: number }> = {}
    suggested.forEach(category => {
      initialScheme[category.name] = {
        weight: category.weight,
        count: category.count
      }
    })
    return initialScheme
  }

  const [gradingScheme, setGradingScheme] = useState(getInitialScheme())

  const [newCategory, setNewCategory] = useState({ name: "", weight: 0, count: 1 })

  const addCategory = () => {
    if (newCategory.name && newCategory.weight > 0) {
      // Standardize the category name
      const standardizedName = categorizeAssignmentType(newCategory.name)
      setGradingScheme({
        ...gradingScheme,
        [standardizedName]: { weight: newCategory.weight, count: newCategory.count },
      })
      setNewCategory({ name: "", weight: 0, count: 1 })
    }
  }

  const removeCategory = (categoryName: string) => {
    const newScheme = { ...gradingScheme }
    delete newScheme[categoryName]
    setGradingScheme(newScheme)
  }

  const updateCategory = (categoryName: string, field: "weight" | "count", value: number) => {
    setGradingScheme({
      ...gradingScheme,
      [categoryName]: {
        ...gradingScheme[categoryName],
        [field]: value,
      },
    })
  }

  const totalWeight = Object.values(gradingScheme).reduce((sum, category) => sum + category.weight, 0)

  const handleSave = () => {
    if (totalWeight !== 100) {
      alert("Total weight must equal 100%")
      return
    }
    console.log("Saving grading scheme:", gradingScheme)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Grading Scheme</DialogTitle>
          <DialogDescription>
            {classData
              ? `Set up grading categories for ${classData.name} (${classData.code})`
              : "Configure grading scheme"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grading Categories</CardTitle>
              <CardDescription>
                Total Weight: {totalWeight}%{" "}
                {totalWeight !== 100 && <span className="text-red-500">(Must equal 100%)</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(gradingScheme).map(([categoryName, category]) => (
                <div key={categoryName} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="font-medium">{categoryName}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Weight:</Label>
                    <Input
                      type="number"
                      value={category.weight}
                      onChange={(e) => updateCategory(categoryName, "weight", Number.parseInt(e.target.value) || 0)}
                      className="w-16"
                      min="0"
                      max="100"
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Count:</Label>
                    <Input
                      type="number"
                      value={category.count}
                      onChange={(e) => updateCategory(categoryName, "count", Number.parseInt(e.target.value) || 1)}
                      className="w-16"
                      min="1"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeCategory(categoryName)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Add New Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Category</CardTitle>
              <CardDescription>Create a new assignment type for this class</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Quick Add Buttons for Standard Categories */}
              <div className="mb-4">
                <Label className="text-sm text-muted-foreground">Quick Add Standard Categories:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getSuggestedGradingCategories()
                    .filter(cat => !gradingScheme[cat.name])
                    .map((category) => (
                      <Button
                        key={category.name}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGradingScheme({
                            ...gradingScheme,
                            [category.name]: { weight: category.weight, count: category.count },
                          })
                        }}
                      >
                        + {category.name} ({category.weight}%)
                      </Button>
                    ))}
                </div>
              </div>
              
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <Label htmlFor="categoryName">Custom Category Name</Label>
                  <Input
                    id="categoryName"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., Project, Lab Report"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryWeight">Weight (%)</Label>
                  <Input
                    id="categoryWeight"
                    type="number"
                    value={newCategory.weight || ""}
                    onChange={(e) => setNewCategory({ ...newCategory, weight: Number.parseInt(e.target.value) || 0 })}
                    className="w-20"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryCount">Count</Label>
                  <Input
                    id="categoryCount"
                    type="number"
                    value={newCategory.count}
                    onChange={(e) => setNewCategory({ ...newCategory, count: Number.parseInt(e.target.value) || 1 })}
                    className="w-16"
                    min="1"
                  />
                </div>
                <Button onClick={addCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Grade Scale */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grade Scale</CardTitle>
              <CardDescription>Standard letter grade conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>A+:</span>
                    <span>97-100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>A:</span>
                    <span>93-96%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>A-:</span>
                    <span>90-92%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>B+:</span>
                    <span>87-89%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>B:</span>
                    <span>83-86%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>B-:</span>
                    <span>80-82%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>C+:</span>
                    <span>77-79%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>C:</span>
                    <span>73-76%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>C-:</span>
                    <span>70-72%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>D+:</span>
                    <span>67-69%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>D:</span>
                    <span>65-66%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>F:</span>
                    <span>Below 65%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={totalWeight !== 100}>
            Save Grading Scheme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
