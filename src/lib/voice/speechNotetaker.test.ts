import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSpeechNotetaker } from './speechNotetaker';

// Simulates the real-world Chrome quirk: SpeechRecognition fires `onend`
// after each finalized utterance even in continuous mode, and calling
// `.start()` synchronously from inside that `onend` handler throws
// InvalidStateError because the previous session hasn't finished tearing
// down yet. `cooling` models that teardown window; `finishTeardown()`
// simulates the browser completing it a short time later.
class RaceyFakeSpeechRecognition {
  static instances: RaceyFakeSpeechRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  startCallCount = 0;
  private cooling = false;

  constructor() {
    RaceyFakeSpeechRecognition.instances.push(this);
  }

  start() {
    if (this.cooling) {
      throw new DOMException(
        "Failed to execute 'start' on 'SpeechRecognition': recognition has already started.",
        'InvalidStateError'
      );
    }
    this.startCallCount += 1;
  }

  stop() {
    this.onend?.();
  }

  abort() {}

  /** Simulate the browser ending the session right after an utterance. */
  triggerEnd() {
    this.cooling = true;
    this.onend?.();
  }

  /** Simulate the browser finishing teardown a moment later. */
  finishTeardown() {
    this.cooling = false;
  }
}

describe('createSpeechNotetaker', () => {
  afterEach(() => {
    delete window.SpeechRecognition;
    RaceyFakeSpeechRecognition.instances = [];
    vi.useRealTimers();
  });

  it('recovers when the browser ends the session mid-conversation (Chrome InvalidStateError race)', () => {
    vi.useFakeTimers();
    window.SpeechRecognition = RaceyFakeSpeechRecognition as unknown as new () => SpeechRecognition;

    const onError = vi.fn();
    const notetaker = createSpeechNotetaker({ onFinalSegment: () => {}, onError });
    notetaker?.start();

    const recognition = RaceyFakeSpeechRecognition.instances[0];
    expect(recognition.startCallCount).toBe(1);

    // Student's first comment finalizes, then the browser ends the session
    // (as Chrome does) while its internal teardown is still in flight.
    recognition.triggerEnd();
    // Teardown completes shortly after — well within any reasonable retry delay.
    recognition.finishTeardown();

    // Let any deferred restart run.
    vi.runOnlyPendingTimers();

    expect(recognition.startCallCount).toBe(2);
    expect(onError).not.toHaveBeenCalled();
  });

  it('surfaces an error instead of silently going dead when the restart genuinely fails', () => {
    vi.useFakeTimers();
    window.SpeechRecognition = RaceyFakeSpeechRecognition as unknown as new () => SpeechRecognition;

    const onError = vi.fn();
    const notetaker = createSpeechNotetaker({ onFinalSegment: () => {}, onError });
    notetaker?.start();

    const recognition = RaceyFakeSpeechRecognition.instances[0];
    recognition.triggerEnd();
    // Teardown never finishes (e.g. mic permission was revoked) — the
    // deferred restart attempt still throws.
    vi.runOnlyPendingTimers();

    expect(recognition.startCallCount).toBe(1);
    expect(onError).toHaveBeenCalledWith('restart-failed');
  });
});
