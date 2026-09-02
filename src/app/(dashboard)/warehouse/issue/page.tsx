'use client';

import { useEffect, useState } from 'react';
import { PackageMinus, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function MaterialIssuePage() {
  const [rfcs, setRfcs] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  const [selectedRfcId, setSelectedRfcId] = useState<string>('');
  const [selectedRfc, setSelectedRfc] = useState<any>(null);
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [issuedItems, setIssuedItems] = useState<Record<string, number>>({});
  
  const [loadingRFCs, setLoadingRFCs] = useState(true);
  const [isFetchingRfc, setIsFetchingRfc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch APPROVED RFCs
        const rfcRes = await api.get('/api/pr', { params: { status: 'APPROVED' } });
        setRfcs(rfcRes.data?.data || []);

        // Fetch Warehouses
        const whRes = await api.get('/api/warehouse');
        setWarehouses(whRes.data?.data || []);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setLoadingRFCs(false);
      }
    };
    
    fetchData();
  }, []);

  const handleRfcChange = async (rfcId: string) => {
    setSelectedRfcId(rfcId);
    setSuccess(false);
    if (!rfcId || rfcId === 'none') {
      setSelectedRfc(null);
      setIssuedItems({});
      setSelectedWarehouseId('');
      return;
    }
    
    setIsFetchingRfc(true);
    try {
      const { data } = await api.get(`/api/pr/${rfcId}`);
      if (data?.data) {
        setSelectedRfc(data.data);
        
        // Auto-fill issued quantities with the requested quantities
        const initialQtys: Record<string, number> = {};
        (data.data.items || []).forEach((item: any) => {
          initialQtys[item.materialId] = item.requestQty;
        });
        setIssuedItems(initialQtys);
      }
    } catch (error) {
      console.error('Failed to fetch RFC details:', error);
    } finally {
      setIsFetchingRfc(false);
    }
  };

  const handleQtyChange = (materialId: string, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) && val !== '') return;
    
    setIssuedItems(prev => ({
      ...prev,
      [materialId]: isNaN(num) ? 0 : num
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfcId || !selectedWarehouseId || !selectedRfc?.items?.length) return;
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        rfcId: selectedRfcId,
        warehouseId: selectedWarehouseId,
        items: selectedRfc.items.map((item: any) => ({
          materialId: item.materialId,
          issuedQty: issuedItems[item.materialId] || 0
        })).filter((i: any) => i.issuedQty > 0)
      };
      
      await api.post('/api/warehouse/issue', payload);
      
      setSuccess(true);
      setSelectedRfcId('');
      setSelectedRfc(null);
      setIssuedItems({});
      setSelectedWarehouseId('');
      
      // Refresh RFC list
      const rfcRes = await api.get('/api/pr', { params: { status: 'APPROVED' } });
      setRfcs(rfcRes.data?.data || []);
      
    } catch (error) {
      console.error('Failed to issue materials:', error);
      alert('Failed to process material issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Material Issue (Barang Keluar)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Issue materials from the warehouse to fulfill an approved Request For Consumption (RFC).
        </p>
      </div>
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium">Materials issued successfully and inventory has been updated!</p>
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Document</CardTitle>
              <CardDescription>Choose the RFC to fulfill</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rfcSelect">Approved RFC</Label>
                <Select value={selectedRfcId} onValueChange={(val) => handleRfcChange(val || "")} disabled={loadingRFCs}>
                  <SelectTrigger id="rfcSelect">
                    <SelectValue placeholder={loadingRFCs ? 'Loading...' : 'Select RFC'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select RFC --</SelectItem>
                    {rfcs.map(rfc => (
                      <SelectItem key={rfc.id} value={rfc.id}>{rfc.rfcNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedRfcId && selectedRfcId !== 'none' && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm"><strong>Project:</strong> {selectedRfc?.project?.projectName || '-'}</p>
                  <p className="text-sm"><strong>Requestor:</strong> {selectedRfc?.requestorName || '-'}</p>
                  <p className="text-sm"><strong>Required Date:</strong> {selectedRfc?.requiredDate ? new Date(selectedRfc.requiredDate).toLocaleDateString() : '-'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className={!selectedRfcId || selectedRfcId === 'none' ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>Issue Items</CardTitle>
              <CardDescription>Verify quantities and select the source warehouse</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingRfc ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : selectedRfc ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="warehouseSelect">Source Warehouse *</Label>
                      <Select value={selectedWarehouseId} onValueChange={(val) => setSelectedWarehouseId(val || "")} required>
                        <SelectTrigger id="warehouseSelect">
                          <SelectValue placeholder="Select warehouse to issue from" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Requested Qty</TableHead>
                          <TableHead className="text-right">Issue Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRfc.items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.materialName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.requestQty} <span className="text-muted-foreground font-normal text-xs">{item.unit}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 justify-end">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max={item.requestQty}
                                  value={issuedItems[item.materialId] ?? ''}
                                  onChange={(e) => handleQtyChange(item.materialId, e.target.value)}
                                  className="w-20 text-right"
                                />
                                <span className="text-xs text-muted-foreground w-8">{item.unit}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !selectedWarehouseId}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      Process Material Issue
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageMinus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Select an RFC to begin</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
