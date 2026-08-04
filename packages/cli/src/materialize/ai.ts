// Materializer: packages/ai templates for the TS-monolith + AI-on
// composition (issue #17).
//
// Per decision 5, TS shapes ship AI as an embedded TS library in
// packages/ai — the composable primitives of decision 20: chat
// completion (with streaming), embeddings, a VectorStore interface
// (pgvector default, reusing decision 14's Postgres via @starter/db),
// and tool/function calling. Each primitive is a real typed layer over
// a vetted SDK (the `openai` package) — not a stub (decision 20).
// Per decision 20 NO example composition is shipped: composing the
// primitives into a product is the user's job. Per decision 21 the package is absent entirely when AI
// is off — a non-AI project carries zero AI dependency surface. Per
// decision 28 the package ships a zod-validated config.ts; the actual
// env parsing happens at the point of use (the package is a library,
// like @starter/auth).
//
// Per issue #27 the materializer is split by workspace; this module
// owns every file written into packages/ai for the AI-on composition.
//
// The package's unit tests exercise the primitives against a
// FakeProvider — a mocked-LLM round-trip is a unit test, not a CI
// integration (decision 29). The real provider is a thin layer over
// the vetted `openai` SDK (decision 20: real typed layers, not
// stubs).

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeAi(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  const aiDir = join(targetDir, 'packages/ai');
  await writeFileRecursive(join(aiDir, 'package.json'), aiPackageJson());
  await writeFileRecursive(join(aiDir, 'tsconfig.json'), aiTsconfigJson());
  await writeFileRecursive(join(aiDir, '.env.example'), aiEnvExample());
  await writeFileRecursive(join(aiDir, 'src/index.ts'), aiIndexTs());
  await writeFileRecursive(join(aiDir, 'src/types.ts'), aiTypesTs());
  await writeFileRecursive(join(aiDir, 'src/config.ts'), aiConfigTs());
  await writeFileRecursive(join(aiDir, 'src/provider.ts'), aiProviderTs());
  await writeFileRecursive(join(aiDir, 'src/chat.ts'), aiChatTs());
  await writeFileRecursive(join(aiDir, 'src/embeddings.ts'), aiEmbeddingsTs());
  await writeFileRecursive(join(aiDir, 'src/vector-store.ts'), aiVectorStoreTs());
  await writeFileRecursive(join(aiDir, 'src/tool-call.ts'), aiToolCallTs());
  await writeFileRecursive(join(aiDir, 'src/fakes.ts'), aiFakesTs());
  await writeFileRecursive(join(aiDir, 'src/chat.test.ts'), aiChatTestTs());
  await writeFileRecursive(join(aiDir, 'src/embeddings.test.ts'), aiEmbeddingsTestTs());
  await writeFileRecursive(join(aiDir, 'src/vector-store.test.ts'), aiVectorStoreTestTs());
  await writeFileRecursive(join(aiDir, 'src/tool-call.test.ts'), aiToolCallTestTs());
}

function aiPackageJson(): string {
  return JSON.stringify(
    {
      name: '@starter/ai',
      version: '0.1.0',
      private: true,
      type: 'module',
      main: './src/index.ts',
      scripts: {
        test: 'vitest run',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        '@starter/db': 'workspace:*',
        'drizzle-orm': '^0.36.0',
        openai: '^4.104.0',
        zod: '^3.23.0',
      },
      devDependencies: {
        '@types/node': '^24.13.3',
        typescript: '^5.9.3',
        vitest: '^4.1.10',
      },
    },
    null,
    2,
  ) + '\n';
}

function aiTsconfigJson(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        isolatedModules: true,
        noEmit: true,
      },
      include: ['src/**/*'],
    },
    null,
    2,
  ) + '\n';
}

function aiEnvExample(): string {
  return `# packages/ai — env surface (decision 28). The AI primitives are a
# library: config is read lazily at the point of use via
# readAiConfig(). Copy these vars into the CONSUMING workspace's .env
# (dev) or export them as real env vars (prod) — code never reads
# process.env directly (decision 28).
#
# The provider is a thin typed layer over the vetted \`openai\` SDK
# (decision 20). Leave OPENAI_BASE_URL unset for the default public
# endpoint; set it to a gateway (Azure OpenAI, a local vLLM/Ollama
# proxy, ...) when needed. The primitives fail with a clear error on
# first provider use when OPENAI_API_KEY is unset — the package does
# not need a key at import time.
OPENAI_API_KEY=
OPENAI_BASE_URL=
# Default model for chat completions when a call omits model.
OPENAI_MODEL=gpt-4o-mini
# Default model for embeddings when a call omits model.
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small
# Timeout for provider calls, in seconds.
OPENAI_TIMEOUT_SECONDS=60
`;
}

