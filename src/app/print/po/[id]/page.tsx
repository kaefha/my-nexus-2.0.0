'use client';

import 'paper-css/paper.min.css';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Loader2, Printer } from 'lucide-react';

export default function PoPrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    document.title = `Print_DO_${id}`;
    document.body.classList.add('A4');
    
    api.get(`/api/procurement/${id}`)
      .then(res => {
        setPo(res.data.data);
      })
      .catch(err => {
        console.error('Failed to fetch PO', err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => document.body.classList.remove('A4');
  }, [id]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Preparing Purchase Order...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Purchase Order Not Found</h2>
          <p className="text-muted-foreground">The requested document could not be loaded.</p>
        </div>
      </div>
    );
  }

  const dateNowStr = formatDate(po.expectedDate || new Date().toISOString());
  
  const dateObj = po.expectedDate ? new Date(po.expectedDate) : new Date();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const formattedLocalDate = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  const defaultPoNumber = po.poNumber || '___/MAI/...';
  const docNumber = defaultPoNumber; 

  // Calculations
  const totalPO = po.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)), 0) || 0;
  
  // Use DP/PPN from PO or fallback to global settings or defaults
  const ppnPercent = po.ppnPercent !== undefined ? po.ppnPercent : 11; 
  const dpPercent = po.dpPercent !== undefined ? po.dpPercent : 30;

  const ppn = (totalPO * ppnPercent) / 100;
  const totalPoAndPpn = totalPO + ppn;
  const dpValue = (totalPoAndPpn * dpPercent) / 100;
  const ppnDpValue = (dpValue * ppnPercent) / 100;
  const totalDpAndPpn = dpValue + ppnDpValue;

  return (
    <>
      <div className="fixed top-4 right-4 z-50 print:hidden">
        <button 
          onClick={() => window.print()} 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Document</span>
        </button>
      </div>

      <section className="sheet padding-10mm font-sans text-xs leading-tight tracking-tight" style={{ backgroundColor: 'white', color: 'black' }}>
        {/* Header / Kop Surat */}
        <div className="border-b-[3px] border-black pb-2 mb-4">
          <div className="flex items-center">
            <div className="w-[100px] shrink-0 text-center">
              <img src="/logo.png" alt="MAI Logo" className="w-[80px] h-[80px] object-contain mx-auto" />
              <div className="text-[10px] font-bold mt-1">MITRA AKSES INSANI</div>
            </div>
            <div className="flex-1 text-center pr-[100px]">
              <h1 className="text-2xl font-bold tracking-wide">PT. MITRA AKSES INSANI</h1>
              <h2 className="text-sm font-semibold tracking-widest mb-1">CONTRACTOR & SUPPLIER</h2>
              <p className="text-xs">Jl. Tebet Timur Dalam III G No. 5 RT. 002 RW. 003</p>
              <p className="text-xs">Tebet, Jakarta Selatan 12820</p>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="font-bold">✉</span> pt.mai@mitraaksesinsani.com
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold">☎</span> (021) 8285 0362
            </div>
          </div>
        </div>

        {/* Info Surat */}
        <div className="flex justify-between mb-4">
          <div className="w-1/2">
            <div className="flex">
              <div className="w-[60px]">Kepada</div>
              <div className="w-2">:</div>
              <div className="font-bold">PT. {po.vendor || 'Vendor Terkait'}</div>
            </div>
            <div className="flex">
              <div className="w-[60px]"></div>
              <div className="w-2"></div>
              <div className="text-gray-800">Alamat vendor... (Dari DB)</div>
            </div>
            <div className="flex mt-2">
              <div className="w-[60px]">Up</div>
              <div className="w-2">:</div>
              <div>Bapak/Ibu ...</div>
            </div>
            <div className="flex">
              <div className="w-[60px]">Phone</div>
              <div className="w-2">:</div>
              <div>+62 ...</div>
            </div>
          </div>
          <div className="w-1/2">
            <div className="flex">
              <div className="w-[80px]">No.</div>
              <div className="w-2">:</div>
              <div>{docNumber}</div>
            </div>
            <div className="flex">
              <div className="w-[80px]">Tanggal</div>
              <div className="w-2">:</div>
              <div>{formattedLocalDate}</div>
            </div>
            <div className="flex">
              <div className="w-[80px]">Lokasi</div>
              <div className="w-2">:</div>
              <div>{po.deliverTo || 'Sumatera'}</div>
            </div>
          </div>
        </div>

        <div className="flex mb-4">
          <div className="w-[60px]">Perihal</div>
          <div className="w-2">:</div>
          <div className="font-medium">{po.subject || 'Pengadaan Material'}</div>
        </div>

        {/* Isi Surat */}
        <div className="mb-2">
          <p className="mb-2">Dengan hormat,</p>
          <p className="mb-2 text-justify">
            Sehubungan dengan adanya kebutuhan material untuk pekerjaan yang kami terima, kami menunjuk Saudara sebagai pihak penyedia dengan rincian sebagai berikut:
          </p>
        </div>

        <table className="w-full mb-4 border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-[#b3e0af]">
              <th className="border border-black p-1 text-center w-[5%]">No</th>
              <th className="border border-black p-1 text-left w-[40%]">Jenis dan Ukuran Kabel</th>
              <th className="border border-black p-1 text-center w-[10%]">Volume</th>
              <th className="border border-black p-1 text-center w-[10%]">Satuan</th>
              <th className="border border-black p-1 text-left w-[15%]">Harga Satuan</th>
              <th className="border border-black p-1 text-left w-[20%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items && po.items.map((item: any, idx: number) => {
              const qty = parseFloat(item.quantity) || 0;
              const unitPrice = parseFloat(item.unitPrice) || 0;
              const total = qty * unitPrice;
              return (
                <tr key={idx}>
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 text-left">{item.materialName} {item.notes ? ` - ${item.notes}` : ''}</td>
                  <td className="border border-black p-1 text-center">{qty.toLocaleString('id-ID')}</td>
                  <td className="border border-black p-1 text-center">{item.unit || 'meter'}</td>
                  <td className="border border-black p-1 text-left">
                    <div className="flex justify-between">
                      <span>Rp</span>
                      <span>{unitPrice.toLocaleString('id-ID')}</span>
                    </div>
                  </td>
                  <td className="border border-black p-1 text-left">
                    <div className="flex justify-between">
                      <span>Rp</span>
                      <span>{total.toLocaleString('id-ID')}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Summaries */}
            <tr>
              <td colSpan={4} className="border border-black p-1 font-bold text-center">Total PO</td>
              <td colSpan={2} className="border border-black p-1 font-bold text-right">
                <div className="flex justify-between"><span>Rp</span><span>{totalPO.toLocaleString('id-ID')}</span></div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-black p-1 font-bold text-center">PPN {ppnPercent}%</td>
              <td colSpan={2} className="border border-black p-1 font-bold text-right">
                <div className="flex justify-between"><span>Rp</span><span>{ppn.toLocaleString('id-ID')}</span></div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-black p-1 font-bold text-center">Total PO + PPN</td>
              <td colSpan={2} className="border border-black p-1 font-bold text-right">
                <div className="flex justify-between"><span>Rp</span><span>{totalPoAndPpn.toLocaleString('id-ID')}</span></div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-black p-1 font-bold text-center">DP {dpPercent}%</td>
              <td colSpan={2} className="border border-black p-1 font-bold text-right">
                <div className="flex justify-between"><span>Rp</span><span>{dpValue.toLocaleString('id-ID')}</span></div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-black p-1 font-bold text-center">PPN DP {dpPercent}%</td>
              <td colSpan={2} className="border border-black p-1 font-bold text-right">
                <div className="flex justify-between"><span>Rp</span><span>{ppnDpValue.toLocaleString('id-ID')}</span></div>
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-black p-1 font-bold text-center">Total DP + PPN</td>
              <td colSpan={2} className="border border-black p-1 font-bold text-right">
                <div className="flex justify-between"><span>Rp</span><span>{totalDpAndPpn.toLocaleString('id-ID')}</span></div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Info Tambahan */}
        <div className="mb-4 text-[11px]">
          <p className="mb-2">Adapun kesepakatan pembayaran atas pesanan ini adalah sebagai berikut:</p>
          <p className="mb-0">Pembayaran: DP {dpPercent}%, Pelunasan {100 - dpPercent}% Sesuai Volume Pengambilan</p>
          <p className="mb-4">Franco: Pabrik {po.vendor || 'Vendor Terkait'}</p>

          <p className="font-bold">PT. MITRA AKSES INSANI</p>
          <p>Jl. Arifin Ahmad VI Komp. Vila Alamanda No.77</p>
          <p>Ie Masen Kayee Adang, Syiah Kuala</p>
          <p>Kota Banda Aceh, Aceh</p>
          <p className="font-bold mb-4">NPWP : 82.944.044.5-101.000</p>
          
          <p>Demikian PO ini kami buat. Atas kerja samanya, kami ucapkan terima kasih.</p>
        </div>

        {/* Tanda Tangan */}
        <div className="flex justify-start">
          <div className="w-[200px]">
            <p className="mb-16">Jakarta, {formattedLocalDate}</p>
            <div>
              {/* <div className="border-b border-black w-full mx-auto"></div> */}
              <p className="font-bold leading-none underline mb-1">{po.approverName || 'Nama Approver'}</p>
              <p className="text-xs mt-0.5 leading-none">{po.approverRole ? po.approverRole.replace('_', ' ') : 'APPROVER'}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
