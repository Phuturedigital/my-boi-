import { NextResponse } from 'next/server';
import { detectIntent } from '@/lib/intent';
import { matchWorkstream } from '@/lib/match';
import { formatAnswer } from '@/lib/format';
import { loadWorkstreams } from '@/lib/workstreams';
import { AskResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const question =
    typeof body === 'object' && body !== null && 'question' in body
      ? (body as { question: unknown }).question
      : undefined;

  if (typeof question !== 'string' || !question.trim()) {
    return NextResponse.json(
      { error: '`question` is required and must be a non-empty string.' },
      { status: 400 }
    );
  }

  const workstreams = await loadWorkstreams();

  const intent = detectIntent(question);
  const matched =
    intent === 'list' ? null : matchWorkstream(question, workstreams);

  if (intent !== 'list' && !matched) {
    const payload: AskResponse = {
      answer: 'Not in current scope.',
      matchedWorkstream: null,
      intent: 'out_of_scope',
    };
    return NextResponse.json(payload);
  }

  const payload: AskResponse = {
    answer: formatAnswer(intent, matched, workstreams),
    matchedWorkstream: matched?.name ?? null,
    intent,
  };
  return NextResponse.json(payload);
}
