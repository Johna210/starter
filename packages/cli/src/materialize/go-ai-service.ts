// Materializer: apps/ai templates for the Go-microservices + AI-on
// composition (issue #16).
//
// Per decision 5, Go-microservices (shape 4) is the ONE shape whose
// AI is a **Python/FastAPI service** — justified by Python's AI
// ecosystem advantage once the build is already polyglot. The AI
// service ships the composable primitives of decision 20 (chat
// completion with streaming, embeddings, a VectorStore interface,
// tool/function calling) over its own contract surface
// (packages/contract/openapi.ai.yaml, Python-generated); apps/api
// calls it through the generated Go client — never raw HTTP
// (decision 5: the AI service is called by the Go api, not by the
// web app directly). Per decision 20 NO example composition is
// shipped: composing the primitives into a product (RAG,
// recommendation, agentic) is the user's job. Per decision 21 the
// service is absent entirely when AI is off. Per decision 29 the
// service is tooled with ruff (+ ruff format) — one tool for Python.
//
// Per issue #27 the materializer is split by workspace; this module
// owns every file written into apps/ai for the AI-on composition.
//
// The service's unit tests (tests/) exercise the primitives against a
// FakeProvider — a mocked LLM round-trip is a unit test, not a CI
// integration (decision 29). The real provider is a thin layer over
// the vetted `openai` SDK (decision 20: real typed layers, not
// stubs).

import { join } from 'node:path';
import { type ProjectContext, writeFileRecursive } from './_shared.js';