function aiTypesTs(): string {
  return `// @starter/ai — the wire types of the AI primitives (decision 20).
//
// The shapes mirror the OpenAI wire format (the vetted SDK these
// primitives wrap) so a provider swap is a thin shim.

/** The role of a message author: system, user, assistant, or tool. */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/** One message of the conversation. */
export interface ChatMessage {
  role: ChatRole;
  /** The text content of the message (null for tool-call assistant messages). */
  content: string | null;
  /** Tool calls made by an assistant message (tool/function calling). */
  toolCalls?: ToolCall[];
  /** For tool messages: the id of the tool call this result answers. */
  toolCallId?: string;
}

/** A function the model may call (tool/function calling, decision 20). */
export interface ToolDefinition {
  /** The name of the tool the model may call. */
  name: string;
  /** A description of what the tool does — the model uses it to decide when to call it. */
  description?: string;
  /** The JSON Schema of the tool's parameters. */
  parameters?: Record<string, unknown>;
}

/** A concrete tool invocation returned by the model. */
export interface ToolCall {
  /** The id of the tool call. */
  id: string;
  /** The name of the tool to call. */
  name: string;
  /** JSON-encoded arguments for the tool. */
  arguments: string;
}

/** A partial tool call delta in a streamed chunk. */
export interface StreamingToolCall {
  /** The index of the tool call this delta belongs to. */
  index: number;
  /** The id of the tool call (set on the first delta). */
  id: string | null;
  /** The tool name (set on the first delta). */
  name: string | null;
  /** The JSON-encoded arguments fragment so far. */
  arguments: string | null;
}

/** Token accounting for a completion. */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** The non-streaming result of a chat completion. */
export interface ChatCompletion {
  id: string;
  model: string;
  /** The assistant message (carries toolCalls when the model chose to call). */
  message: ChatMessage;
  /** Why the completion stopped: stop, length, tool_calls, ... */
  finishReason: string | null;
  usage: Usage | null;
}

/** One SSE-style chunk of a streamed completion. */
export interface ChatChunk {
  id: string;
  model: string;
  /** The incremental text delta of this chunk. */
  content: string | null;
  /** Tool call deltas (tool/function calling while streaming). */
  toolCalls: StreamingToolCall[] | null;
  finishReason: string | null;
}

/** One embedded input. */
export interface Embedding {
  /** The index of the input this embedding corresponds to. */
  index: number;
  /** The embedding vector. */
  vector: number[];
}

/** A vector to store (upsert) or a stored vector's metadata. */
export interface VectorRecord {
  /** The unique id of the record. */
  id: string;
  /** The embedding vector. */
  vector: number[];
  /** Arbitrary metadata stored alongside the vector. */
  metadata?: Record<string, unknown> | null;
}

/** One nearest-neighbour hit. */
export interface VectorSearchResult {
  id: string;
  /** Cosine similarity — higher is closer (1.0 = identical direction). */
  score: number;
  metadata: Record<string, unknown> | null;
}
`;
}

function aiConfigTs(): string {
  return `// @starter/ai — zod-validated config (decision 28).
//
// Exports the schema + a read function, mirroring @starter/auth and
// @starter/db: the package is a library, so nothing is parsed eagerly
// at import time — consuming workspaces call readAiConfig() at the
// point they need the config (with their own env-loaded process.env,
// e.g. via dotenv). Code never reads process.env directly (decision 28).
//
// OPENAI_API_KEY is optional at parse time on purpose: the package
// exposes primitives, and a provider key is only needed per-call. The
// provider raises a clear error on first use when the key is unset
// (see provider.ts) — the same optional-but-owned discipline as the
// Python AI service's boot-without-a-key posture.

import { z } from 'zod';

export const aiConfigSchema = z.object({
  /** The LLM API key. Optional at parse time; required at provider use. */
  openaiApiKey: z
    .string()
    .min(1, 'OPENAI_API_KEY must not be empty')
    .optional(),
  /** Override the provider endpoint (Azure OpenAI, a local proxy, ...). */
  openaiBaseUrl: z.string().url('OPENAI_BASE_URL must be a valid URL').optional(),
  /** Default model for chat completions when a call omits model. */
  openaiModel: z.string().min(1).default('gpt-4o-mini'),
  /** Default model for embeddings when a call omits model. */
  openaiEmbeddingsModel: z.string().min(1).default('text-embedding-3-small'),
  /** Timeout for provider calls, in seconds. */
  openaiTimeoutSeconds: z.coerce.number().positive().default(60),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;

/**
 * Read the AI config from a given env source. Defaults to process.env.
 * Each consuming workspace calls this with its loaded env to get a
 * fully-typed config object.
 */
export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  return aiConfigSchema.parse({
    openaiApiKey: env.OPENAI_API_KEY || undefined,
    openaiBaseUrl: env.OPENAI_BASE_URL || undefined,
    openaiModel: env.OPENAI_MODEL,
    openaiEmbeddingsModel: env.OPENAI_EMBEDDINGS_MODEL,
    openaiTimeoutSeconds: env.OPENAI_TIMEOUT_SECONDS,
  });
}
`;
}

