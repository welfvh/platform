import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const promptPath = join(process.cwd(), 'prompt.md');
    const content = readFileSync(promptPath, 'utf-8');
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Error reading prompt:', error);
    return new NextResponse('Prompt not found', { status: 404 });
  }
}
