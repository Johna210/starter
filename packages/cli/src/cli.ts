// The runnable CLI core: takes argv, prompts the user, calls the
// materializer. Split from index.ts so it can be unit-tested without
// spawning a process.

import * as p from '@clack/prompts';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  type Ai,
  type Backend,
  type Composition,
  describeComposition,
  isImplemented,
  type Mobile,
  type Topology,
  type Web,
} from './composition.js';
import { materialize, UnimplementedCompositionError } from './materialize.js';
import { DEFAULT_ANSWERS, type PromptAnswers } from './prompts.js';

export interface RunCliOptions {
  /** Override the interactive prompts (used by tests and --yes flag). */
  answers?: PromptAnswers;
  /** When true, the function doesn't call process.exit on error. */
  noExit?: boolean;
  /** When true, don't actually materialize — just print what would be done. */
  dryRun?: boolean;
  /** Override the interactive prompt function (used by tests). */
  prompt?: PromptFn;
}

export type PromptFn = typeof defaultPrompt;

export type CliResult =
  | { ok: true; composition: Composition; targetDir: string; dryRun: boolean }
  | { ok: false; reason: 'usage' | 'cancel' | 'unimplemented' | 'error'; message: string; exitCode: number };

export const VERSION = '0.1.0';

const USAGE = 'Usage: create-fs-starter <project-name> [--yes] [--dry-run]';

export async function runCli(argv: string[], options: RunCliOptions = {}): Promise<CliResult> {
  const args = parseArgs(argv);
  if (args.help) {
    return { ok: false, reason: 'usage', message: helpText(), exitCode: 0 };
  }
  if (!args.target) {
    return { ok: false, reason: 'usage', message: USAGE, exitCode: 1 };
  }

  p.intro(`create-fs-starter v${VERSION}`);

  // Resolve answers — from --yes default, from --answers override, or via prompts.
  const prompt = options.prompt ?? defaultPrompt;
  const answers: PromptAnswers = options.answers
    ? { ...DEFAULT_ANSWERS, ...options.answers }
    : await prompt();

  const composition: Composition = answers;
  const targetDir = resolve(process.cwd(), args.target);

  if (!isImplemented(composition)) {
    const message = `This composition is not yet implemented: ${describeComposition(composition)}.\n` +
      `The CLI materializer ships one composition in this ticket; the other 23+ are ` +
      `scheduled for later issues. Please choose another combination.`;
    p.cancel(message);
    return { ok: false, reason: 'unimplemented', message, exitCode: 1 };
  }

  if (options.dryRun || args.dryRun) {
    p.outro(`(dry run) would materialize ${describeComposition(composition)} to ${targetDir}`);
    return { ok: true, composition, targetDir, dryRun: true };
  }

  if (args.yes) {
    p.log.warn(`Overwriting existing directory: ${targetDir}`);
    await rm(targetDir, { recursive: true, force: true });
  }
  await mkdir(targetDir, { recursive: true });

  await materialize({ targetDir, name: args.target }, composition);

  p.outro(`Done! Next steps:
  cd ${args.target}
  pnpm install
  task dev`);
  return { ok: true, composition, targetDir, dryRun: false };
}

// ---------- argument parsing ----------------------------------------------

interface ParsedArgs {
  target?: string;
  yes: boolean;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { yes: false, dryRun: false, help: false };
  for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') out.yes = true;
    else if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (!out.target) out.target = arg;
  }
  return out;
}

function helpText(): string {
  return `${USAGE}

Arguments:
  <project-name>          Name of the project to scaffold (also the directory name).

Options:
  --yes, -y               Overwrite an existing directory if present.
  --dry-run               Don't write any files; just print what would be done.
  --help, -h              Print this help.

Prompts (in order):
  1. backend-language     ts | go
  2. topology             monolith | microservices
  3. web variant          vite | next | tanstack-start
  4. mobile               expo | flutter | none
  5. AI                   on | off

For this ticket the implemented compositions are:
  - ts-monolith + vite + no-mobile + no-AI (shape 1)
  - ts-microservices + vite + no-mobile + no-AI (shape 2)
  - go-monolith + next + no-mobile + no-AI (shape 3 base: api + contract
    only; the web variant is scheduled)
All other combinations produce a friendly error.
`;
}

// ---------- default interactive prompt -------------------------------------

async function defaultPrompt(): Promise<PromptAnswers> {
  const backend = await p.select<Backend>({
    message: 'Backend language?',
    options: [
      { value: 'ts', label: 'TypeScript' },
      { value: 'go', label: 'Go' },
    ],
    initialValue: 'ts',
  });
  if (p.isCancel(backend)) throw new PromptCancelledError();

  const topology = await p.select<Topology>({
    message: 'Topology?',
    options: [
      { value: 'monolith', label: 'Monolith' },
      { value: 'microservices', label: 'Microservices' },
    ],
    initialValue: 'monolith',
  });
  if (p.isCancel(topology)) throw new PromptCancelledError();

  const web = await p.select<Web>({
    message: 'Web variant?',
    options: [
      { value: 'vite', label: 'Vite + TanStack' },
      { value: 'next', label: 'Next.js' },
      { value: 'tanstack-start', label: 'TanStack Start (not yet implemented)' },
    ],
    initialValue: 'vite',
  });
  if (p.isCancel(web)) throw new PromptCancelledError();

  const mobile = await p.select<Mobile>({
    message: 'Mobile?',
    options: [
      { value: 'none', label: 'No mobile' },
      { value: 'expo', label: 'Expo (React Native)' },
      { value: 'flutter', label: 'Flutter' },
    ],
    initialValue: 'none',
  });
  if (p.isCancel(mobile)) throw new PromptCancelledError();

  const ai = await p.select<Ai>({
    message: 'AI?',
    options: [
      { value: 'off', label: 'No' },
      { value: 'on', label: 'Yes' },
    ],
    initialValue: 'off',
  });
  if (p.isCancel(ai)) throw new PromptCancelledError();

  return { backend, topology, web, mobile, ai };
}

export class PromptCancelledError extends Error {
  constructor() {
    super('user cancelled');
    this.name = 'PromptCancelledError';
  }
}

export { UnimplementedCompositionError };
