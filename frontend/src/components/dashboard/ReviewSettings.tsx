import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/cards/card';
import { Label } from '@/components/ui/forms/label';
import { Input } from '@/components/ui/forms/input';
import { Button } from '@/components/ui/buttons/button';
import { Switch } from '@/components/ui/forms/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/data-display/select';
import { Spinner } from '@/components/ui/feedback/spinner';
import { ErrorDisplay } from '@/components/ui/feedback';
import { Clock, Bell, CheckCircle } from 'lucide-react';
import reviewsApi, { ReviewSettings } from '@/lib/api/reviews';
import { toast } from 'react-hot-toast';

export function ReviewSettingsPanel() {
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await reviewsApi.getSettings();
        setSettings(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching review settings:', err);
        setError('Failed to load review settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = <K extends keyof ReviewSettings>(field: K, value: ReviewSettings[K]) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [field]: value
    });
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const updatedSettings = await reviewsApi.updateSettings(settings);
      setSettings(updatedSettings);
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Error saving review settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Review Settings</CardTitle>
          <CardDescription>Customize your review experience</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Review Settings</CardTitle>
          <CardDescription>Customize your review experience</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorDisplay message={error} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Review Settings</CardTitle>
        <CardDescription>Customize your review experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Learning Preferences</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="daily-target">Daily review target</Label>
              <Input
                id="daily-target"
                type="number"
                min="1"
                max="100"
                value={settings?.daily_review_target || 0}
                onChange={(e) => handleChange('daily_review_target', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Number of reviews to complete each day
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty threshold</Label>
              <Input
                id="difficulty"
                type="number"
                min="1"
                max="10"
                value={settings?.difficulty_threshold || 5}
                onChange={(e) => handleChange('difficulty_threshold', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Level of challenge in review sessions (1-10)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Notifications</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notification-frequency">Notification frequency</Label>
              <Select
                value={settings?.notification_frequency || 'daily'}
                onValueChange={(value) => handleChange('notification_frequency', value)}
              >
                <SelectTrigger id="notification-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-time">Reminder time</Label>
              <Input
                id="reminder-time"
                type="time"
                value={settings?.review_reminder_time || '09:00'}
                onChange={(e) => handleChange('review_reminder_time', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Time of day to receive review reminders
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Review Behavior</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base" htmlFor="spaced-repetition">Enable spaced repetition</Label>
                <p className="text-sm text-muted-foreground">
                  Optimize review intervals based on your performance
                </p>
              </div>
              <Switch
                id="spaced-repetition"
                checked={settings?.enable_spaced_repetition || false}
                onCheckedChange={(checked: boolean) => handleChange('enable_spaced_repetition', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base" htmlFor="auto-schedule">Automatically schedule reviews</Label>
                <p className="text-sm text-muted-foreground">
                  System will add reviews to your daily queue
                </p>
              </div>
              <Switch
                id="auto-schedule"
                checked={settings?.auto_schedule_reviews || false}
                onCheckedChange={(checked: boolean) => handleChange('auto_schedule_reviews', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base" htmlFor="show-hints">Show hints during reviews</Label>
                <p className="text-sm text-muted-foreground">
                  Display helpful hints when you&apos;re stuck
                </p>
              </div>
              <Switch
                id="show-hints"
                checked={settings?.show_hints || false}
                onCheckedChange={(checked: boolean) => handleChange('show_hints', checked)}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}