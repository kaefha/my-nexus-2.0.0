'use client';

import { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle2, AlertCircle, Loader2, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { compressImage } from '@/lib/utils';
import { toast } from 'sonner';

export default function DriverTrackingPage() {
  const params = useParams();
  const doId = params?.id as string;

  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'tracking' | 'error' | 'success' | 'completed'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // Evidence upload state
  const [isCompleting, setIsCompleting] = useState(false);
  const [evidenceBase64, setEvidenceBase64] = useState<string | null>(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('tracking');
    setIsTracking(true);

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        
        try {
          await api.post(`/api/logistics/${doId}/tracking`, { latitude, longitude });
          setLastUpdate(new Date());
          setStatus('success');
        } catch (error) {
          console.error("Failed to sync location", error);
          setStatus('error');
          setErrorMsg('Failed to sync location to server. Retrying...');
        }
      },
      (error) => {
        setStatus('error');
        setIsTracking(false);
        setErrorMsg(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    setIsTracking(false);
    setStatus('idle');
    setWatchId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setEvidenceBase64(compressed);
      } catch (err) {
        console.error('Compression failed', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setEvidenceBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const submitEvidence = async () => {
    if (!evidenceBase64) return;
    
    setIsSubmittingEvidence(true);
    try {
      // API call to finish delivery
      await api.patch(`/api/logistics/${doId}`, {
        status: 'DELIVERED',
        evidence: evidenceBase64
      });
      toast.success('Bukti pengantaran berhasil diupload!');
      setStatus('completed');
      stopTracking();
    } catch (error: any) {
      console.error('Failed to submit evidence', error);
      setStatus('error');
      const errorMsg = error.response?.data?.message || 'Failed to submit evidence';
      setErrorMsg(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-emerald-200">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-700">Delivery Completed</h2>
            <p className="text-slate-600">
              Evidence has been uploaded and the delivery is successfully marked as complete. Thank you!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Delivery Tracking</CardTitle>
          <CardDescription>
            ID: {doId?.slice(0, 8)}...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-2">Instructions</h3>
            <p className="text-sm text-slate-500">
              Please click "Update Posisi" to start sending your GPS location while driving. 
              Once you have arrived, click "Selesaikan Pengantaran" to upload a photo proof of delivery.
            </p>
          </div>

          {!isTracking && !isCompleting && (
            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg h-14"
                onClick={startTracking}
              >
                <MapPin className="mr-2 h-5 w-5" /> Update Posisi
              </Button>
              <Button 
                variant="outline"
                size="lg" 
                className="w-full text-lg h-14 border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => setIsCompleting(true)}
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> Selesaikan Pengantaran
              </Button>
            </div>
          )}

          {isTracking && !isCompleting && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100 rounded-xl animate-pulse" />
                <div className="relative bg-white border border-blue-200 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                  <div className="text-left flex-1">
                    <p className="font-bold text-blue-700">Tracking Active</p>
                    <p className="text-xs text-blue-600 font-mono">
                      {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Waiting for GPS...'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="destructive"
                  className="flex-1 h-12"
                  onClick={stopTracking}
                >
                  Stop Tracking
                </Button>
                <Button 
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setIsCompleting(true)}
                >
                  Selesai
                </Button>
              </div>
            </div>
          )}

          {isCompleting && (
            <div className="space-y-4 text-left border rounded-xl p-4 bg-slate-50">
              <h3 className="font-semibold text-lg text-slate-800">Upload Evidence</h3>
              <p className="text-sm text-slate-500">Please upload a photo of the delivered goods.</p>
              
              <div className="space-y-2">
                <Label htmlFor="evidence" className="cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                  {evidenceBase64 ? (
                    <img src={evidenceBase64} alt="Evidence Preview" className="h-full object-cover rounded-md" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Camera className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-sm text-slate-500">Tap to Take Photo or Upload</span>
                    </div>
                  )}
                  <Input 
                    id="evidence" 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setIsCompleting(false);
                  setEvidenceBase64(null);
                }}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!evidenceBase64 || isSubmittingEvidence} onClick={submitEvidence}>
                  {isSubmittingEvidence ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Submit
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && lastUpdate && !isCompleting && (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Last synced: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-left">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isTracking && !coords && status !== 'error' && !isCompleting && (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Acquiring GPS signal...
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
