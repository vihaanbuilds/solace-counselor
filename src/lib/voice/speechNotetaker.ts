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
      // Some browsers end the session after a period of silence even in
      // continuous mode; restart transparently unless the user stopped it.
      try {
        recognition.start();
      } catch {
        // Already starting/started — ignore.
      }
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
      recognition.stop();
    },
  };
}
