'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Zap, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-4 relative overflow-hidden">
      {/* Dot Pattern Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-[420px] p-2 rounded-[28px] bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_40px_rgba(220,38,38,0.5)] animate-fade-in">
        <div className="bg-white rounded-[20px] p-8 shadow-xl">
          
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1 tracking-tight">Gudang Online</h2>
            <p className="text-sm text-muted-foreground">Login or sign in below</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground ml-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-lg bg-white border-slate-200 focus:bg-slate-100 transition-colors"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
                <button type="button" className="text-[11px] text-muted-foreground hover:text-red-600 transition-colors focus:outline-none">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-lg bg-white border-slate-200 pr-10 focus:bg-slate-100 transition-colors"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 rounded-lg bg-[#111] hover:bg-black text-white font-medium transition-all shadow-md mt-2" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
            </Button>
          </form>

          <div className="flex items-center justify-between mt-8 text-[11px] text-zinc-400 font-medium pt-6 border-t border-zinc-100">
            <a href="#" className="hover:text-zinc-800 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-800 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
