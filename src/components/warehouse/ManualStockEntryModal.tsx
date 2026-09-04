'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface ManualStockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: string;
  onSuccess: () => void;
}

interface StockEntryItem {
  id: string; // unique string for rendering key
  materialId: string;
  materialCode: string;
  materialName: string;
  quantity: string;
  notes: string;
}

export function ManualStockEntryModal({ isOpen, onClose, warehouseId, onSuccess }: ManualStockEntryModalProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [items, setItems] = useState<StockEntryItem[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');

  const fetchMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const { data } = await api.get('/api/materials?limit=1000');
      setMaterials(data.data || []);
    } catch (error) {
      console.error('Failed to fetch materials', error);
      toast.error('Gagal memuat daftar material');
    } finally {
      setLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setSelectedMaterialId('');
      fetchMaterials();
    }
  }, [isOpen]);

  const handleAddMaterial = () => {
    if (!selectedMaterialId) return;

    const material = materials.find(m => m.id === selectedMaterialId);
    if (!material) return;

    // Check if already exists
    if (items.some(item => item.materialId === selectedMaterialId)) {
      toast.warning('Material sudah ada di daftar input');
      return;
    }

    setItems([...items, {
      id: crypto.randomUUID(),
      materialId: material.id,
      materialCode: material.materialCode,
      materialName: material.materialName,
      quantity: '',
      notes: ''
    }]);

    setSelectedMaterialId(''); // reset selection
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof StockEntryItem, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      toast.error('Warehouse ID tidak valid');
      return;
    }

    if (items.length === 0) {
      toast.error('Daftar material masih kosong');
      return;
    }

    // Validate quantities
    const hasInvalidQuantity = items.some(item => !item.quantity || Number(item.quantity) <= 0);
    if (hasInvalidQuantity) {
      toast.error('Pastikan semua jumlah/kuantitas telah diisi dengan benar (minimal 1)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        warehouseId,
        items: items.map(item => ({
          materialId: item.materialId,
          quantity: Number(item.quantity),
          notes: item.notes
        }))
      };

      await api.post('/api/inventory/manual-entry', payload);
      
      toast.success('Stok berhasil ditambahkan ke gudang!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to add manual stock:', error);
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menambahkan stok');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Input Manual Stok (Batch)</DialogTitle>
          <DialogDescription>
            Pilih material satu per satu, tentukan jumlahnya, lalu simpan sekaligus ke dalam gudang.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-end gap-3 mt-4">
          <div className="flex-1 grid gap-2">
            <Label htmlFor="material-select">Cari & Pilih Material</Label>
            <Select value={selectedMaterialId} onValueChange={(val) => setSelectedMaterialId(val || '')} disabled={loadingMaterials}>
              <SelectTrigger id="material-select">
                <SelectValue placeholder={loadingMaterials ? "Memuat..." : "Pilih material dari master data..."}>
                  {selectedMaterialId && materials.find(m => m.id === selectedMaterialId) 
                    ? `${materials.find(m => m.id === selectedMaterialId)?.materialCode} - ${materials.find(m => m.id === selectedMaterialId)?.materialName}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {`${m.materialCode} - ${m.materialName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={handleAddMaterial} disabled={!selectedMaterialId}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah ke List
          </Button>
        </div>

        <div className="border rounded-md mt-6 flex-1 overflow-hidden flex flex-col min-h-[250px]">
          <div className="bg-muted px-4 py-2 text-sm font-medium grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4">Material</div>
            <div className="col-span-2">Jumlah</div>
            <div className="col-span-5">Catatan</div>
            <div className="col-span-1 text-center">Aksi</div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground p-8 text-sm">
                Belum ada material yang ditambahkan ke daftar.
              </div>
            ) : (
              <div className="flex flex-col">
                {items.map((item, index) => (
                  <div key={item.id} className={`px-4 py-3 grid grid-cols-12 gap-4 items-start ${index !== items.length - 1 ? 'border-b' : ''}`}>
                    <div className="col-span-4">
                      <div className="text-sm font-medium leading-none">{item.materialCode}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.materialName}</div>
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        placeholder="0"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-5">
                      <Textarea 
                        value={item.notes} 
                        onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                        placeholder="Catatan..."
                        className="h-8 min-h-[32px] py-1.5 resize-none text-sm"
                        rows={1}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || items.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Stok ({items.length} item)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
