import { useEffect, useState } from 'react';
import { subscribeToEngineStatus, getEngineStatus, EngineStatus } from '../lib/ai/webllmEngine';

export function AiLoadingBanner() {
  const [status, setStatus] = useState<EngineStatus>(() => getEngineStatus());

  useEffect(() => {
    return subscribeToEngineStatus((nextStatus) => setStatus(nextStatus));
  }, []);

  if (status !== 'loading') return null;

  return (
    <div className="ai-loading-banner glass" role="status">
      The local AI model is downloading onto this device — this usually takes about 1–3
      minutes. You can start taking notes right away; AI-assisted themes, suggested
      questions, and summaries will appear once it's ready. Crisis-language detection is
      already active and does not depend on the AI.
    </div>
  );
}
