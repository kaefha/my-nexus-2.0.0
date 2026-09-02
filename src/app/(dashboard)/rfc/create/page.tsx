'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function CreateRfcPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    projectId: '',
    warehouseId: '',
    notes: '',
  });
  
  const [items, setItems] = useState<any[]>([{ materialId: '', requestQty: '', notes: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [projectsRes, warehousesRes, materialsRes] = await Promise.all([
        api.get('/api/projects?limit=100'),
        api.get('/api/warehouse'),
        api.get('/api/materials')
      ]);
      setProjects(projectsRes.data?.data || []);
      setWarehouses(warehousesRes.data?.data || []);
      setMaterials(materialsRes.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      toast.error('Failed to load form data');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // Fetch inventory when warehouse changes
  useEffect(() => {
    if (formData.warehouseId) {
      fetchInventory(formData.warehouseId);
      // Reset items when warehouse changes to prevent invalid stock
      setItems([{ materialId: '', requestQty: '', notes: '' }]);
    }
  }, [formData.warehouseId]);

  const fetchInventory = async (warehouseId: string) => {
    try {
      const { data } = await api.get(`/api/inventory?warehouseId=${warehouseId}&limit=500`);
      // Filter out items with 0 stock
      const availableInventory = (data.data || []).filter((inv: any) => inv.quantity > 0);
      setInventory(availableInventory);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Failed to load warehouse inventory');
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // If material changes, validate if they already selected it
    if (field === 'materialId') {
      const isDuplicate = newItems.some((item, i) => i !== index && item.materialId === value);
      if (isDuplicate) {
        toast.error('This material is already in the list');
        newItems[index][field] = '';
      }
    }
    
    // Validate quantity against stock
    if (field === 'requestQty' && newItems[index].materialId && value !== '') {
      const qty = parseFloat(value);
      const stockItem = inventory.find(i => i.materialId === newItems[index].materialId);
      const availableStock = stockItem ? stockItem.quantity : 0;
      
      if (qty > availableStock) {
        toast.error(`Quantity cannot exceed available stock (\${availableStock})`);
        newItems[index][field] = availableStock.toString();
      } else if (qty < 0) {
        newItems[index][field] = '0';
      }
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { materialId: '', requestQty: '', notes: '' }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length > 0 ? newItems : [{ materialId: '', requestQty: '', notes: '' }]);
  };

  const getAvailableStock = (materialId: string) => {
    if (!materialId) return 0;
    const stockItem = inventory.find(i => i.materialId === materialId);
    return stockItem ? stockItem.quantity : 0;
  };

  const getMaterialUnit = (materialId: string) => {
    if (!materialId) return '';
    const mat = materials.find(m => m.id === materialId);
    return mat ? mat.unit : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId) return toast.error('Please select a project');
    if (!formData.warehouseId) return toast.error('Please select a warehouse');
    
    const validItems = items.filter(item => item.materialId && parseFloat(item.requestQty) > 0);
    if (validItems.length === 0) return toast.error('Please add at least one valid material with quantity > 0');

    setIsSubmitting(true);
    try {
      await api.post('/api/rfc', {
        projectId: formData.projectId,
        warehouseId: formData.warehouseId,
        requestorId: user?.id,
        notes: formData.notes,
        items: validItems.map(item => ({
          materialId: item.materialId,
          requestQty: parseFloat(item.requestQty),
          notes: item.notes
        }))
      });
      
      toast.success('Request for Consumption created successfully');
      router.push('/rfc');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create RFC');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Request for Consumption</h1>
          <p className="text-sm text-muted-foreground">Request materials from warehouse inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="project">Project <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.projectId} 
                          onValueChange={(val) => setFormData({...formData, projectId: val || ''})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.projectCode} - {project.projectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouse">Source Warehouse <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.warehouseId} 
                  onValueChange={(val) => setFormData({...formData, warehouseId: val || ''})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Purpose</Label>
              <Textarea 
                id="notes" 
                placeholder="Briefly explain the purpose of this request..." 
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {formData.warehouseId && inventory.length === 0 && (
          <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">No Inventory Found</h4>
              <p className="text-sm">
                The selected warehouse has no materials in stock. Please select a different warehouse.
              </p>
            </div>
          </div>
        )}

        <Card className={!formData.warehouseId || inventory.length === 0 ? 'opacity-50 pointer-events-none' : ''}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Requested Materials</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Material <span className="text-destructive">*</span></TableHead>
                    <TableHead className="w-[120px]">Available Stock</TableHead>
                    <TableHead className="w-[150px]">Req. Qty <span className="text-destructive">*</span></TableHead>
                    <TableHead className="w-[100px]">Unit</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select 
                          value={item.materialId} 
                          onValueChange={(val) => handleItemChange(index, 'materialId', val || '')}
                        >
                          <SelectTrigger className={!item.materialId ? "text-muted-foreground" : ""}>
                            <SelectValue placeholder="Select Material" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.map((inv) => (
                              <SelectItem key={inv.materialId} value={inv.materialId}>
                                {inv.material?.materialCode} - {inv.material?.materialName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {item.materialId ? (
                          <div className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                            {getAvailableStock(item.materialId)}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          max={getAvailableStock(item.materialId)}
                          placeholder="Qty" 
                          value={item.requestQty}
                          onChange={(e) => handleItemChange(index, 'requestQty', e.target.value)}
                          disabled={!item.materialId}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{getMaterialUnit(item.materialId) || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Optional notes" 
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !formData.warehouseId || inventory.length === 0}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}
