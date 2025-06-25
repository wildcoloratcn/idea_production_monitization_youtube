import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "AI Story Generator",
  },
});

export async function POST(request: NextRequest) {
  try {
    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { prompt, genre, length } = body;

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Create a detailed story generation prompt
    const systemPrompt = `You are a creative storyteller. Generate an engaging ${genre || 'general'} story based on the user's prompt. The story should be ${length || 'medium'} length (${getWordCount(length)} words approximately). Make it creative, engaging, and well-structured with a clear beginning, middle, and end.`;

    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat-v3-0324:free",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Generate a story based on this prompt: ${prompt}`
        }
      ],
      max_tokens: getMaxTokens(length),
      temperature: 0.8, // More creative
    });

    const story = completion.choices[0].message.content;

    if (!story) {
      throw new Error("No story content generated");
    }

    return NextResponse.json({
      success: true,
      story: story,
      prompt: prompt,
      genre: genre || 'general',
      length: length || 'medium',
      wordCount: story.split(' ').length
    });

  } catch (error) {
    console.error('Error generating story:', error);
    
    // Handle specific OpenAI/OpenRouter errors
    if (error instanceof Error) {
      if (error.message.includes('insufficient_quota') || error.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate story' },
      { status: 500 }
    );
  }
}

// Helper function to determine word count based on length
function getWordCount(length: string): string {
  switch (length) {
    case 'short':
      return '200-400';
    case 'medium':
      return '500-800';
    case 'long':
      return '1000-1500';
    default:
      return '500-800';
  }
}

// Helper function to determine max tokens based on length
function getMaxTokens(length: string): number {
  switch (length) {
    case 'short':
      return 600;
    case 'medium':
      return 1200;
    case 'long':
      return 2000;
    default:
      return 1200;
  }
}
