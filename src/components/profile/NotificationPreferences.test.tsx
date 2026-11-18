import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationPreferences } from './NotificationPreferences';
import { notificationsApi, type NotificationPreferences as Prefs } from '@/api/endpoints/notifications';
import { toast } from 'sonner';

vi.mock('@/api/endpoints/notifications', () => ({
  notificationsApi: { getPreferences: vi.fn(), updatePreferences: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const getPreferences = vi.mocked(notificationsApi.getPreferences);
const updatePreferences = vi.mocked(notificationsApi.updatePreferences);

const DEFAULTS: Prefs = {
  grantsEnabled: true,
  challengesEnabled: true,
  mentorsEnabled: true,
  frequency: 'WEEKLY_DIGEST',
  unsubscribed: false,
};

const switchFor = (name: RegExp) => screen.getByRole('switch', { name });

/** A PATCH that behaves like the backend: applies the change, unsubscribe on its own. */
function backendLike(current: Prefs) {
  updatePreferences.mockImplementation(async (changes) => {
    if (changes.unsubscribed === true) return { ...current, unsubscribed: true };
    return { ...current, ...changes };
  });
}

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPreferences.mockResolvedValue({ ...DEFAULTS });
    backendLike(DEFAULTS);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and shows the current preferences when it opens', async () => {
    getPreferences.mockResolvedValue({ ...DEFAULTS, challengesEnabled: false, frequency: 'IMMEDIATE' });
    render(<NotificationPreferences />);

    expect(await screen.findByRole('switch', { name: /grants/i })).toBeChecked();
    expect(switchFor(/challenges/i)).not.toBeChecked();
    expect(switchFor(/mentors/i)).toBeChecked();
    expect(screen.getByRole('radio', { name: /immediately/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /weekly digest/i })).not.toBeChecked();
    expect(switchFor(/unsubscribe/i)).not.toBeChecked();
    expect(getPreferences).toHaveBeenCalledTimes(1);
  });

  it('saves a content toggle with a PATCH of only that field and confirms it', async () => {
    render(<NotificationPreferences />);
    fireEvent.click(await screen.findByRole('switch', { name: /grants/i }));

    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ grantsEnabled: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Grants notifications off'));
    expect(switchFor(/grants/i)).not.toBeChecked();
  });

  it('saves the frequency', async () => {
    render(<NotificationPreferences />);
    fireEvent.click(await screen.findByRole('radio', { name: /immediately/i }));

    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ frequency: 'IMMEDIATE' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: /immediately/i })).toBeChecked());
  });

  it('puts the old value back and shows an error when saving fails', async () => {
    updatePreferences.mockRejectedValue(new Error('network down'));
    render(<NotificationPreferences />);
    fireEvent.click(await screen.findByRole('switch', { name: /mentors/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(switchFor(/mentors/i)).toBeChecked(); // reverted
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('asks for confirmation before unsubscribing and does nothing when cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<NotificationPreferences />);
    fireEvent.click(await screen.findByRole('switch', { name: /unsubscribe/i }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(updatePreferences).not.toHaveBeenCalled();
    expect(switchFor(/unsubscribe/i)).not.toBeChecked();
  });

  it('unsubscribes after confirmation, sending only unsubscribed=true, and locks the other choices', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<NotificationPreferences />);
    fireEvent.click(await screen.findByRole('switch', { name: /unsubscribe/i }));

    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ unsubscribed: true }));
    expect(await screen.findByRole('status')).toHaveTextContent(/you are unsubscribed/i);
    expect(switchFor(/unsubscribe/i)).toBeChecked();
    expect(switchFor(/grants/i)).toBeDisabled();
    expect(screen.getByRole('radio', { name: /weekly digest/i })).toBeDisabled();
    // the earlier choices are still shown, ready for when they come back
    expect(switchFor(/grants/i)).toBeChecked();
  });

  it('re-subscribes without asking and brings the saved choices back', async () => {
    const saved = { ...DEFAULTS, mentorsEnabled: false, frequency: 'IMMEDIATE' as const, unsubscribed: true };
    getPreferences.mockResolvedValue(saved);
    backendLike(saved);
    const confirm = vi.spyOn(window, 'confirm');
    render(<NotificationPreferences />);
    fireEvent.click(await screen.findByRole('switch', { name: /unsubscribe/i }));

    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ unsubscribed: false }));
    expect(confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(switchFor(/grants/i)).toBeEnabled());
    expect(switchFor(/mentors/i)).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /immediately/i })).toBeChecked();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('disables the controls while a save is running', async () => {
    let finish: (p: Prefs) => void = () => {};
    updatePreferences.mockReturnValue(new Promise<Prefs>((resolve) => { finish = resolve; }));
    render(<NotificationPreferences />);
    fireEvent.click(await screen.findByRole('switch', { name: /challenges/i }));

    await waitFor(() => expect(switchFor(/grants/i)).toBeDisabled());
    finish({ ...DEFAULTS, challengesEnabled: false });
    await waitFor(() => expect(switchFor(/grants/i)).toBeEnabled());
  });

  it('shows an error with a retry when the preferences cannot be loaded', async () => {
    getPreferences.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ ...DEFAULTS });
    render(<NotificationPreferences />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('switch', { name: /grants/i })).toBeChecked();
    expect(getPreferences).toHaveBeenCalledTimes(2);
  });
});
