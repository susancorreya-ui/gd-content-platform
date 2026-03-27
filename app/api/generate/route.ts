import { NextRequest, NextResponse } from 'next/server';
import { generateContent, ContentType, BlogType, EmailSubtype, BLOG_FORMAT, EMAIL_SUBTYPE_PROMPTS } from '@/lib/agents';

export async function POST(req: NextRequest) {
  try {
    const { contentType, prompt, researchContext, newsArticleText, blogType, emailSubtype } = await req.json();

    if (!contentType || !prompt) {
      return NextResponse.json({ error: 'contentType and prompt are required' }, { status: 400 });
    }

    // Augment prompt for blog type
    let augmentedPrompt = prompt;
    if (contentType === 'blog' && blogType) {
      const formatInstructions = BLOG_FORMAT[blogType as BlogType];
      augmentedPrompt = `Blog format: ${formatInstructions}\n\n${prompt}`;
    }

    // Augment prompt for email subtype
    if (contentType === 'email' && emailSubtype) {
      const subtypeInstructions = EMAIL_SUBTYPE_PROMPTS[emailSubtype as EmailSubtype];
      augmentedPrompt = `${subtypeInstructions}\n\n${prompt}`;
    }

    const output = await generateContent(
      contentType as ContentType,
      augmentedPrompt,
      researchContext,
      newsArticleText
    );

    return NextResponse.json({ output });
  } catch (err: unknown) {
    console.error('[generate]', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
