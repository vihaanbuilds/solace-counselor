import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { Student } from '../lib/storage';

const students: Student[] = [
  { id: 'a', name: 'First student', createdAt: 100, sessions: [] },
  { id: 'b', name: 'Second student', createdAt: 200, sessions: [] },
];

function renderSidebar(overrides: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <Sidebar
      students={students}
      activeStudentId="a"
      onSelect={() => {}}
      onNewStudent={() => {}}
      onRename={() => {}}
      onDelete={() => {}}
      collapsed={false}
      {...overrides}
    />
  );
}

describe('Sidebar', () => {
  it('lists all students', () => {
    renderSidebar();
    expect(screen.getByText('First student')).toBeInTheDocument();
    expect(screen.getByText('Second student')).toBeInTheDocument();
  });

  it('marks the active student', () => {
    renderSidebar({ activeStudentId: 'b' });
    expect(screen.getByText('Second student')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('First student')).not.toHaveAttribute('aria-current');
  });

  it('calls onSelect with the clicked student id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderSidebar({ onSelect });
    await user.click(screen.getByText('Second student'));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  describe('options menu', () => {
    it('opens the menu with Rename, Share, and Delete', async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByLabelText('Options for First student'));
      const menu = screen.getByRole('menu', { name: 'First student actions' });
      expect(within(menu).getByRole('menuitem', { name: /rename/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /share/i })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    });

    it('closes on Escape', async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByLabelText('Options for First student'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes when clicking outside of it', async () => {
      const user = userEvent.setup();
      renderSidebar();
      await user.click(screen.getByLabelText('Options for First student'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await user.click(document.body);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('rename', () => {
    async function openRename(user: ReturnType<typeof userEvent.setup>, label = 'First student') {
      await user.click(screen.getByLabelText(`Options for ${label}`));
      await user.click(screen.getByRole('menuitem', { name: /rename/i }));
    }

    it('switches to an inline input when Rename is chosen', async () => {
      const user = userEvent.setup();
      renderSidebar();
      await openRename(user);
      expect(screen.getByLabelText('Rename student')).toHaveValue('First student');
    });

    it('commits the new name on Enter', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      renderSidebar({ onRename });
      await openRename(user);
      const input = screen.getByLabelText('Rename student');
      await user.clear(input);
      await user.type(input, 'J.D.{Enter}');
      expect(onRename).toHaveBeenCalledWith('a', 'J.D.');
    });

    it('does not commit an empty name', async () => {
      const user = userEvent.setup();
      const onRename = vi.fn();
      renderSidebar({ onRename });
      await openRename(user);
      const input = screen.getByLabelText('Rename student');
      await user.clear(input);
      await user.keyboard('{Enter}');
      expect(onRename).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function openDelete(user: ReturnType<typeof userEvent.setup>, label = 'First student') {
      await user.click(screen.getByLabelText(`Options for ${label}`));
      await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    }

    it('asks for confirmation mentioning permanence before deleting', async () => {
      const user = userEvent.setup();
      vi.mocked(window.confirm).mockReturnValue(true);
      const onDelete = vi.fn();
      renderSidebar({ onDelete });

      await openDelete(user);

      expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/no way to recover/i));
      expect(onDelete).toHaveBeenCalledWith('a');
    });

    it('does not delete if the confirmation is declined', async () => {
      const user = userEvent.setup();
      vi.mocked(window.confirm).mockReturnValue(false);
      const onDelete = vi.fn();
      renderSidebar({ onDelete });

      await openDelete(user);

      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('share', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      // @ts-expect-error -- test-only cleanup of a browser API not present in jsdom by default
      delete navigator.share;
      // @ts-expect-error -- test-only cleanup of a browser API not present in jsdom by default
      delete navigator.clipboard;
    });

    async function openShare(user: ReturnType<typeof userEvent.setup>, label = 'First student') {
      await user.click(screen.getByLabelText(`Options for ${label}`));
      await user.click(screen.getByRole('menuitem', { name: /share/i }));
    }

    it('calls the native share API with the student name and session history', async () => {
      const user = userEvent.setup();
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      renderSidebar();

      await openShare(user);

      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('First student'),
          text: expect.stringContaining('First student'),
        })
      );
    });

    it('falls back to copying to the clipboard when the share API is unavailable', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderSidebar();

      await openShare(user);

      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('First student'));
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/copied/i));
    });
  });

  describe('collapsed', () => {
    it('hides the student list and new-student button when collapsed', () => {
      renderSidebar({ collapsed: true });
      expect(screen.queryByText('+ New student')).not.toBeInTheDocument();
      expect(screen.queryByText('First student')).not.toBeInTheDocument();
    });

    it('marks the nav as aria-hidden when collapsed', () => {
      renderSidebar({ collapsed: true });
      expect(screen.getByLabelText('Student list')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
