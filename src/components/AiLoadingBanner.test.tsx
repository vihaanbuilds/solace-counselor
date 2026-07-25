import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AiLoadingBanner } from './AiLoadingBanner';
import * as webllmEngine from '../lib/ai/webllmEngine';

type Listener = (status: webllmEngine.EngineStatus, progress: number) => void;

describe('AiLoadingBanner', () => {
  let listeners: Listener[];

  beforeEach(() => {
    listeners = [];
    vi.spyOn(webllmEngine, 'getEngineStatus').mockReturnValue('idle');
    vi.spyOn(webllmEngine, 'subscribeToEngineStatus').mockImplementation((listener: Listener) => {
      listeners.push(listener);
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing while idle', () => {
    render(<AiLoadingBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains the download and that crisis detection is unaffected', () => {
    render(<AiLoadingBanner />);
    act(() => {
      listeners.forEach((listener) => listener('loading', 0.2));
    });
    expect(screen.getByText(/downloading onto this device/i)).toBeInTheDocument();
    expect(screen.getByText(/1–3\s*minutes/)).toBeInTheDocument();
    expect(screen.getByText(/does not depend on the AI/i)).toBeInTheDocument();
  });

  it('disappears once the engine is ready', () => {
    render(<AiLoadingBanner />);
    act(() => {
      listeners.forEach((listener) => listener('loading', 0.5));
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      listeners.forEach((listener) => listener('ready', 1));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing when unsupported', () => {
    render(<AiLoadingBanner />);
    act(() => {
      listeners.forEach((listener) => listener('unsupported', 0));
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
