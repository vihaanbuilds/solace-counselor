import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AiStatusIndicator } from './AiStatusIndicator';
import * as webllmEngine from '../lib/ai/webllmEngine';

type Listener = (status: webllmEngine.EngineStatus, progress: number) => void;

describe('AiStatusIndicator', () => {
  let listeners: Listener[];

  beforeEach(() => {
    vi.useFakeTimers();
    listeners = [];
    vi.spyOn(webllmEngine, 'loadEngine').mockImplementation(() => {});
    vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('idle');
    vi.spyOn(webllmEngine, 'getEngineProgress').mockReturnValue(0);
    vi.spyOn(webllmEngine, 'subscribeToEngineStatus').mockImplementation((listener: Listener) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders nothing while idle', () => {
    render(<AiStatusIndicator />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('starts loading the engine on mount', () => {
    render(<AiStatusIndicator />);
    expect(webllmEngine.loadEngine).toHaveBeenCalled();
  });

  it('shows a progress pill while loading', () => {
    render(<AiStatusIndicator />);
    act(() => {
      listeners.forEach((listener) => listener('loading', 0.42));
    });
    expect(screen.getByText('Loading local AI… 42%')).toBeInTheDocument();
  });

  it('shows a one-time ready toast when the engine becomes ready, then hides it', () => {
    render(<AiStatusIndicator />);
    act(() => {
      listeners.forEach((listener) => listener('ready', 1));
    });
    expect(screen.getByText("Local AI is now active")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Local AI is now active")).not.toBeInTheDocument();
  });

  it('renders nothing when unsupported', () => {
    render(<AiStatusIndicator />);
    act(() => {
      listeners.forEach((listener) => listener('unsupported', 0));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