function aiProviderTs(): string {
  return `// @starter/ai — the provider seam + the real default.
//
// Decision 20: each primitive is a real typed layer over a vetted SDK,
// not a stub. The default provider wraps the \`openai\` package (the
// canonical vetted SDK for chat completions + embeddings). Tests swap
// in a FakeProvider (src/fakes.ts) — a chatComplete round-trip against
// a mocked LLM is a unit test, not a CI integration (decision 29).
//
// The client is constructed lazily so importing the package never
// requires a key; the first call without OPENAI_API_KEY fails with a
// clear message instead of a stack of SDK noise.

import OpenAI from 'openai';
import type { AiConfig } from './config.js';
import type {
  ChatChunk,
  ChatCompletion,
  ChatMessage,
  Embedding,
  StreamingToolCall,
  ToolCall,
  ToolDefinition,
  Usage,
} from './types.js';

/** The normalized request the primitives send to a provider. */
export interface ChatCompleteRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  tools?: ToolDefinition[];
  toolChoice?: string;
}

/** The normalized embeddings request the primitives send to a provider. */
export interface EmbedRequest {
  model: string;
  input: string | string[];
}

/** The seam the primitives depend on (chat + embeddings). */
export interface AIProvider {
  complete(req: ChatCompleteRequest): Promise<ChatCompletion>;
  stream(req: ChatCompleteRequest): AsyncIterable<ChatChunk>;
  embed(req: EmbedRequest): Promise<Embedding[]>;
}

function toOpenAiMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
    switch (m.role) {
      case 'tool':
        return { role: 'tool', content: m.content ?? '', tool_call_id: m.toolCallId! };
      case 'assistant': {
        const msg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: m.content ?? null,
        };
        if (m.toolCalls?.length) {
          msg.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          }));
        }
        return msg;
      }
      case 'system':
        return { role: 'system', content: m.content ?? '' };
      case 'user':
        return { role: 'user', content: m.content ?? '' };
    }
  });
}

function toToolDefinitions(tools: ToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters ?? { type: 'object', properties: {} },
    },
  }));
}

function toToolCalls(toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]): ToolCall[] {
  return toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));
}

function toUsage(usage: OpenAI.Completions.CompletionUsage): Usage {
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

/**
 * A thin typed layer over the vetted \`openai\` SDK (decision 20).
 * The client is created lazily so the package never needs a key at
 * import time; the first call without OPENAI_API_KEY fails with a
 * clear message.
 */
export class OpenAIProvider implements AIProvider {
  private readonly config: AiConfig;
  private client: OpenAI | null = null;

  constructor(config: AiConfig) {
    this.config = config;
  }

  private clientFor(): OpenAI {
    if (!this.client) {
      if (!this.config.openaiApiKey) {
        throw new Error(
          'packages/ai: OPENAI_API_KEY is not set — copy packages/ai/.env.example into your ' +
            'consuming workspace and set OPENAI_API_KEY (the AI primitives cannot call a ' +
            'provider without a key)',
        );
      }
      this.client = new OpenAI({
        apiKey: this.config.openaiApiKey,
        baseURL: this.config.openaiBaseUrl,
        timeout: Math.round(this.config.openaiTimeoutSeconds * 1000),
      });
    }
    return this.client;
  }

  async complete(req: ChatCompleteRequest): Promise<ChatCompletion> {
    const client = this.clientFor();
    const completion = await client.chat.completions.create({
      model: req.model,
      messages: toOpenAiMessages(req.messages),
      stream: false,
      temperature: req.temperature,
      tools: req.tools?.length ? toToolDefinitions(req.tools) : undefined,
      tool_choice: req.toolChoice as OpenAI.Chat.ChatCompletionToolChoiceOption | undefined,
    });
    const choice = completion.choices[0];
    return {
      id: completion.id,
      model: completion.model,
      message: {
        role: 'assistant',
        content: choice.message.content,
        toolCalls: choice.message.tool_calls ? toToolCalls(choice.message.tool_calls) : undefined,
      },
      finishReason: choice.finish_reason ?? null,
      usage: completion.usage ? toUsage(completion.usage) : null,
    };
  }

  async *stream(req: ChatCompleteRequest): AsyncIterable<ChatChunk> {
    const client = this.clientFor();
    const stream = await client.chat.completions.create({
      model: req.model,
      messages: toOpenAiMessages(req.messages),
      stream: true,
      temperature: req.temperature,
      tools: req.tools?.length ? toToolDefinitions(req.tools) : undefined,
      tool_choice: req.toolChoice as OpenAI.Chat.ChatCompletionToolChoiceOption | undefined,
    });
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const deltas = choice.delta.tool_calls?.map((tc) => ({
        index: tc.index,
        id: tc.id ?? null,
        name: tc.function?.name ?? null,
        arguments: tc.function?.arguments ?? null,
      })) as StreamingToolCall[] | null;
      yield {
        id: chunk.id,
        model: chunk.model,
        content: choice.delta.content ?? null,
        toolCalls: deltas,
        finishReason: choice.finish_reason ?? null,
      };
    }
  }

  async embed(req: EmbedRequest): Promise<Embedding[]> {
    const client = this.clientFor();
    const response = await client.embeddings.create({
      model: req.model,
      input: req.input,
    });
    return response.data.map((d) => ({ index: d.index, vector: d.embedding }));
  }
}
`;
}

