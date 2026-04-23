import { PRODUCT_LEARNING_PRODUCTS } from './products';
import { Intent, WorkstreamWithRelations } from './types';

const OUT_OF_SCOPE = 'Not in current scope.';

function uniqueNames(names: string[]): string[] {
  return Array.from(new Set(names.filter(Boolean)));
}

function lowerFirst(s: string): string {
  return s.length > 0 ? s[0].toLowerCase() + s.slice(1) : s;
}

function stripTrailingPeriod(s: string): string {
  return s.endsWith('.') ? s.slice(0, -1) : s;
}

export function formatAnswer(
  intent: Intent,
  workstream: WorkstreamWithRelations | null,
  allWorkstreams: WorkstreamWithRelations[]
): string {
  if (intent === 'list') {
    return allWorkstreams.map((w) => w.name).join('\n');
  }

  if (!workstream) return OUT_OF_SCOPE;

  const ownerName = workstream.owner?.full_name ?? 'Unknown';
  const teamNames = workstream.team.map((m) => m.full_name);

  switch (intent) {
    case 'owner':
      return ownerName;

    case 'shoutout':
      return uniqueNames([ownerName, ...teamNames]).join('\n');

    case 'detail': {
      const doing = workstream.what_is_being_done.map((d) => `- ${d}`).join('\n');
      const lines = [
        `What it is: ${workstream.description}`,
        `What is being done:`,
        doing,
        `Owner: ${ownerName}`,
        `Team: ${teamNames.join(', ')}`,
      ];
      if (workstream.slug === 'product-learning') {
        lines.push(`Products covered: ${PRODUCT_LEARNING_PRODUCTS.join(', ')}`);
      }
      return lines.join('\n');
    }

    case 'summary': {
      const focus = lowerFirst(stripTrailingPeriod(workstream.description));
      const doing = workstream.what_is_being_done
        .map((d) => lowerFirst(d))
        .join(', ');
      return `${workstream.name} is focused on ${focus}. Current work includes ${doing}. Owner: ${ownerName}.`;
    }

    default:
      return OUT_OF_SCOPE;
  }
}
