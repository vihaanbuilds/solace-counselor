// Thin wrapper around the browser's built-in SpeechRecognition (Web Speech
// API) so a counselor can turn on the mic and have Solace transcribe what
// the student is saying directly into the notes field. Runs entirely
// on-device via the browser's speech engine — no audio is sent to us.

export interface SpeechNotetakerHandlers {
  /** A finalized, recognized utterance — safe to append to the notes. */
  onFinalSegment: (text: string) => void;
  /** The current not-yet-finalized text, for a live "Listening: ..." preview. */
  onInterimChange?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export interface SpeechNotetaker {
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechNotetakingSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function createSpeechNotetaker(handlers: SpeechNotetakerHandlers): SpeechNotetaker | null {
  const RecognitionCtor = getSpeechRecognitionConstructor();
  if (!RecognitionCtor) return null;

  const recognition = new RecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let shouldBeListening = false;
  let restartTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function attemptRestart() {
    if (!shouldBeListening) return;
    try {
      recognition.start();
    } catch {
      // The delay below should be enough for Chrome's teardown to finish;
      // if it still fails, don't leave the UI stuck showing "listening"
      // over a dead session — surface it so the counselor can retry.
      shouldBeListening = false;
      handlers.onError?.('restart-failed');
    }
  }

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? '';
      if (result.isFinal) {
        handlers.onFinalSegment(transcript.trim());
      } else {
        interim += transcript;
      }
    }
    handlers.onInterimChange?.(interim.trim());
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    handlers.onError?.(event.error);
  };

  recognition.onend = () => {
    if (shouldBeListening) {
      // Chrome (and other Chromium browsers) frequently end the session
      // right after each finalized utterance, even with continuous:true.
      // Calling start() synchronously here throws InvalidStateError because
      // the previous session hasn't finished tearing down yet, so the
      // restart is deferred to the next tick to give that teardown time to
      // finish — without this, the retry silently fails and nothing said
      // after the first utterance ever gets captured again.
      if (restartTimeoutId !== null) clearTimeout(restartTimeoutId);
      restartTimeoutId = setTimeout(attemptRestart, 300);
    } else {
      handlers.onEnd?.();
    }
  };

  return {
    start() {
      shouldBeListening = true;
      try {
        recognition.start();
      } catch {
        // Already started — ignore.
      }
    },
    stop() {
      shouldBeListening = false;
      if (restartTimeoutId !== null) {
        clearTimeout(restartTimeoutId);
        restartTimeoutId = null;
      }
      recognition.stop();
    },
  };
}
