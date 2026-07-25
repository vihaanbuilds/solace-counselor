import type { MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

export const DEFAULT_MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type StatusListener = (status: EngineStatus, progress: number) => void;

let engine: MLCEngine | null = null;
let status: EngineStatus = 'idle';
let progress = 0;
const listeners = new Set<StatusListener>();

function setStatus(next: EngineStatus, nextProgress: number = progress): void {
  status = next;
  progress = nextProgress;
  listeners.forEach((listener) => listener(status, progress));
}

export function getEngineStatus(): EngineStatus {
  return status;
}

export function getEngineProgress(): number {
  return progress;
}

export function subscribeToEngineStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function loadEngine(modelId: string = DEFAULT_MODEL_ID): void {
  if (status === 'loading' || status === 'ready') return;

  if (!isWebGPUSupported()) {
    setStatus('unsupported');
    return;
  }

  setStatus('loading', 0);

  import('@mlc-ai/web-llm')
    .then(({ CreateMLCEngine }) =>
      CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          setStatus('loading', report.progress);
        },
      })
    )
    .then((created) => {
      engine = created;
      setStatus('ready', 1);
    })
    .catch(() => {
      setStatus('error');
    });
}

export async function generateReply(
  messages: ChatMessage[],
  onToken?: (partial: string) => void
): Promise<string> {
  if (!engine || status !== 'ready') {
    throw new Error('WebLLM engine is not ready');
  }

  const stream = await engine.chat.completions.create({
    messages,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      full += delta;
      onToken?.(full);
    }
  }

  return full.trim();
}
