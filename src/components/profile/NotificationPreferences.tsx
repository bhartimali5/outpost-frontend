import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';
import {
  notificationsApi,
  type NotificationFrequency,
  type NotificationPreferences as Preferences,
} from '@/api/endpoints/notifications';
import { parseApiError } from '@/utils/errorHandling';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const CONTENT_TOGGLES: { field: 'grantsEnabled' | 'challengesEnabled' | 'mentorsEnabled'; label: string; hint: string }[] = [
  { field: 'grantsEnabled', label: 'Grants', hint: 'New grants and schemes that fit your stage and sector' },
  { field: 'challengesEnabled', label: 'Challenges', hint: 'New corporate challenges in your sector' },
  { field: 'mentorsEnabled', label: 'Mentors', hint: 'Newly approved mentors who fit your startup' },
];

const FREQUENCIES: { value: NotificationFrequency; label: string; hint: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediately', hint: 'One email as soon as something new matches' },
  { value: 'WEEKLY_DIGEST', label: 'Weekly digest', hint: 'One email every Monday morning' },
];

/**
 * Notification preferences on the founder profile (OP-088).
 *
 * Loads the current preferences when it opens. Every change is saved straight away with a PATCH of
 * just that field; while a save is running the controls are disabled, and a failed save puts the
 * previous value back. Unsubscribing asks for confirmation first. While unsubscribed the other
 * choices are kept but disabled, and switching unsubscribe off brings them back.
 */
export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setLoadError(null);
    try {
      setPreferences(await notificationsApi.getPreferences());
    } catch (err) {
      setLoadError(parseApiError(err) || 'Could not load your notification preferences.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (changes: Partial<Preferences>, successMessage: string) => {
    if (!preferences) return;
    const previous = preferences;
    setPreferences({ ...preferences, ...changes }); // show the change at once
    setIsSaving(true);
    try {
      setPreferences(await notificationsApi.updatePreferences(changes));
      toast.success(successMessage);
    } catch (err) {
      setPreferences(previous);
      toast.error(parseApiError(err) || 'Could not save your notification preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const onUnsubscribeToggle = (turnOn: boolean) => {
    if (!turnOn) {
      save({ unsubscribed: false }, 'You will receive notifications again');
      return;
    }
    const confirmed = window.confirm(
      'Unsubscribe from all Outpost notifications? You will stop getting emails about new grants, challenges and mentors. You can turn them back on at any time.'
    );
    if (confirmed) save({ unsubscribed: true }, 'You are unsubscribed from all notifications');
  };

  return (
    <section aria-labelledby="notification-preferences-heading" className="mt-6 bg-paper-light border border-line p-6">
      <h3 id="notification-preferences-heading" className="text-lg font-serif font-bold text-ink mb-4 pb-3 border-b border-line">
        Notification preferences
      </h3>

      {loadError && (
        <div role="alert" className="text-sm text-red-700">
          <p>{loadError}</p>
          <button type="button" onClick={load} className="mt-2 font-medium underline">
            Try again
          </button>
        </div>
      )}

      {!loadError && !preferences && (
        <div className="py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {preferences && (
        <div className="space-y-6">
          {preferences.unsubscribed && (
            <p role="status" className="flex items-center gap-2 bg-[#f5f3ed] border border-line p-3 text-sm text-ink">
              <BellOff className="w-4 h-4" />
              You are unsubscribed, so no notifications are sent. Your choices below are kept for when you turn them back on.
            </p>
          )}

          <fieldset disabled={isSaving || preferences.unsubscribed}>
            <legend className="text-sm font-semibold text-ink mb-3">What to tell me about</legend>
            <div className="space-y-3">
              {CONTENT_TOGGLES.map(({ field, label, hint }) => (
                <Toggle
                  key={field}
                  label={label}
                  hint={hint}
                  checked={preferences[field]}
                  onChange={(value) => save({ [field]: value }, `${label} notifications ${value ? 'on' : 'off'}`)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset disabled={isSaving || preferences.unsubscribed}>
            <legend className="text-sm font-semibold text-ink mb-3">How often</legend>
            <div className="space-y-2">
              {FREQUENCIES.map(({ value, label, hint }) => (
                <label key={value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="notification-frequency"
                    value={value}
                    checked={preferences.frequency === value}
                    onChange={() => save({ frequency: value }, `Frequency set to ${label.toLowerCase()}`)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">{label}</span>
                    <span className="block text-xs text-muted-text">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="pt-4 border-t border-line">
            <Toggle
              label="Unsubscribe from all notifications"
              hint="Stops every notification email, whatever is selected above"
              checked={preferences.unsubscribed}
              disabled={isSaving}
              onChange={onUnsubscribeToggle}
              icon={preferences.unsubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            />
          </div>
        </div>
      )}
    </section>
  );
}

interface ToggleProps {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onChange: (checked: boolean) => void;
}

/** An accessible on/off switch (a checkbox with role="switch"). */
function Toggle({ label, hint, checked, disabled, icon, onChange }: ToggleProps) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span>
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          {icon}
          {label}
        </span>
        <span className="block text-xs text-muted-text">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-9 cursor-pointer accent-ink"
      />
    </label>
  );
}
