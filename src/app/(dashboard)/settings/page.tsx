'use client';

import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

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
    </div>
  );
}