function aiChatTs(): string {
  return `// @starter/ai — chat completion primitive (with streaming, decision 20).
//
// \`chatComplete(messages, opts)\` is a real typed layer over the
// vetted \`openai\` SDK (via OpenAIProvider). When \`opts.stream\` is
// true it returns an AsyncIterable of chunks (the streaming form of
// the same primitive); otherwise it returns the full completion.
// The provider is swappable (opts.provider) — tests use a
// FakeProvider, and a provider swap (Anthropic, a local model, ...)
// is a thin shim behind the same seam.

import { readAiConfig, type AiConfig } from './config.js';
import { OpenAIProvider, type AIProvider } from './provider.js';
import type { ChatChunk, ChatCompletion, ChatMessage, ToolDefinition } from './types.js';

export interface ChatCompleteOptions {
  /** Model id. Defaults to the configured OPENAI_MODEL. */
  model?: string;
  /** Sampling temperature (0..2). */
  temperature?: number;
  /** Functions the model may call (tool/function calling). */
  tools?: ToolDefinition[];
  /** Which tool to force: 'auto', 'none', or a tool name. */
  toolChoice?: string;
  /** When true, returns an AsyncIterable of streamed chunks instead of the completion. */
  stream?: boolean;
  /** Override the config (defaults to readAiConfig()). */
  config?: AiConfig;
  /** Override the provider (defaults to OpenAIProvider(config)). */
  provider?: AIProvider;
}

export function chatComplete(
  messages: ChatMessage[],
  opts: ChatCompleteOptions & { stream: false },
): Promise<ChatCompletion>;
export function chatComplete(
  messages: ChatMessage[],
  opts: ChatCompleteOptions & { stream: true },
): AsyncIterable<ChatChunk>;
export function chatComplete(
  messages: ChatMessage[],
  opts?: ChatCompleteOptions,
): Promise<ChatCompletion>;
export function chatComplete(
  messages: ChatMessage[],
  opts: ChatCompleteOptions = {},
): Promise<ChatCompletion> | AsyncIterable<ChatChunk> {
  const config = opts.config ?? readAiConfig();
  const provider = opts.provider ?? new OpenAIProvider(config);
  const request = {
    model: opts.model ?? config.openaiModel,
    messages,
    temperature: opts.temperature,
    tools: opts.tools,
    toolChoice: opts.toolChoice,
  };
  if (opts.stream) {
    return provider.stream(request);
  }
  return provider.complete(request);
}
`;
}

function aiEmbeddingsTs(): string {
  return `// @starter/ai — embeddings primitive (decision 20).
//
// \`embed(texts)\` is a real typed layer over the vetted \`openai\` SDK
// (via OpenAIProvider): a single string or a list of strings in,
// one embedding vector per input out.

import { readAiConfig, type AiConfig } from './config.js';
import { OpenAIProvider, type AIProvider } from './provider.js';
import type { Embedding } from './types.js';

export interface EmbedOptions {
  /** Model id. Defaults to the configured OPENAI_EMBEDDINGS_MODEL. */
  model?: string;
  /** Override the config (defaults to readAiConfig()). */
  config?: AiConfig;
  /** Override the provider (defaults to OpenAIProvider(config)). */
  provider?: AIProvider;
}

export async function embed(
  texts: string | string[],
  opts: EmbedOptions = {},
): Promise<Embedding[]> {
  const config = opts.config ?? readAiConfig();
  const provider = opts.provider ?? new OpenAIProvider(config);
  return provider.embed({
    model: opts.model ?? config.openaiEmbeddingsModel,
    input: texts,
  });
}
`;
}