export async function writeGoAiService(ctx: ProjectContext): Promise<void> {
  const { targetDir } = ctx;

  const aiDir = join(targetDir, 'apps/ai');
  await writeFileRecursive(join(aiDir, 'pyproject.toml'), pyprojectToml());
  await writeFileRecursive(join(aiDir, '.env.example'), envExample());
  await writeFileRecursive(join(aiDir, 'app/__init__.py'), '');
  await writeFileRecursive(join(aiDir, 'app/config.py'), configPy());
  await writeFileRecursive(join(aiDir, 'app/main.py'), mainPy());
  await writeFileRecursive(join(aiDir, 'app/primitives/__init__.py'), primitivesInitPy());
  await writeFileRecursive(join(aiDir, 'app/primitives/models.py'), modelsPy());
  await writeFileRecursive(join(aiDir, 'app/primitives/provider.py'), providerPy());
  await writeFileRecursive(join(aiDir, 'app/primitives/vector_store.py'), vectorStorePy());
  await writeFileRecursive(join(aiDir, 'app/primitives/tools.py'), toolsPy());
  await writeFileRecursive(join(aiDir, 'scripts/export_openapi.py'), exportOpenapiPy());
  await writeFileRecursive(join(aiDir, 'tests/__init__.py'), '');
  await writeFileRecursive(join(aiDir, 'tests/fakes.py'), fakesPy());
  await writeFileRecursive(join(aiDir, 'tests/test_chat.py'), testChatPy());
  await writeFileRecursive(join(aiDir, 'tests/test_embeddings.py'), testEmbeddingsPy());
  await writeFileRecursive(join(aiDir, 'tests/test_vector_store.py'), testVectorStorePy());
  await writeFileRecursive(join(aiDir, 'tests/test_tools.py'), testToolsPy());
  await writeFileRecursive(join(aiDir, 'tests/test_contract.py'), testContractPy());
}
function pyprojectToml(): string {
  return `# apps/ai — the Python/FastAPI AI service (shape 4 + AI on,
# decision 5/20). One lint/format tool for Python: ruff + ruff format
# (decision 29's one-tool discipline; replaces Black+isort+Flake8).
#
# The service ships composable primitives, not an assembled product
# (decision 20): chat completion (with streaming), embeddings, a
# VectorStore interface, tool/function calling. No example
# composition — composing them is the user's job.

[project]
name = "starter-ai"
version = "0.1.0"
description = "The scaffolded Python/FastAPI AI service (shape 4, decision 5/20): composable AI primitives over their own contract surface."
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115.0",
  "httpx>=0.27.0",
  "openai>=1.51.0",
  "pydantic-settings>=2.5.0",
  "uvicorn>=0.30.0",
]

[project.optional-dependencies]
# Decision 29: ruff is the one Python tool. pytest is the test runner.
# pyyaml powers scripts/export_openapi.py (contract generation).
dev = [
  "pytest>=8.0.0",
  "pyyaml>=6.0.1",
  "ruff>=0.6.0",
]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["app*"]

[tool.ruff]
line-length = 100
target-version = "py311"
src = ["app", "tests", "scripts"]

[tool.ruff.lint]
# E (pycodestyle) + F (pyflakes) + I (isort) + UP (pyupgrade) + B (bugbear):
# the consensus core. One tool for lint AND format (decision 29).
select = ["E", "F", "I", "UP", "B"]

[tool.pytest.ini_options]
testpaths = ["tests"]
`;
}
function envExample(): string {
  return `# apps/ai — env surface (decision 28). Copy to .env for dev; prod
# injects real env vars. The AI service is a primitive provider: it
# boots WITHOUT a key and fails on first provider use if OPENAI_API_KEY
# is unset — the same optional-but-owned discipline as api-auth's
# JWT_PRIVATE_KEY (an ephemeral/dev posture, not a prod one).
#
# The provider is a thin typed layer over the vetted \`openai\` SDK
# (decision 20). Leave OPENAI_BASE_URL unset for the default public
# endpoint; set it to a gateway (Azure OpenAI, a local vLLM/Ollama
# proxy, ...) when needed.
OPENAI_API_KEY=
OPENAI_BASE_URL=
# Default model for chat completions when a request omits model.
OPENAI_MODEL=gpt-4o-mini
# Default model for embeddings when a request omits model.
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small
# Timeout for provider calls, in seconds.
OPENAI_TIMEOUT_SECONDS=60
`;
}
function configPy(): string {
  return `# app/config.py — typed config for the AI service (decision 28):
# parsed from the environment, fail-fast on invalid values at startup.
# Dev loads vars via .env + pydantic-settings; prod uses real env
# vars. Code never reads process.env directly — always through this
# typed Settings.
#
# Unlike apps/api and apps/api-auth there is NOTHING required to boot
# the AI service: it exposes primitives, and a provider key is only
# needed per-call. A missing OPENAI_API_KEY is therefore not a startup
# failure — the provider raises a clear error on first use (see
# app/primitives/provider.py). This mirrors api-auth's optional
# JWT_PRIVATE_KEY: the service stays dev-friendly and fails loud at
# the point of use, never at boot.

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every env var the AI service reads (decision 28)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_embeddings_model: str = "text-embedding-3-small"
    openai_timeout_seconds: float = 60.0


@lru_cache
def get_settings() -> Settings:
    """Returns the cached Settings, parsed fail-fast from the env."""
    return Settings()
`;
}
function primitivesInitPy(): string {
  return `# app/primitives — the composable AI primitives (decision 20):
# chat completion (with streaming), embeddings, a VectorStore
# interface, and tool/function calling. Each is a real typed layer
# over a vetted SDK — not a stub. Composing them into a product is
# the user's job, project-by-project (no example composition is
# shipped).
`;
}
function modelsPy(): string {
  return `# app/primitives/models.py — the wire types of the AI service's
# contract surface (packages/contract/openapi.ai.yaml is generated
# from these via FastAPI). The generated Go client in
# packages/contract/clients/go is generated from that spec, so these
# models ARE the seam between apps/api and apps/ai (decision 9: the
# contract is the spine; here Python is the canonical side of the
# AI service's own contract).
#
# The shapes mirror the OpenAI wire format (the vetted SDK these
# primitives wrap, decision 20) so a provider swap is a thin shim.

from typing import Any

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """One message of the conversation."""

    role: str = Field(
        ..., description="The role of the message author: system, user, assistant, or tool."
    )
    content: str | None = Field(None, description="The text content of the message.")
    tool_calls: list["ToolCall"] | None = Field(
        None, description="Tool calls made by an assistant message (tool/function calling)."
    )


class ToolDefinition(BaseModel):
    """A function the model may call (tool/function calling, decision 20)."""

    name: str = Field(..., description="The name of the tool the model may call.")
    description: str | None = Field(
        None,
        description=(
            "A description of what the tool does — the model uses it to decide when to call it."
        ),
    )
    parameters: dict[str, Any] | None = Field(
        None, description="The JSON Schema of the tool's parameters."
    )


class ToolCall(BaseModel):
    """A concrete tool invocation returned by the model."""

    id: str = Field(..., description="The id of the tool call.")
    name: str = Field(..., description="The name of the tool to call.")
    arguments: str = Field(..., description="JSON-encoded arguments for the tool.")


class ChatCompletionRequest(BaseModel):
    """The body of POST /ai/chat/completions."""

    model: str | None = Field(
        None, description="Model id. Defaults to the service's configured OPENAI_MODEL."
    )
    messages: list[ChatMessage] = Field(..., min_length=1, description="The conversation so far.")
    temperature: float | None = Field(None, ge=0, le=2, description="Sampling temperature.")
    stream: bool = Field(
        False,
        description=(
            "When true the service responds with a text/event-stream of completion chunks (SSE). "
            "The OpenAPI contract models the non-streaming JSON completion; "
            "streaming is the SSE form of the same primitive."
        ),
    )
    tools: list[ToolDefinition] | None = Field(
        None, description="Functions the model may call (tool/function calling)."
    )
    tool_choice: str | None = Field(
        None, description="Which tool to force: 'auto', 'none', or a tool name."
    )


class Usage(BaseModel):
    """Token accounting for a completion."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatChoice(BaseModel):
    """One completion candidate."""

    index: int
    message: ChatMessage
    finish_reason: str | None = Field(
        None, description="Why the completion stopped: stop, length, tool_calls, ..."
    )


class ChatCompletionResponse(BaseModel):
    """The body of POST /ai/chat/completions (stream=false)."""

    id: str
    model: str
    choices: list[ChatChoice]
    usage: Usage | None = None


class ChatMessageDelta(BaseModel):
    """The incremental message delta of a streamed chunk."""

    role: str | None = None
    content: str | None = None


class ChatChunkChoice(BaseModel):
    """One candidate of a streamed chunk."""

    index: int
    delta: ChatMessageDelta
    finish_reason: str | None = None


class ChatChunk(BaseModel):
    """One SSE chunk of a streamed completion (the stream form of the
    same primitive; not part of the OpenAPI response schema)."""

    id: str
    model: str
    choices: list[ChatChunkChoice]


class EmbeddingsRequest(BaseModel):
    """The body of POST /ai/embeddings."""

    model: str | None = Field(
        None, description="Model id. Defaults to the service's configured OPENAI_EMBEDDINGS_MODEL."
    )
    input: str | list[str] = Field(
        ..., description="Text to embed — a single string or a list of strings."
    )


class EmbeddingData(BaseModel):
    """One embedded input."""

    embedding: list[float] = Field(..., description="The embedding vector.")
    index: int = Field(..., description="The index of the input this embedding corresponds to.")


class EmbeddingsResponse(BaseModel):
    """The body of POST /ai/embeddings."""

    model: str
    data: list[EmbeddingData]


class VectorRecord(BaseModel):
    """A vector to store (upsert) or a stored vector's metadata."""

    id: str = Field(..., description="The unique id of the record.")
    vector: list[float] = Field(..., description="The embedding vector.")
    metadata: dict[str, Any] | None = Field(
        None, description="Arbitrary metadata stored alongside the vector."
    )


class VectorStoreUpsertRequest(BaseModel):
    """The body of POST /ai/vector-store/upsert."""

    vectors: list[VectorRecord] = Field(
        ..., min_length=1, description="Records to insert or replace by id."
    )


class VectorStoreUpsertResponse(BaseModel):
    """The body of POST /ai/vector-store/upsert."""

    count: int = Field(..., description="How many records were upserted.")


class VectorStoreSearchRequest(BaseModel):
    """The body of POST /ai/vector-store/search."""

    vector: list[float] = Field(..., description="The query vector.")
    top_k: int = Field(5, ge=1, le=100, description="How many nearest neighbours to return.")


class VectorStoreSearchResult(BaseModel):
    """One nearest-neighbour hit."""

    id: str
    score: float = Field(
        ..., description="Cosine similarity — higher is closer (1.0 = identical direction)."
    )
    metadata: dict[str, Any] | None = None


class VectorStoreSearchResponse(BaseModel):
    """The body of POST /ai/vector-store/search."""

    results: list[VectorStoreSearchResult]
`;
}
function providerPy(): string {
  return `# app/primitives/provider.py — the provider seam + the real default.
#
# Decision 20: each primitive is a real typed layer over a vetted SDK,
# not a stub. The default provider wraps the \`openai\` SDK (the
# canonical vetted SDK for chat completions + embeddings). Tests swap
# in a FakeProvider (app dependency override) — a chatComplete
# round-trip against a mocked LLM is a unit test, not a CI
# integration (decision 29).
#
# The service boots WITHOUT an API key (the primitives are exposed; a
# key is only needed per-call) and raises a clear error on first use
# when the key is unset — the same optional-but-owned discipline as
# api-auth's JWT_PRIVATE_KEY.

from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from ..config import Settings
from .models import (
    ChatChoice,
    ChatChunk,
    ChatChunkChoice,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatMessage,
    ChatMessageDelta,
    EmbeddingsRequest,
    EmbeddingsResponse,
    ToolCall,
    Usage,
)


class AIProvider:
    """The seam the AI routes depend on (chat + embeddings)."""

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Non-streaming chat completion."""
        raise NotImplementedError

    def stream(self, request: ChatCompletionRequest) -> AsyncIterator[ChatChunk]:
        """Streaming chat completion: an iterator of SSE chunks."""
        raise NotImplementedError

    async def embed(self, request: EmbeddingsRequest) -> EmbeddingsResponse:
        """Embeddings."""
        raise NotImplementedError


class OpenAIProvider(AIProvider):
    """A thin typed layer over the vetted \`openai\` SDK (decision 20).

    The client is constructed lazily so the service boots without a
    key; the first call without OPENAI_API_KEY fails with a clear
    message instead of a stack of SDK noise.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: AsyncOpenAI | None = None

    def _client_for(self) -> AsyncOpenAI:
        if self._client is None:
            if not self._settings.openai_api_key:
                raise RuntimeError(
                    "apps/ai: OPENAI_API_KEY is not set — copy apps/ai/.env.example to "
                    "apps/ai/.env and set OPENAI_API_KEY (the AI service exposes "
                    "primitives; it cannot call a provider without a key)"
                )
            self._client = AsyncOpenAI(
                api_key=self._settings.openai_api_key,
                base_url=self._settings.openai_base_url,
                timeout=self._settings.openai_timeout_seconds,
            )
        return self._client

    def _model(self, request: ChatCompletionRequest) -> str:
        return request.model or self._settings.openai_model

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        client = self._client_for()
        kwargs: dict[str, object] = {}
        if request.tools is not None:
            kwargs["tools"] = [tool.model_dump(exclude_none=True) for tool in request.tools]
        if request.tool_choice is not None:
            kwargs["tool_choice"] = request.tool_choice
        if request.temperature is not None:
            kwargs["temperature"] = request.temperature

        completion = await client.chat.completions.create(
            model=self._model(request),
            messages=[message.model_dump(exclude_none=True) for message in request.messages],
            stream=False,
            **kwargs,
        )
        return ChatCompletionResponse(
            id=completion.id,
            model=completion.model,
            choices=[
                ChatChoice(
                    index=choice.index,
                    message=ChatMessage(
                        role=choice.message.role or "assistant",
                        content=choice.message.content,
                        tool_calls=(
                            [
                                ToolCall(
                                    id=tool.id,
                                    name=tool.function.name,
                                    arguments=tool.function.arguments,
                                )
                                for tool in choice.message.tool_calls or []
                            ]
                            if choice.message.tool_calls
                            else None
                        ),
                    ),
                    finish_reason=choice.finish_reason,
                )
                for choice in completion.choices
            ],
            usage=(
                Usage(
                    prompt_tokens=completion.usage.prompt_tokens,
                    completion_tokens=completion.usage.completion_tokens,
                    total_tokens=completion.usage.total_tokens,
                )
                if completion.usage
                else None
            ),
        )

    def stream(self, request: ChatCompletionRequest) -> AsyncIterator[ChatChunk]:
        async def gen() -> AsyncIterator[ChatChunk]:
            client = self._client_for()
            kwargs: dict[str, object] = {}
            if request.tools is not None:
                kwargs["tools"] = [tool.model_dump(exclude_none=True) for tool in request.tools]
            if request.tool_choice is not None:
                kwargs["tool_choice"] = request.tool_choice
            if request.temperature is not None:
                kwargs["temperature"] = request.temperature

            stream = await client.chat.completions.create(
                model=self._model(request),
                messages=[message.model_dump(exclude_none=True) for message in request.messages],
                stream=True,
                **kwargs,
            )
            async for chunk in stream:
                yield ChatChunk(
                    id=chunk.id,
                    model=chunk.model,
                    choices=[
                        ChatChunkChoice(
                            index=choice.index,
                            delta=ChatMessageDelta(
                                role=choice.delta.role,
                                content=choice.delta.content,
                            ),
                            finish_reason=choice.finish_reason,
                        )
                        for choice in chunk.choices
                    ],
                )

        return gen()
`;
}
function vectorStorePy(): string {
  return `# app/primitives/vector_store.py — the VectorStore primitive
# (decision 20). The interface is the seam; the in-memory
# implementation is a REAL, dependency-free store (cosine similarity,
# no numpy) shipped as the default so the primitive works out of the
# box. The TS shapes default to pgvector (reusing decision 14's
# Postgres); the Python service keeps the store self-contained —
# swap in pgvector/anything by implementing the VectorStore protocol.

import math
from typing import Protocol

from .models import VectorRecord, VectorStoreSearchResult


class VectorStore(Protocol):
    """The persistence seam for embedding vectors (decision 20)."""

    async def upsert(self, vectors: list[VectorRecord]) -> None:
        """Insert or replace records by id."""
        ...

    async def search(self, vector: list[float], top_k: int = 5) -> list[VectorStoreSearchResult]:
        """Return the top_k nearest neighbours by cosine similarity."""
        ...


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity in the unit ball: 1.0 = identical direction,
    0.0 = orthogonal, -1.0 = opposite. Raises ValueError on
    dimension mismatch (a wrong-dimension vector is a caller bug)."""
    if len(a) != len(b):
        raise ValueError(f"vector dimension mismatch: {len(a)} vs {len(b)}")
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class InMemoryVectorStore:
    """A real VectorStore backed by an in-memory dict: upsert by id,
    search by cosine similarity. The seam is the protocol above —
    replace this with a pgvector-backed store when you outgrow it
    (see the README's where-to-extend)."""

    def __init__(self) -> None:
        self._records: dict[str, VectorRecord] = {}

    async def upsert(self, vectors: list[VectorRecord]) -> None:
        for record in vectors:
            self._records[record.id] = record

    async def search(self, vector: list[float], top_k: int = 5) -> list[VectorStoreSearchResult]:
        scored = [
            (cosine_similarity(vector, record.vector), record) for record in self._records.values()
        ]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [
            VectorStoreSearchResult(id=record.id, score=score, metadata=record.metadata)
            for score, record in scored[:top_k]
        ]
`;
}
function toolsPy(): string {
  return `# app/primitives/tools.py — the tool/function-calling primitive
# (decision 20). Two halves:
#
#   1. The chat completion route accepts \`tools\` (ToolDefinition)
#      and the provider returns \`tool_calls\` on the assistant
#      message — the model's side of function calling.
#   2. This module is the USER's side: a ToolRegistry that binds
#      Python functions to tool names and runs the model's tool
#      calls against them. It is a shipped primitive, not a wired
#      product — executing tool calls is the first step of an
#      agentic composition, and composing is the user's job
#      (decision 20: no example composition).

import json
from collections.abc import Callable
from typing import Any

from .models import ToolCall, ToolDefinition

# A tool function takes the parsed JSON arguments and returns anything
# JSON-serializable (the result is fed back into the conversation).
ToolFunction = Callable[..., Any]


class ToolRegistry:
    """Binds Python functions to tool names and runs ToolCalls.

    Register your project's functions, then feed the model's
    tool_calls through \`run\` and push the results back as
    assistant/tool messages — that loop is an agentic composition,
    which is yours to build (decision 20).
    """

    def __init__(self) -> None:
        self._tools: dict[str, ToolFunction] = {}

    def register(self, name: str, fn: ToolFunction) -> None:
        """Bind \`fn\` to the tool name the model may call."""
        self._tools[name] = fn

    def definition(
        self,
        name: str,
        description: str | None = None,
        parameters: dict[str, Any] | None = None,
    ) -> ToolDefinition:
        """Build the ToolDefinition to send with a chat completion.

        The parameters JSON Schema is your side of the contract: the
        model reads it to construct arguments your function accepts.
        """
        return ToolDefinition(name=name, description=description, parameters=parameters)

    def run(self, call: ToolCall) -> Any:
        """Execute a model ToolCall against the registered function.

        Raises KeyError for an unregistered tool name and propagates
        the function's own errors — an unhandled tool is a caller
        bug, not something to paper over.
        """
        fn = self._tools.get(call.name)
        if fn is None:
            raise KeyError(f"no tool registered with name {call.name!r}")
        args = json.loads(call.arguments)
        if isinstance(args, dict):
            return fn(**args)
        return fn(args)
`;
}
function mainPy(): string {
  return `# app/main.py — the FastAPI app exposing the composable AI
# primitives (decision 20) over the service's own contract surface.
# The contract (packages/contract/openapi.ai.yaml) is GENERATED from
# this app (scripts/export_openapi.py) and committed; the Go client
# in packages/contract/clients/go is generated from that spec, and
# apps/api calls the service through that client — never raw HTTP
# (decision 5: the AI service is called by the Go api, not by the web
# app directly).
#
# No example composition is shipped (decision 20): these four routes
# ARE the primitives. Composing them into a product (RAG,
# recommendation, agentic) is the user's job, project-by-project.

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from .config import Settings, get_settings
from .primitives.models import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    EmbeddingsRequest,
    EmbeddingsResponse,
    VectorStoreSearchRequest,
    VectorStoreSearchResponse,
    VectorStoreUpsertRequest,
    VectorStoreUpsertResponse,
)
from .primitives.provider import AIProvider, OpenAIProvider
from .primitives.vector_store import InMemoryVectorStore, VectorStore

app = FastAPI(
    title="Starter AI API",
    description=(
        "The scaffolded Python/FastAPI AI service (shape 4, decision 5/20): "
        "composable AI primitives — chat completion (with streaming), embeddings, "
        "a VectorStore interface, and tool/function calling — over their own "
        "contract surface. Called by apps/api via the generated Go client. "
        "No example composition is shipped (decision 20)."
    ),
    version="0.1.0",
)

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_provider(settings: SettingsDep) -> AIProvider:
    """The provider seam (default: the vetted openai SDK, decision 20).
    Tests override this with a FakeProvider."""
    return OpenAIProvider(settings)


# The VectorStore is app-scoped state (a real store, not a per-request
# one): upserts must be visible to later searches. The seam is the
# get_vector_store dependency — tests could override it too.
_vector_store: VectorStore = InMemoryVectorStore()


def get_vector_store() -> VectorStore:
    """The VectorStore seam (default: the in-memory implementation)."""
    return _vector_store


ProviderDep = Annotated[AIProvider, Depends(get_provider)]
VectorStoreDep = Annotated[VectorStore, Depends(get_vector_store)]


def _sse(provider: AIProvider, request: ChatCompletionRequest) -> AsyncIterator[str]:
    """Frames the provider's chunk stream as Server-Sent Events:
    one \`data: {json}\` per chunk, terminated by \`data: [DONE]\`."""

    async def gen() -> AsyncIterator[str]:
        async for chunk in provider.stream(request):
            yield f"data: {chunk.model_dump_json(exclude_none=True)}\\n\\n"
        yield "data: [DONE]\\n\\n"

    return gen()


@app.post(
    "/ai/chat/completions",
    response_model=ChatCompletionResponse,
    summary="Chat completion (with streaming)",
    tags=["ai"],
)
async def chat_completions(
    request: ChatCompletionRequest,
    provider: ProviderDep,
) -> ChatCompletionResponse | StreamingResponse:
    """Complete a conversation. When request.stream is true the
    service responds with a text/event-stream of completion chunks
    instead of the JSON completion modeled by the contract — the
    streaming form of the same primitive (decision 20)."""
    if request.stream:
        return StreamingResponse(
            _sse(provider, request),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    return await provider.complete(request)


@app.post(
    "/ai/embeddings",
    response_model=EmbeddingsResponse,
    summary="Embeddings",
    tags=["ai"],
)
async def embeddings(
    request: EmbeddingsRequest,
    provider: ProviderDep,
) -> EmbeddingsResponse:
    """Embed text — a single string or a list of strings."""
    return await provider.embed(request)


@app.post(
    "/ai/vector-store/upsert",
    response_model=VectorStoreUpsertResponse,
    summary="Upsert vectors into the VectorStore",
    tags=["ai"],
)
async def vector_store_upsert(
    request: VectorStoreUpsertRequest,
    store: VectorStoreDep,
) -> VectorStoreUpsertResponse:
    """Insert or replace vectors by id."""
    await store.upsert(request.vectors)
    return VectorStoreUpsertResponse(count=len(request.vectors))


@app.post(
    "/ai/vector-store/search",
    response_model=VectorStoreSearchResponse,
    summary="Search the VectorStore by cosine similarity",
    tags=["ai"],
)
async def vector_store_search(
    request: VectorStoreSearchRequest,
    store: VectorStoreDep,
) -> VectorStoreSearchResponse:
    """Return the top_k nearest neighbours to the query vector."""
    try:
        results = await store.search(request.vector, top_k=request.top_k)
    except ValueError as exc:
        # A wrong-dimension query vector is a caller bug (decision:
        # fail loudly, never silently degrade the search).
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return VectorStoreSearchResponse(results=results)
`;
}
function exportOpenapiPy(): string {
  return `#!/usr/bin/env python
# scripts/export_openapi.py — regenerates
# packages/contract/openapi.ai.yaml from the FastAPI app (decision 9:
# the contract is the spine; here Python is the canonical side of the
# AI service's own contract). The generated file is committed; the Go
# client (packages/contract/clients/go) is generated from it by
# scripts/generate-go-client.mjs in the contract package. \`task
# contract:generate\` runs this before regenerating the Go client.
#
# Usage: .venv/bin/python scripts/export_openapi.py [output-path]
#
# The default output path assumes apps/ai is the cwd (as Taskfile's
# contract:generate does).

import sys
from pathlib import Path

import yaml
from app.main import app


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "../../packages/contract/openapi.ai.yaml")
    spec = app.openapi()
    out.parent.mkdir(parents=True, exist_ok=True)
    # sort_keys=False keeps FastAPI's deterministic order; width=10_000
    # disables yaml line-wrapping so the committed file is stable.
    out.write_text(yaml.safe_dump(spec, sort_keys=False, allow_unicode=True, width=10_000))
    print(f"export_openapi: wrote {out}")


if __name__ == "__main__":
    main()
`;
}
function fakesPy(): string {
  return `# tests/fakes.py — the FakeProvider: a deterministic stand-in for
# the vetted openai SDK used by the unit tests. Decision 29: a
# chatComplete round-trip against a mocked LLM is a unit test, not a
# CI integration — the real provider is exercised only by a real
# deployment.

from collections.abc import AsyncIterator

from app.primitives.models import (
    ChatChoice,
    ChatChunk,
    ChatChunkChoice,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatMessage,
    ChatMessageDelta,
    EmbeddingData,
    EmbeddingsRequest,
    EmbeddingsResponse,
    ToolCall,
    Usage,
)
from app.primitives.provider import AIProvider


class FakeProvider(AIProvider):
    """Returns canned completions/embeddings and records requests so
    tests can assert what the routes sent to the provider."""

    def __init__(self) -> None:
        self.requests: list[object] = []

    async def complete(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        self.requests.append(request)
        if request.tools:
            message = ChatMessage(
                role="assistant",
                content=None,
                tool_calls=[
                    ToolCall(
                        id="call_fake_1",
                        name=request.tools[0].name,
                        arguments='{"query": "the starter"}',
                    )
                ],
            )
            finish_reason = "tool_calls"
        else:
            message = ChatMessage(role="assistant", content="Hello from the fake provider!")
            finish_reason = "stop"
        return ChatCompletionResponse(
            id="chatcmpl_fake_1",
            model=request.model or "fake-model",
            choices=[ChatChoice(index=0, message=message, finish_reason=finish_reason)],
            usage=Usage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
        )

    def stream(self, request: ChatCompletionRequest) -> AsyncIterator[ChatChunk]:
        self.requests.append(request)

        async def gen() -> AsyncIterator[ChatChunk]:
            for piece in ["Hello", " from ", "the fake provider!"]:
                yield ChatChunk(
                    id="chatcmpl_fake_stream",
                    model="fake-model",
                    choices=[
                        ChatChunkChoice(
                            index=0, delta=ChatMessageDelta(content=piece), finish_reason=None
                        )
                    ],
                )
            yield ChatChunk(
                id="chatcmpl_fake_stream",
                model="fake-model",
                choices=[ChatChunkChoice(index=0, delta=ChatMessageDelta(), finish_reason="stop")],
            )

        return gen()

    async def embed(self, request: EmbeddingsRequest) -> EmbeddingsResponse:
        self.requests.append(request)
        inputs = request.input if isinstance(request.input, list) else [request.input]
        return EmbeddingsResponse(
            model="fake-embedding-model",
            data=[EmbeddingData(embedding=[1.0, 2.0, 3.0], index=i) for i in range(len(inputs))],
        )
`;
}
function testChatPy(): string {
  return `# tests/test_chat.py — the chat completion primitive (with
# streaming), exercised through the FastAPI app against the
# FakeProvider (decision 29: mocked-LLM unit tests).

import json

from app.main import app, get_provider
from app.primitives.models import ChatCompletionRequest, ChatMessage
from fastapi.testclient import TestClient

from .fakes import FakeProvider

client = TestClient(app)


def test_chat_completion_returns_the_provider_completion() -> None:
    fake = FakeProvider()
    app.dependency_overrides[get_provider] = lambda: fake
    try:
        response = client.post(
            "/ai/chat/completions",
            json={"messages": [{"role": "user", "content": "hi"}]},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["choices"][0]["message"]["content"] == "Hello from the fake provider!"
    assert body["choices"][0]["finish_reason"] == "stop"
    assert body["usage"]["total_tokens"] == 15

    # The route forwarded exactly the request it received.
    sent: ChatCompletionRequest = fake.requests[0]
    assert isinstance(sent, ChatCompletionRequest)
    assert sent.messages == [ChatMessage(role="user", content="hi")]


def test_chat_completion_forwards_tools_and_returns_tool_calls() -> None:
    fake = FakeProvider()
    app.dependency_overrides[get_provider] = lambda: fake
    try:
        response = client.post(
            "/ai/chat/completions",
            json={
                "messages": [{"role": "user", "content": "search for the starter"}],
                "tools": [
                    {
                        "name": "search",
                        "description": "Search the docs",
                        "parameters": {
                            "type": "object",
                            "properties": {"query": {"type": "string"}},
                        },
                    }
                ],
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    tool_call = body["choices"][0]["message"]["tool_calls"][0]
    assert tool_call["name"] == "search"
    assert json.loads(tool_call["arguments"]) == {"query": "the starter"}
    assert body["choices"][0]["finish_reason"] == "tool_calls"


def test_chat_completion_streams_sse_chunks() -> None:
    fake = FakeProvider()
    app.dependency_overrides[get_provider] = lambda: fake
    try:
        response = client.post(
            "/ai/chat/completions",
            json={"messages": [{"role": "user", "content": "stream me"}], "stream": True},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    lines = [line for line in response.text.split("\\n") if line.startswith("data: ")]
    # Three content chunks, then the final empty-delta stop chunk, then [DONE].
    assert lines[0] == (
        'data: {"id":"chatcmpl_fake_stream","model":"fake-model",'
        '"choices":[{"index":0,"delta":{"content":"Hello"}}]}'
    )
    assert lines[-1] == "data: [DONE]"


def test_chat_completion_validates_messages() -> None:
    response = client.post("/ai/chat/completions", json={"messages": []})
    assert response.status_code == 422
`;
}
function testEmbeddingsPy(): string {
  return `# tests/test_embeddings.py — the embeddings primitive (decision 20)
# through the FastAPI app against the FakeProvider.

from app.main import app, get_provider
from app.primitives.models import EmbeddingsRequest
from fastapi.testclient import TestClient

from .fakes import FakeProvider

client = TestClient(app)


def test_embeddings_single_string() -> None:
    fake = FakeProvider()
    app.dependency_overrides[get_provider] = lambda: fake
    try:
        response = client.post("/ai/embeddings", json={"input": "hello"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["embedding"] == [1.0, 2.0, 3.0]
    sent: EmbeddingsRequest = fake.requests[0]
    assert sent.input == "hello"


def test_embeddings_list_input() -> None:
    fake = FakeProvider()
    app.dependency_overrides[get_provider] = lambda: fake
    try:
        response = client.post("/ai/embeddings", json={"input": ["a", "b", "c"]})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert [data["index"] for data in body["data"]] == [0, 1, 2]
    assert len(body["data"]) == 3
`;
}
function testVectorStorePy(): string {
  return `# tests/test_vector_store.py — the VectorStore primitive (decision
# 20): the in-memory store's upsert + cosine-similarity search through
# the FastAPI app.

from app.main import app, get_vector_store
from app.primitives.vector_store import InMemoryVectorStore, cosine_similarity
from fastapi.testclient import TestClient

client = TestClient(app)


def _fresh_store() -> InMemoryVectorStore:
    """Give each test its own VectorStore (the app default is a
    module-level singleton — state must not leak between tests)."""
    store = InMemoryVectorStore()
    app.dependency_overrides[get_vector_store] = lambda: store
    return store


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_cosine_similarity_ranks_similar_vectors_higher() -> None:
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0
    assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == -1.0
    assert abs(cosine_similarity([1.0, 1.0], [2.0, 2.0]) - 1.0) < 1e-9


def test_upsert_then_search_returns_nearest_neighbours() -> None:
    _fresh_store()
    try:
        response = client.post(
            "/ai/vector-store/upsert",
            json={
                "vectors": [
                    {"id": "doc-fruit", "vector": [1.0, 0.0], "metadata": {"kind": "fruit"}},
                    {"id": "doc-car", "vector": [0.0, 1.0], "metadata": {"kind": "vehicle"}},
                ]
            },
        )
        assert response.status_code == 200
        assert response.json() == {"count": 2}

        search = client.post("/ai/vector-store/search", json={"vector": [0.9, 0.1], "top_k": 2})
        assert search.status_code == 200
        results = search.json()["results"]
        assert [r["id"] for r in results] == ["doc-fruit", "doc-car"]
        assert results[0]["metadata"] == {"kind": "fruit"}
        assert results[0]["score"] > results[1]["score"]
    finally:
        _clear_overrides()


def test_upsert_replaces_by_id() -> None:
    _fresh_store()
    try:
        client.post(
            "/ai/vector-store/upsert",
            json={"vectors": [{"id": "doc-a", "vector": [1.0, 0.0]}]},
        )
        client.post(
            "/ai/vector-store/upsert",
            json={"vectors": [{"id": "doc-a", "vector": [0.0, 1.0]}]},
        )
        search = client.post("/ai/vector-store/search", json={"vector": [0.0, 1.0], "top_k": 1})
        assert search.json()["results"][0]["id"] == "doc-a"
    finally:
        _clear_overrides()


def test_search_empty_store_returns_empty() -> None:
    _fresh_store()
    try:
        search = client.post("/ai/vector-store/search", json={"vector": [1.0, 0.0]})
        assert search.status_code == 200
        assert search.json() == {"results": []}
    finally:
        _clear_overrides()


def test_search_rejects_wrong_dimension() -> None:
    _fresh_store()
    try:
        client.post(
            "/ai/vector-store/upsert",
            json={"vectors": [{"id": "doc-a", "vector": [1.0, 0.0]}]},
        )
        search = client.post("/ai/vector-store/search", json={"vector": [1.0]})
        assert search.status_code == 422
    finally:
        _clear_overrides()
`;
}
function testToolsPy(): string {
  return `# tests/test_tools.py — the tool/function-calling primitive's user
# side (decision 20): the ToolRegistry binds Python functions to tool
# names and runs the model's tool_calls.

import pytest
from app.primitives.models import ToolCall
from app.primitives.tools import ToolRegistry


def test_register_and_run_with_keyword_arguments() -> None:
    registry = ToolRegistry()
    registry.register("add", lambda a, b: a + b)

    result = registry.run(ToolCall(id="call_1", name="add", arguments='{"a": 2, "b": 3}'))
    assert result == 5


def test_definition_ships_the_parameters_schema() -> None:
    registry = ToolRegistry()
    definition = registry.definition(
        "add",
        description="Add two numbers",
        parameters={
            "type": "object",
            "properties": {"a": {"type": "number"}, "b": {"type": "number"}},
        },
    )
    assert definition.name == "add"
    assert definition.description == "Add two numbers"
    assert definition.parameters["type"] == "object"  # type: ignore[index]


def test_run_unregistered_tool_raises() -> None:
    registry = ToolRegistry()
    with pytest.raises(KeyError):
        registry.run(ToolCall(id="call_1", name="nope", arguments="{}"))


def test_run_propagates_function_errors() -> None:
    registry = ToolRegistry()

    def boom() -> None:
        raise ValueError("kaboom")

    registry.register("boom", boom)
    with pytest.raises(ValueError, match="kaboom"):
        registry.run(ToolCall(id="call_1", name="boom", arguments="{}"))
`;
}
function testContractPy(): string {
  return `# tests/test_contract.py — the AI service's contract tests (the seam
# of decision 19/22 applied to the Python side): the committed
# packages/contract/openapi.ai.yaml must equal what this app
# generates. If the Pydantic models or routes change, \`task
# contract:generate\` must be run and the diff committed — this test
# is the tripwire (the Go client is generated from the committed file,
# so the whole downstream chain stays in lockstep).

from pathlib import Path

import yaml
from app.main import app

# apps/ai/tests/test_contract.py -> apps/ai -> <project root>/packages/contract/openapi.ai.yaml
COMMITTED_SPEC = Path(__file__).resolve().parents[3] / "packages" / "contract" / "openapi.ai.yaml"

# Must match scripts/export_openapi.py's serialization exactly.
DUMP_KWARGS = {"sort_keys": False, "allow_unicode": True, "width": 10_000}


def test_committed_spec_matches_live_spec() -> None:
    live = yaml.safe_dump(app.openapi(), **DUMP_KWARGS)
    committed = COMMITTED_SPEC.read_text(encoding="utf-8")
    assert committed == live, (
        "packages/contract/openapi.ai.yaml is stale — run \`task contract:generate\` "
        "in the scaffolded project and commit the diff (decision 19)"
    )


def test_spec_documents_the_primitives() -> None:
    spec = yaml.safe_load(COMMITTED_SPEC.read_text(encoding="utf-8"))
    paths = spec["paths"]
    # The four composable primitives (decision 20) — and nothing
    # composed from them (no /rag, no /chat product, ...).
    for path in [
        "/ai/chat/completions",
        "/ai/embeddings",
        "/ai/vector-store/upsert",
        "/ai/vector-store/search",
    ]:
        assert path in paths, f"spec must document {path}"
    assert "/rag" not in paths
    assert "/assistant" not in paths

    schemas = spec["components"]["schemas"]
    for schema in [
        "ChatCompletionRequest",
        "ChatCompletionResponse",
        "EmbeddingsRequest",
        "EmbeddingsResponse",
        "VectorStoreUpsertRequest",
        "VectorStoreSearchRequest",
    ]:
        assert schema in schemas, f"spec must define {schema}"
`;
}
