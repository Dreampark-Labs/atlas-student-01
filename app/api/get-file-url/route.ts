import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { auth } from '@clerk/nextjs/server';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    console.log('API route called: get-file-url');
    
    // Get the authenticated user
    const { userId } = await auth();
    console.log('Authenticated user ID:', userId);
    
    if (!userId) {
      console.log('No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized - No authenticated user' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Request body:', body);
    const { storageId } = body;

    if (!storageId) {
      console.log('No storage ID provided');
      return NextResponse.json(
        { error: 'Storage ID is required' },
        { status: 400 }
      );
    }

    console.log('Calling Convex with storageId:', storageId, 'userId:', userId);

    // Get the secure file URL from Convex
    const fileUrl = await convex.query(api.files.getFileUrlByStorageId, {
      storageId: storageId,
      userId: userId,
    });

    console.log('Got file URL from Convex:', fileUrl);

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('Error in get-file-url API route:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