function aiVectorStoreTs(): string {
  return `// @starter/ai — the VectorStore primitive (decision 20).
//
// The interface is the seam; the default implementation is pgvector
// backed, reusing decision 14's Postgres through @starter/db (the
// embeddings table + the 0003_embeddings migration live in
// packages/db). The table stores vectors with a fixed dimension
// (1536 — the default embeddings model's output size); changing the
// embedding model to a different dimension means a new column/migration
// — a documented seam, not something the store hides.
//
// \`search\` ranks by cosine similarity (\`1 - (a <=> b)\`); the
// migration ships an HNSW index over the vector column
// (vector_cosine_ops) so nearest-neighbour lookups stay fast at
// scale. The unit tests exercise \`cosineSimilarity\` (pure) always
// and the pgvector store against a real Postgres when DATABASE_URL is
// set — repo tests skip cleanly when it's unset (the scaffold's
// standard DB discipline).

import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { embeddingsTable, getPool } from '@starter/db';
import type { VectorRecord, VectorSearchResult } from './types.js';

/** The persistence seam for embedding vectors (decision 20). */
export interface VectorStore {
  /** Insert or replace records by id. */
  upsert(records: VectorRecord[]): Promise<void>;
  /** Return the topK nearest neighbours by cosine similarity. */
  search(vector: number[], topK?: number): Promise<VectorSearchResult[]>;
}

/**
 * Cosine similarity in the unit ball: 1.0 = identical direction,
 * 0.0 = orthogonal, -1.0 = opposite. Throws on dimension mismatch —
 * a wrong-dimension vector is a caller bug, never silently degraded.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(\`vector dimension mismatch: \${a.length} vs \${b.length}\`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * The pgvector default VectorStore (decision 20/14): upserts into the
 * shared \`embeddings\` table (packages/db, migration 0003) and
 * searches by cosine similarity via the \`<->\`-family operator
 * \`1 - (a <=> b)\`. Uses the shared pg pool from @starter/db (the
 * pool is a process singleton; the schema registry is per-store).
 */
export class PgVectorStore implements VectorStore {
  private readonly db: NodePgDatabase<{ embeddings: typeof embeddingsTable }>;

  constructor(connectionString: string) {
    this.db = drizzle(getPool({ connectionString }), {
      schema: { embeddings: embeddingsTable },
    });
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    await this.db
      .insert(embeddingsTable)
      .values(
        records.map((r) => ({
          id: r.id,
          vector: r.vector,
          metadata: r.metadata ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: embeddingsTable.id,
        set: {
          vector: sql\`excluded.\${embeddingsTable.vector}\`,
          metadata: sql\`excluded.\${embeddingsTable.metadata}\`,
        },
      });
  }

  async search(vector: number[], topK = 5): Promise<VectorSearchResult[]> {
    // Cosine similarity, higher is closer: 1 - (a <=> b). The same
    // expression drives both the select and the orderBy so the rank
    // matches the returned score.
    const similarity = sql<number>\`1 - (\${embeddingsTable.vector} <=> \${vector}::vector)\`;
    const rows = await this.db
      .select({
        id: embeddingsTable.id,
        score: similarity,
        metadata: embeddingsTable.metadata,
      })
      .from(embeddingsTable)
      .orderBy(similarity)
      .limit(topK);
    return rows.map((r) => ({
      id: r.id,
      score: r.score,
      metadata: (r.metadata ?? null) as Record<string, unknown> | null,
    }));
  }
}
`;
}

