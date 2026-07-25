import { useEffect, useState } from 'react';
import {
  loadEngine,
  subscribeToEngineStatus,
  getEngineStatus,
  getEngineProgress,
  EngineStatus,
} from '../lib/ai/webllmEngine';

const READY_TOAST_DURATION_MS = 5000;

export function AiStatusIndicator() {
  const [status, setStatus] = useState<EngineStatus>(() => getEngineStatus());
  const [progress, setProgress] = useState<number>(() => getEngineProgress());
  const [showReadyToast, setShowReadyToast] = useState(false);

  useEffect(() => {
    loadEngine();

    const unsubscribe = subscribeToEngineStatus((nextStatus, nextProgress) => {
      setStatus((prevStatus) => {
        if (prevStatus !== 'ready' && nextStatus === 'ready') {
          setShowReadyToast(true);
          window.setTimeout(() => setShowReadyToast(false), READY_TOAST_DURATION_MS);
        }
        return nextStatus;
      });
      setProgress(nextProgress);
    });

    return unsubscribe;
  }, []);

  if (status === 'loading') {
    return (
      <div className="ai-status-pill glass" role="status">
        Loading local AI… {Math.round(progress * 100)}%
      </div>
    );
  }

  if (showReadyToast) {
    return (
      <div className="ai-status-pill ai-status-ready glass" role="status">
        Local AI is now active
      </div>
    );
  }

  return null;
}
