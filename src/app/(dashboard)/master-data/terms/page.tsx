'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Percent } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TermsMasterDataPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    ppn: '11',
    dp: '30'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/api/settings');
      if (data.data) {
        setFormData({
          ppn: data.data.ppn || '11',
          dp: data.data.dp || '30'
        });
      }
    } catch (error) {
      console.error('Failed to load settings', error);
      toast.error('Gagal memuat data terms.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/settings', formData);
      toast.success('Terms & Conditions berhasil disimpan!');
    } catch (error) {
      console.error('Failed to save settings', error);
      toast.error('Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions Settings</h1>
        <p className="text-muted-foreground mt-1">Atur presentase PPN dan Down Payment (DP) untuk dokumen PO.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Terms Configuration
          </CardTitle>
          <CardDescription>Konfigurasi persentase yang akan digunakan sebagai default dalam pembuatan dokumen Purchase Order (PO).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ppn">Persentase PPN (%)</Label>
                <div className="relative">
                  <Input 
                    id="ppn"
                    type="number" 
                    min="0"
                    max="100"
                    value={formData.ppn}
                    onChange={(e) => setFormData({...formData, ppn: e.target.value})}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    %
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Nilai PPN yang ditambahkan ke total belanja (contoh: 11).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dp">Persentase Down Payment / DP (%)</Label>
                <div className="relative">
                  <Input 
                    id="dp"
                    type="number" 
                    min="0"
                    max="100"
                    value={formData.dp}
                    onChange={(e) => setFormData({...formData, dp: e.target.value})}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    %
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Persentase DP awal untuk termin pembayaran vendor (contoh: 30).</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Simpan Perubahan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
