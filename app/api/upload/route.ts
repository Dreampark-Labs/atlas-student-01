import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const uploadedFiles = []

    for (const file of files) {
      if (file.size === 0) continue

      // Generate unique filename
      const fileExtension = file.name.split('.').pop()
      const uniqueFilename = `${randomUUID()}.${fileExtension}`
      const filePath = join(uploadsDir, uniqueFilename)

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      uploadedFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: `/uploads/${uniqueFilename}`,
        uploadedAt: Date.now(),
      })
    }

    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles 
    })
  } catch (error) {
    console.error('Error uploading files:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}
