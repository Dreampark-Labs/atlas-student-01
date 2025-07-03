"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EditClassDialog } from "@/components/edit-class-dialog"

// Mock class data for testing
const mockClassData = {
  _id: "test-id" as any,
  _creationTime: Date.now(),
  name: "Test Class",
  code: "TEST-101",
  professor: "Dr. Test",
  credits: 3,
  color: "bg-blue-500",
  description: "Test class description",
  userId: "test-user",
  termId: "test-term" as any,
  isDeleted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  assignments: { completed: 0, total: 0 },
  gradingScheme: {
    mode: "percentage" as const,
    categories: []
  }
}

export default function TestDialogPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dialog Test Page</h1>
      
      <Button onClick={() => setOpen(true)}>
        Open Edit Class Dialog
      </Button>

      <EditClassDialog 
        open={open}
        onOpenChange={setOpen}
        classData={mockClassData}
      />
    </div>
  )
}
