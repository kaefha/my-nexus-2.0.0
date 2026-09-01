'use client';

import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Laptop, KeyRound, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setIsSubmitting(true);
    try {
      await api.put('/api/users', { id: user?.id, password });
      toast.success('Password berhasil diubah!');
      setPassword('');
    } catch (error) {
      toast.error('Gagal mengubah password');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage application settings and appearance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the system looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Theme</Label>
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'} 
                  className="w-32 gap-2"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4" /> Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'} 
                  className="w-32 gap-2"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4" /> Dark
                </Button>
                <Button 
                  variant={theme === 'system' ? 'default' : 'outline'} 
                  className="w-32 gap-2"
                  onClick={() => setTheme('system')}
                >
                  <Laptop className="w-4 h-4" /> System
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Select your preferred theme. System theme will automatically match your OS settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting || !password}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