function aiToolCallTs(): string {
  return `// @starter/ai — the tool/function-calling primitive (decision 20).
//
// Two halves:
//
//   1. \`toolCall(tools, message)\` sends the ToolDefinitions with the
//      conversation and returns the model's tool calls — the model's
//      side of function calling. It returns an empty array when the
//      model chose not to call a tool.
//   2. \`ToolRegistry\` is the USER's side: bind your functions to tool
//      names and run the model's tool calls against them. It is a
//      shipped primitive, not a wired product — executing tool calls
//      is the first step of an agentic composition, and composing is
//      the user's job (decision 20: no example composition).
//
// Both are real typed layers over the vetted \`openai\` SDK (via
// OpenAIProvider).

import { readAiConfig, type AiConfig } from './config.js';
import { OpenAIProvider, type AIProvider } from './provider.js';
import type { ChatMessage, ToolCall, ToolDefinition } from './types.js';

export interface ToolCallOptions {
  /** Model id. Defaults to the configured OPENAI_MODEL. */
  model?: string;
  /** Sampling temperature (0..2). */
  temperature?: number;
  /** Which tool to force: 'auto' (default), 'none', or a tool name. */
  toolChoice?: string;
  /** Override the config (defaults to readAiConfig()). */
  config?: AiConfig;
  /** Override the provider (defaults to OpenAIProvider(config)). */
  provider?: AIProvider;
}

/**
 * Ask the model which of \`tools\` to call for \`message\` (a single
 * message or the full conversation). Returns the model's tool calls
 * ([] when it answered directly). Feed the results back as
 * \`role: 'tool'\` messages (with \`toolCallId\`) and loop — that
 * loop is an agentic composition, which is yours to build
 * (decision 20).
 */
export async function toolCall(
  tools: ToolDefinition[],
  message: ChatMessage | ChatMessage[],
  opts: ToolCallOptions = {},
): Promise<ToolCall[]> {
  const messages = Array.isArray(message) ? message : [message];
  const config = opts.config ?? readAiConfig();
  const provider = opts.provider ?? new OpenAIProvider(config);
  const completion = await provider.complete({
    model: opts.model ?? config.openaiModel,
    messages,
    tools,
    toolChoice: opts.toolChoice ?? 'auto',
    temperature: opts.temperature,
  });
  return completion.message.toolCalls ?? [];
}

/** A tool function receives the parsed JSON arguments of the model's call. */
export type ToolFunction = (args: unknown) => unknown;

/**
 * Binds your functions to tool names and runs the model's ToolCalls.
 * Register your project's functions, then feed the tool_calls from
 * \`toolCall\` through \`run\` and push the results back as
 * assistant/tool messages — that loop is an agentic composition,
 * which is yours to build (decision 20).
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolFunction>();

  /** Bind \`fn\` to the tool name the model may call. */
  register(name: string, fn: ToolFunction): void {
    this.tools.set(name, fn);
  }

  /** Build the ToolDefinition to send with a chat completion or toolCall. */
  definition(
    name: string,
    description?: string,
    parameters?: Record<string, unknown>,
  ): ToolDefinition {
    return { name, description, parameters };
  }

  /**
   * Execute a model ToolCall against the registered function. Throws
   * for an unregistered tool name and propagates the function's own
   * errors — an unhandled tool is a caller bug, not something to
   * paper over.
   */
  run(call: ToolCall): unknown {
    const fn = this.tools.get(call.name);
    if (!fn) {
      throw new Error(\`no tool registered with name '\${call.name}'\`);
    }
    return fn(JSON.parse(call.arguments));
  }
}
`;
}

function aiIndexTs(): string {
  return `// @starter/ai — the composable AI primitives (decision 20):
// chat completion (with streaming), embeddings, a VectorStore
// interface (pgvector default), and tool/function calling. Each is a
// real typed layer over a vetted SDK — not a stub. Composing them
// into a product is YOUR job, project-by-project: no example
// composition is shipped (decision 20).

export { chatComplete, type ChatCompleteOptions } from './chat.js';
export { embed, type EmbedOptions } from './embeddings.js';
export {
  cosineSimilarity,
  PgVectorStore,
  type VectorStore,
} from './vector-store.js';
export { toolCall, ToolRegistry, type ToolCallOptions, type ToolFunction } from './tool-call.js';
export { readAiConfig, aiConfigSchema, type AiConfig } from './config.js';
export type {
  ChatChunk,
  ChatCompletion,
  ChatMessage,
  ChatRole,
  Embedding,
  StreamingToolCall,
  ToolCall,
  ToolDefinition,
  Usage,
  VectorRecord,
  VectorSearchResult,
} from './types.js';
`;
}

function aiFakesTs(): string {
  return `// @starter/ai — the FakeProvider: a deterministic stand-in for the
// vetted openai SDK used by the unit tests. Decision 29: a
// chatComplete round-trip against a mocked LLM is a unit test, not a
// CI integration — the real provider is exercised only by a real
// deployment. Not exported from the package barrel.

import type { AIProvider, ChatCompleteRequest, EmbedRequest } from './provider.js';
import type { ChatChunk, ChatCompletion, Embedding } from './types.js';

export class FakeProvider implements AIProvider {
  /** Records every request so tests can assert what the primitives sent. */
  requests: Array<ChatCompleteRequest | EmbedRequest> = [];

  async complete(req: ChatCompleteRequest): Promise<ChatCompletion> {
    this.requests.push(req);
    if (req.tools?.length) {
      return {
        id: 'chatcmpl_fake_1',
        model: req.model,
        message: {
          role: 'assistant',
          content: null,
          toolCalls: [
            { id: 'call_fake_1', name: req.tools[0].name, arguments: '{"query": "the starter"}' },
          ],
        },
        finishReason: 'tool_calls',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };
    }
    return {
      id: 'chatcmpl_fake_1',
      model: req.model,
      message: { role: 'assistant', content: 'Hello from the fake provider!' },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };
  }

  async *stream(req: ChatCompleteRequest): AsyncIterable<ChatChunk> {
    this.requests.push(req);
    if (req.tools?.length) {
      const name = req.tools[0].name;
      yield {
        id: 'chatcmpl_fake_stream',
        model: 'fake-model',
        content: null,
        toolCalls: [{ index: 0, id: 'call_fake_stream_1', name, arguments: '' }],
        finishReason: null,
      };
      yield {
        id: 'chatcmpl_fake_stream',
        model: 'fake-model',
        content: null,
        toolCalls: [{ index: 0, id: null, name: null, arguments: '{"query": "x"}' }],
        finishReason: null,
      };
      yield {
        id: 'chatcmpl_fake_stream',
        model: 'fake-model',
        content: null,
        toolCalls: null,
        finishReason: 'stop',
      };
      return;
    }
    for (const piece of ['Hello', ' from ', 'the fake provider!']) {
      yield {
        id: 'chatcmpl_fake_stream',
        model: 'fake-model',
        content: piece,
        toolCalls: null,
        finishReason: null,
      };
    }
    yield {
      id: 'chatcmpl_fake_stream',
      model: 'fake-model',
      content: null,
      toolCalls: null,
      finishReason: 'stop',
    };
  }

  async embed(req: EmbedRequest): Promise<Embedding[]> {
    this.requests.push(req);
    const inputs = typeof req.input === 'string' ? [req.input] : req.input;
    return inputs.map((_, i) => ({ index: i, vector: [1.0, 2.0, 3.0] }));
  }
}
`;
}

