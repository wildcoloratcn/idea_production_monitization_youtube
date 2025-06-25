import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

async function query(data: { inputs: string }) {
  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const result = await response.blob();
  return result;
}

export async function POST(request: NextRequest) {
  try {
    // Check if HF_TOKEN is configured
    if (!process.env.HF_TOKEN) {
      return NextResponse.json(
        { error: 'Hugging Face token not configured' },
        { status: 500 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { prompt } = body;

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Call the Hugging Face API
    const imageBlob = await query({ inputs: prompt });

    // Convert blob to buffer
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedPrompt = prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const filename = `${timestamp}_${sanitizedPrompt}.jpg`;
    
    // Define the file path
    const publicDir = path.join(process.cwd(), 'public', 'generated_images');
    const filePath = path.join(publicDir, filename);
    
    // Save the image to the filesystem
    await writeFile(filePath, buffer);
    
    // Return the public URL path
    const imageUrl = `/generated_images/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      filename: filename,
      prompt: prompt
    });

  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
} 