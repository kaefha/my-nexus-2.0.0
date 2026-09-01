'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import RealTrackingMap from '@/components/map/RealTrackingMap';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { compressImage } from '@/lib/utils';

export default function LogisticsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doData, setDoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [adminEvidenceBase64, setAdminEvidenceBase64] = useState<string | null>(null);
  const [isSubmittingAdminEvidence, setIsSubmittingAdminEvidence] = useState(false);

  const handleAdminFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setAdminEvidenceBase64(compressed);
      } catch (err) {
        console.error('Compression failed', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAdminEvidenceBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const submitAdminEvidence = async () => {
    if (!adminEvidenceBase64) return;
    setIsSubmittingAdminEvidence(true);
    try {
      await api.patch(`/api/logistics/${doData.id}`, {
        status: 'DELIVERED',
        evidence: adminEvidenceBase64
      });
      toast.success('Evidence recorded, status updated to DELIVERED');
      setEvidenceModalOpen(false);
      setAdminEvidenceBase64(null);
      fetchDO();
    } catch (error) {
      console.error('Failed to submit evidence', error);
      toast.error('Failed to update status');
    } finally {
      setIsSubmittingAdminEvidence(false);
    }
  };

  const fetchDO = async () => {
    try {
      const res = await api.get(`/api/logistics/${id}`);
      setDoData(res.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load DO details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDO();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Delivery Order not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/logistics')}>
          Back to Logistics
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full min-h-[calc(100vh-100px)]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/logistics')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DO Details: {doData.doNumber}</h1>
          <p className="text-sm text-muted-foreground">Status: {doData.status}</p>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-[600px] rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <RealTrackingMap selectedDO={doData} />
        
        {/* Render Evidence if it exists */}
        {doData.evidence && (
          <div className="absolute top-6 left-6 z-40 bg-card/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-border w-[250px] sm:w-[300px]">
            <p className="text-sm font-semibold text-foreground mb-2">Delivery Evidence</p>
            <div className="rounded-md overflow-hidden border border-border">
              <img src={doData.evidence} alt="Evidence" className="w-full h-auto object-cover max-h-[300px]" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Uploaded upon delivery</p>
          </div>
        )}
        
        {/* Admin actions (Mark as delivered / Evidence upload) */}
        {(doData.status === 'SHIPPING' || doData.status === 'WAITING') && (
          <div className="absolute bottom-6 right-6 z-40 bg-card/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-border min-w-[250px]">
            <p className="text-sm font-medium mb-2 text-foreground">Admin Actions</p>
            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setEvidenceModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload Evidence (Receive)
            </Button>
          </div>
        )}
      </div>

      <Dialog open={evidenceModalOpen} onOpenChange={(open) => !open && setEvidenceModalOpen(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Upload Delivery Evidence</DialogTitle>
            <DialogDescription>Provide photo evidence to mark this delivery as completed.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-evidence" className="cursor-pointer flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                {adminEvidenceBase64 ? (
                  <img src={adminEvidenceBase64} alt="Evidence Preview" className="h-full object-cover rounded-md p-1" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Tap to Select Photo</span>
                  </div>
                )}
                <Input 
                  id="admin-evidence" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAdminFileChange}
                />
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEvidenceModalOpen(false);
              setAdminEvidenceBase64(null);
            }} disabled={isSubmittingAdminEvidence}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={submitAdminEvidence} disabled={!adminEvidenceBase64 || isSubmittingAdminEvidence}>
              {isSubmittingAdminEvidence ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