function aiChatTestTs(): string {
  return `// @starter/ai — chat completion primitive unit tests (decision 22).
//
// Exercised against the FakeProvider: a mocked-LLM round-trip is a
// unit test, not a CI integration (decision 29). The fake is a real
// seam — no SDK mocking.

import { describe, expect, it } from 'vitest';
import { chatComplete } from './chat.js';
import { FakeProvider } from './fakes.js';
import type { ChatMessage } from './types.js';

const messages: ChatMessage[] = [{ role: 'user', content: 'hi' }];

describe('chatComplete', () => {
  it('returns the provider completion for a plain conversation', async () => {
    const fake = new FakeProvider();
    const completion = await chatComplete(messages, { provider: fake });
    expect(completion.message.content).toBe('Hello from the fake provider!');
    expect(completion.finishReason).toBe('stop');
    expect(completion.usage?.totalTokens).toBe(15);
    // The primitive forwarded exactly what it received.
    const sent = fake.requests[0] as Parameters<typeof fake.complete>[0];
    expect(sent.messages).toEqual(messages);
  });

  it('forwards tools and returns the model tool calls', async () => {
    const fake = new FakeProvider();
    const completion = await chatComplete(messages, {
      provider: fake,
      tools: [
        {
          name: 'search',
          description: 'Search the docs',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string' } },
          },
        },
      ],
    });
    expect(completion.message.toolCalls?.[0]?.name).toBe('search');
    expect(JSON.parse(completion.message.toolCalls![0]!.arguments)).toEqual({ query: 'the starter' });
    expect(completion.finishReason).toBe('tool_calls');
  });

  it('streams chunks when stream: true', async () => {
    const fake = new FakeProvider();
    const chunks = await chatComplete(messages, { provider: fake, stream: true });
    const contents: string[] = [];
    for await (const chunk of chunks) {
      if (chunk.content) contents.push(chunk.content);
    }
    expect(contents.join('')).toBe('Hello from the fake provider!');
  });

  it('streams tool-call deltas when tools are given', async () => {
    const fake = new FakeProvider();
    const chunks = await chatComplete(messages, {
      provider: fake,
      stream: true,
      tools: [{ name: 'search', description: 'Search the docs' }],
    });
    const calls: string[] = [];
    for await (const chunk of chunks) {
      for (const tc of chunk.toolCalls ?? []) {
        if (tc.name) calls.push(tc.name);
        if (tc.arguments) calls.push(tc.arguments);
      }
    }
    expect(calls).toEqual(['search', '{"query": "x"}']);
  });
});
`;
}

function aiEmbeddingsTestTs(): string {
  return `// @starter/ai — embeddings primitive unit tests (decision 22).
//
// Exercised against the FakeProvider (decision 29: mocked-LLM
// round-trips are unit tests).

import { describe, expect, it } from 'vitest';
import { embed } from './embeddings.js';
import { FakeProvider } from './fakes.js';

describe('embed', () => {
  it('embeds a single string', async () => {
    const fake = new FakeProvider();
    const embeddings = await embed('hello', { provider: fake });
    expect(embeddings).toHaveLength(1);
    expect(embeddings[0]!.vector).toEqual([1.0, 2.0, 3.0]);
    const sent = fake.requests[0] as { input: string | string[]; model: string };
    expect(sent.input).toBe('hello');
  });

  it('embeds a list of strings, one vector per input', async () => {
    const fake = new FakeProvider();
    const embeddings = await embed(['a', 'b', 'c'], { provider: fake });
    expect(embeddings.map((e) => e.index)).toEqual([0, 1, 2]);
  });
});
`;
}

function aiVectorStoreTestTs(): string {
  return `// @starter/ai — VectorStore primitive unit tests (decision 22).
//
// cosineSimilarity is pure and always tested. PgVectorStore is the
// pgvector-backed default (decision 20/14): its repo tests need a
// real Postgres and skip cleanly when DATABASE_URL is unset (the
// scaffold's standard DB discipline). No SDK or db mocking.

import { describe, expect, it } from 'vitest';
import { cosineSimilarity, PgVectorStore } from './vector-store.js';

describe('cosineSimilarity', () => {
  it('ranks similar vectors higher', () => {
    expect(cosineSimilarity([1.0, 0.0], [1.0, 0.0])).toBe(1.0);
    expect(cosineSimilarity([1.0, 0.0], [0.0, 1.0])).toBe(0.0);
    expect(cosineSimilarity([1.0, 0.0], [-1.0, 0.0])).toBe(-1.0);
    expect(Math.abs(cosineSimilarity([1.0, 1.0], [2.0, 2.0]) - 1.0)).toBeLessThan(1e-9);
  });

  it('throws on a dimension mismatch (a caller bug, never silently degraded)', () => {
    expect(() => cosineSimilarity([1.0], [1.0, 2.0])).toThrow(/dimension mismatch/);
  });
});

const DATABASE_URL = process.env.DATABASE_URL;
const describeDb = DATABASE_URL ? describe : describe.skip;

describeDb('PgVectorStore (requires DATABASE_URL — migration 0003 embeds the pgvector extension)', () => {
  it('upserts and searches by cosine similarity', async () => {
    const store = new PgVectorStore(DATABASE_URL!);
    await store.upsert([
      { id: 'doc-fruit', vector: [1.0, 0.0, 0.0], metadata: { kind: 'fruit' } },
      { id: 'doc-car', vector: [0.0, 1.0, 0.0], metadata: { kind: 'vehicle' } },
    ]);
    const results = await store.search([0.9, 0.1, 0.0], 2);
    expect(results.map((r) => r.id)).toEqual(['doc-fruit', 'doc-car']);
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    expect(results[0]!.metadata).toEqual({ kind: 'fruit' });
  });

  it('upsert replaces by id', async () => {
    const store = new PgVectorStore(DATABASE_URL!);
    await store.upsert([{ id: 'doc-a', vector: [1.0, 0.0, 0.0] }]);
    await store.upsert([{ id: 'doc-a', vector: [0.0, 1.0, 0.0] }]);
    const results = await store.search([0.0, 1.0, 0.0], 1);
    expect(results[0]!.id).toBe('doc-a');
  });
});
`;
}

function aiToolCallTestTs(): string {
  return `// @starter/ai — tool/function-calling primitive unit tests (decision 22).
//
// toolCall is exercised against the FakeProvider; ToolRegistry is the
// user side and is tested directly (decision 29).

import { describe, expect, it } from 'vitest';
import { FakeProvider } from './fakes.js';
import { toolCall, ToolRegistry } from './tool-call.js';

describe('toolCall', () => {
  it('returns the model tool calls for the given tools', async () => {
    const fake = new FakeProvider();
    const calls = await toolCall(
      [{ name: 'search', description: 'Search the docs' }],
      [{ role: 'user', content: 'search for the starter' }],
      { provider: fake },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.name).toBe('search');
    expect(JSON.parse(calls[0]!.arguments)).toEqual({ query: 'the starter' });
  });

  it('returns an empty array when the model answers directly', async () => {
    const fake = new FakeProvider();
    const calls = await toolCall([], [{ role: 'user', content: 'hi' }], { provider: fake });
    expect(calls).toEqual([]);
  });
});

describe('ToolRegistry', () => {
  it('registers and runs a tool by name', () => {
    const registry = new ToolRegistry();
    registry.register('add', (args) => {
      const { a, b } = args as { a: number; b: number };
      return a + b;
    });
    const result = registry.run({
      id: 'call_1',
      name: 'add',
      arguments: '{"a": 2, "b": 3}',
    });
    expect(result).toBe(5);
  });

  it('builds the ToolDefinition with the parameters schema', () => {
    const registry = new ToolRegistry();
    const definition = registry.definition('add', 'Add two numbers', {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
    });
    expect(definition.name).toBe('add');
    expect(definition.description).toBe('Add two numbers');
    expect(definition.parameters?.type).toBe('object');
  });

  it('throws for an unregistered tool name', () => {
    const registry = new ToolRegistry();
    expect(() =>
      registry.run({ id: 'call_1', name: 'nope', arguments: '{}' }),
    ).toThrow(/no tool registered/);
  });

  it('propagates the tool function errors', () => {
    const registry = new ToolRegistry();
    registry.register('boom', () => {
      throw new Error('kaboom');
    });
    expect(() => registry.run({ id: 'call_1', name: 'boom', arguments: '{}' })).toThrow('kaboom');
  });
});
`;
}
