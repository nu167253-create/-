import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { RequestItem } from '../types/request';
import { getStatusLabelTh, getPriorityLabelTh } from '../utils/storage';
import { 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  QrCode, 
  FileText, 
  CheckCircle2, 
  Camera,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  HardDrive,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Phone,
  User,
  CheckCheck,
  FileCheck,
  FileDown,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface OfficialDocumentPrintProps {
  request: RequestItem;
  onBack?: () => void;
  onOpenDrive?: () => void;
}

export const OfficialDocumentPrint: React.FC<OfficialDocumentPrintProps> = ({
  request,
  onBack,
  onOpenDrive
}) => {
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [useThaiBuddhistYear, setUseThaiBuddhistYear] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfFitMode, setPdfFitMode] = useState<'auto_multipage' | 'fit_one_page'>('auto_multipage');
  const documentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!documentRef.current || isGeneratingPdf) return;

    try {
      setIsGeneratingPdf(true);
      setPdfError(null);

      const element = documentRef.current;

      // Render the DOM node to high-res canvas (scale 2 for crisp 300dpi output)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.borderRadius = '0px';
          clonedElement.style.margin = '0 auto';
        }
      });

      // A4 dimensions in mm: 210 x 297 mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 8; // 8mm margin
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const totalRenderedHeightInMm = (canvas.height * contentWidth) / canvas.width;

      if (pdfFitMode === 'fit_one_page' || totalRenderedHeightInMm <= contentHeight) {
        // Fits onto single page
        const scale = Math.min(1, contentHeight / totalRenderedHeightInMm);
        const finalW = contentWidth * scale;
        const finalH = totalRenderedHeightInMm * scale;
        const offsetX = margin + (contentWidth - finalW) / 2;
        const offsetY = margin + (contentHeight - finalH) / 2;

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalW, finalH, undefined, 'FAST');
      } else {
        // Multi-page slicing without vertical distortion
        const pxPerMm = canvas.width / contentWidth;
        const pageCanvasHeight = Math.floor(contentHeight * pxPerMm);

        let renderedHeight = 0;
        let pageIndex = 0;

        while (renderedHeight < canvas.height) {
          if (pageIndex > 0) {
            pdf.addPage('a4', 'portrait');
          }

          const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
          const currentSliceHeightInMm = (currentSliceHeight * contentWidth) / canvas.width;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = currentSliceHeight;
          const ctx = pageCanvas.getContext('2d');

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              renderedHeight,
              canvas.width,
              currentSliceHeight,
              0,
              0,
              canvas.width,
              currentSliceHeight
            );
          }

          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, currentSliceHeightInMm, undefined, 'FAST');

          renderedHeight += currentSliceHeight;
          pageIndex++;
        }
      }

      // Safe filename with request ID and thai title
      const cleanId = (request.id || 'REQUEST').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `คำร้อง_${cleanId}_เทศบาลเมืองชัยภูมิ.pdf`;
      pdf.save(filename);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF with jsPDF:', err);
      setPdfError('ไม่สามารถสร้างไฟล์ PDF ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือใช้ปุ่มพิมพ์เอกสาร');
      setTimeout(() => setPdfError(null), 6000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const createdDate = new Date(request.createdAt);
  const currentPrintDate = new Date();

  const formatThaiDate = (date: Date, includeYearBE = true) => {
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate();
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const month = months[date.getMonth()];
    const year = includeYearBE ? date.getFullYear() + 543 : date.getFullYear();
    return `${day} ${month} พ.ศ. ${year}`;
  };

  const formatThaiTime = (date: Date) => {
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const dateOnlyFormatted = formatThaiDate(createdDate, useThaiBuddhistYear);
  const timeOnlyFormatted = createdDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const printTimestampFormatted = `${formatThaiDate(currentPrintDate, true)} เวลา ${formatThaiTime(currentPrintDate)} น.`;

  const isCctvCategory = request.category === 'cctv' || !!request.details.cctvLocation;
  const d = request.details || {};

  const footageDateFormatted = d.footageDate 
    ? formatThaiDate(new Date(d.footageDate), useThaiBuddhistYear)
    : dateOnlyFormatted;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Enhanced Print-Specific CSS Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Sarabun', 'Prompt', 'TH Sarabun New', serif, sans-serif !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          .official-paper {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            background: #ffffff !important;
            page-break-inside: auto !important;
          }
          .print-header-container {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 3.5mm !important;
            margin-bottom: 3mm !important;
          }
          .print-header-top-banner {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid rgba(120, 53, 15, 0.25) !important;
            padding-bottom: 1.5mm !important;
            margin-bottom: 2mm !important;
            font-size: 8pt !important;
          }
          .print-header-row {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            width: 100% !important;
            gap: 12px !important;
          }
          .print-header-seal {
            width: 80px !important;
            min-width: 80px !important;
            max-width: 80px !important;
            flex-shrink: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .print-header-center {
            flex: 1 1 auto !important;
            text-align: center !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            padding: 0 4px !important;
          }
          .print-header-meta {
            width: 195px !important;
            min-width: 195px !important;
            max-width: 195px !important;
            flex-shrink: 0 !important;
            border: 1.5px solid #0f172a !important;
            border-radius: 6px !important;
            padding: 5px 8px !important;
            background-color: #f8fafc !important;
            font-size: 8.5pt !important;
            line-height: 1.35 !important;
          }
          .print-document-title {
            text-align: center !important;
            margin-top: 3mm !important;
            padding-top: 2mm !important;
            border-top: 1px solid #e2e8f0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-document-title h1 {
            font-size: 14pt !important;
            font-weight: 800 !important;
            color: #020617 !important;
            line-height: 1.35 !important;
            margin: 0 !important;
          }
          .print-addressee {
            font-size: 11pt !important;
            font-weight: 700 !important;
            color: #020617 !important;
            margin-top: 2mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-data-section {
            font-size: 10pt !important;
            line-height: 1.45 !important;
          }
          .print-grid-two-col {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
          .print-grid-intervals {
            display: grid !important;
            grid-template-columns: 4fr 5fr 3fr !important;
            gap: 6px !important;
          }
          .print-approval-chain {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 3.5mm !important;
            padding-top: 3mm !important;
            border-top: 2px solid #0f172a !important;
          }
          .print-handover-signatures {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
            margin-top: 3.5mm !important;
            padding-top: 3mm !important;
            border-top: 1px solid #cbd5e1 !important;
          }
          .print-legal-warning {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #fecdd3 !important;
            background-color: #fff1f2 !important;
            padding: 6px 10px !important;
            border-radius: 6px !important;
            font-size: 8pt !important;
            line-height: 1.35 !important;
            margin-top: 3mm !important;
          }
          .print-footer-container {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1.5px solid #0f172a !important;
            padding-top: 2.5mm !important;
            margin-top: 4mm !important;
            font-size: 8pt !important;
            font-family: monospace, 'Courier New', monospace !important;
            color: #475569 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-break-before {
            break-before: page !important;
            page-break-before: always !important;
          }
          .official-seal-svg {
            filter: grayscale(10%) contrast(110%);
          }
          /* Remove borders that cause clipping in print */
          input[type="checkbox"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Top Action Toolbar (Hidden during print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับ</span>
          </button>
        ) : <div />}

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Watermark toggle */}
          <button
            type="button"
            onClick={() => setShowWatermark(!showWatermark)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
              showWatermark 
                ? 'bg-purple-50 text-purple-900 border-purple-300' 
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="เปิด/ปิด ลายน้ำเอกสารทางการ"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>ลายน้ำ: {showWatermark ? 'เปิด' : 'ปิด'}</span>
          </button>

          {/* Thai Buddhist Year Toggle */}
          <button
            type="button"
            onClick={() => setUseThaiBuddhistYear(!useThaiBuddhistYear)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="สลับการแสดงผล พ.ศ. และ ค.ศ."
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>ปี: {useThaiBuddhistYear ? 'พ.ศ.' : 'ค.ศ.'}</span>
          </button>

          {/* PDF Page Fitting Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setPdfFitMode('auto_multipage')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                pdfFitMode === 'auto_multipage'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="แบ่งหน้าตามสัดส่วนกระดาษ A4 อัตโนมัติ"
            >
              หน้า A4 อัตโนมัติ
            </button>
            <button
              type="button"
              onClick={() => setPdfFitMode('fit_one_page')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                pdfFitMode === 'fit_one_page'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ย่อสัดส่วนเนื้อหาให้พอดีใน 1 แผ่น A4"
            >
              พอดี 1 แผ่น
            </button>
          </div>

          {/* Toggle Print Preview Mode Button */}
          <button
            type="button"
            onClick={() => setIsPrintPreview(!isPrintPreview)}
            className={`inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              isPrintPreview
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 ring-2 ring-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
            title="จำลองหน้าจอกระดาษ A4 และการจัดวางเสมือนจริง"
          >
            {isPrintPreview ? (
              <>
                <EyeOff className="w-4 h-4 text-amber-100" />
                <span>ปิดโหมดจำลอง A4</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-amber-600" />
                <span>จำลองโหมดพิมพ์ (Print Preview)</span>
              </>
            )}
          </button>

          {onOpenDrive && (
            <button
              onClick={onOpenDrive}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <HardDrive className="w-4 h-4 text-emerald-200" />
              <span>Google Drive</span>
            </button>
          )}

          {/* Primary Action: Direct Download PDF using jsPDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className={`inline-flex items-center gap-2 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ${
              pdfSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300'
                : isGeneratingPdf
                ? 'bg-blue-400 cursor-not-allowed opacity-90'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800'
            }`}
            title="สร้างและบันทึกไฟล์ PDF ด้วย jsPDF พร้อมตราประจำเทศบาลเมืองชัยภูมิ และตราครุฑ"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>กำลังสร้างไฟล์ PDF...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>ดาวน์โหลดสำเร็จ!</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-emerald-100" />
                <span>ดาวน์โหลดไฟล์ PDF</span>
              </>
            )}
          </button>

          {/* Browser System Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
            title="เปิดหน้าต่างสั่งพิมพ์ของเบราว์เซอร์"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>พิมพ์ผ่านเครื่องพิมพ์</span>
          </button>
        </div>
      </div>

      {/* PDF Success Feedback Banner */}
      {pdfSuccess && (
        <div className="no-print bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl shadow-xs flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-extrabold text-emerald-950">
                ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว (jsPDF Engine)
              </p>
              <p className="text-[11px] text-emerald-700">
                ไฟล์เอกสารประกอบด้วยตราครุฑ ตราประจำเทศบาลเมืองชัยภูมิ และข้อมูลคำร้อง {request.id} พร้อมส่งมอบหรือจัดเก็บ
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2.5 py-1 rounded-lg">
            A4 Portrait
          </span>
        </div>
      )}

      {/* PDF Error Notification Banner */}
      {pdfError && (
        <div className="no-print bg-rose-50 border border-rose-300 text-rose-900 px-4 py-3 rounded-2xl shadow-xs flex items-center gap-3 text-xs animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="font-medium text-rose-950">{pdfError}</p>
        </div>
      )}

      {/* Print Preview Mode Banner Notification */}
      {isPrintPreview && (
        <div className="no-print bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-xl">
              <Eye className="w-4 h-4 text-amber-100" />
            </div>
            <div>
              <span className="font-extrabold text-white">
                🔍 โหมดจำลองหน้าพิมพ์กระดาษราชการ A4 (Standard Government Print Layout)
              </span>
              <p className="text-[11px] text-amber-100 pt-0.5">
                หัวเอกสารประกอบด้วยตราครุฑพระราชทานและตราประจำเทศบาลเมืองชัยภูมิ พร้อมการจัดวางวันที่ เวลา และสายงานอนุมัติมาตรฐาน 4 ระดับ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPrintPreview(false)}
            className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1 rounded-xl text-[11px] border border-white/30 transition-colors cursor-pointer shrink-0"
          >
            ปิดมุมมองนี้
          </button>
        </div>
      )}

      {/* Official Thai Document Paper */}
      <div 
        ref={documentRef}
        id={`official-document-${request.id}`}
        className={`official-paper bg-white rounded-xl border document-font text-slate-900 space-y-5 relative overflow-hidden transition-all duration-300 ${
          isPrintPreview
            ? 'p-8 md:p-12 shadow-2xl ring-2 ring-amber-400 border-amber-300 max-w-[210mm] mx-auto min-h-[297mm]'
            : 'p-6 md:p-10 border-slate-300 shadow-md'
        }`}
      >
        {/* Background Official Watermark (Visible when toggled on & in print) */}
        {showWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
            <div className="transform -rotate-30 text-slate-200/50 text-center space-y-2 opacity-40 font-extrabold">
              <div className="text-4xl md:text-5xl tracking-widest uppercase">เทศบาลเมืองชัยภูมิ</div>
              <div className="text-xl md:text-2xl tracking-wider text-slate-300">CHAIYAPHUM MUNICIPALITY • OFFICIAL RECORD</div>
              <div className="text-xs md:text-sm font-mono text-slate-400">VERIFIED ELECTRONIC SUBMISSION #{request.id}</div>
            </div>
          </div>
        )}

        {/* Top Official Watermarked Header Banner */}
        <div className="print-header-top-banner border-b border-amber-900/20 pb-1.5 flex items-center justify-between text-[10px] text-slate-600 tracking-wide">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <Award className="w-3.5 h-3.5 text-amber-800" />
            <span>เทศบาลเมืองชัยภูมิ • ระบบสารบรรณและคำร้องบริการประชาชนอิเล็กทรอนิกส์ (e-Service Portal)</span>
          </div>
          <div className="font-mono text-slate-500 text-[9px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>เอกสารราชการอิเล็กทรอนิกส์ตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์</span>
          </div>
        </div>

        {/* =========================================================
            FORMAL HEADER WITH MUNICIPAL SEAL & GARUDA EMBLEM
           ========================================================= */}
        <div className="print-header-container relative border-b-2 border-slate-900 pb-4 pt-1">
          
          <div className="print-header-row flex items-start justify-between gap-4">
            
            {/* Left Box: Municipal Logo / Seal Emblem */}
            <div className="print-header-seal w-24 shrink-0 flex flex-col items-center text-center">
              <div className="w-[72px] h-[72px] rounded-full border-2 border-amber-800 p-1 flex items-center justify-center bg-amber-50/60 shadow-2xs">
                {/* Chaiyaphum Municipal Seal Vector Illustration */}
                <svg 
                  viewBox="0 0 100 100" 
                  width="68" 
                  height="68" 
                  className="w-full h-full text-amber-900 fill-current official-seal-svg"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                >
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#78350f" strokeWidth="2.5" strokeDasharray="3 1.5" />
                  <circle cx="50" cy="50" r="41" fill="none" stroke="#92400e" strokeWidth="1.5" />
                  {/* Prang Ku / Monument Monument Silhouette */}
                  <path d="M45,20 L55,20 L57,32 L64,36 L64,48 L68,54 L68,78 L32,78 L32,54 L36,48 L36,36 L43,32 Z" fill="#92400e" opacity="0.85" />
                  <rect x="42" y="24" width="16" height="6" fill="#fef3c7" />
                  <rect x="44" y="40" width="12" height="14" rx="2" fill="#fef3c7" />
                  <rect x="46" y="60" width="8" height="18" fill="#fef3c7" />
                  {/* Lotus petals around base */}
                  <path d="M30,80 Q50,72 70,80 Q50,86 30,80 Z" fill="#b45309" />
                  <path d="M22,84 Q50,76 78,84 Q50,92 22,84 Z" fill="#78350f" />
                </svg>
              </div>
              <span className="text-[9px] font-bold text-amber-950 mt-1 leading-tight">
                ตราประจำเทศบาล<br />เมืองชัยภูมิ
              </span>
            </div>

            {/* Center: Royal Thai Garuda Emblem & Official Title */}
            <div className="print-header-center flex-1 text-center space-y-1 px-2">
              {/* Royal Thai Garuda Emblem */}
              <div className="w-16 h-16 mx-auto flex items-center justify-center">
                <svg 
                  viewBox="0 0 100 100" 
                  width="64" 
                  height="64" 
                  className="w-full h-full fill-current text-amber-900 drop-shadow-2xs"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }}
                >
                  <path d="M50,5 L54,18 L68,10 L60,24 L75,22 L65,34 L82,36 L68,46 L88,52 L70,58 L85,68 L66,68 L72,82 L58,76 L58,92 L50,85 L42,92 L42,76 L28,82 L34,68 L15,68 L30,58 L12,52 L32,46 L18,36 L35,34 L25,22 L40,24 L32,10 L46,18 Z" fill="#92400e" opacity="0.95" />
                  <circle cx="50" cy="45" r="16" fill="#78350f" />
                  <path d="M50,22 L55,34 L65,34 L57,40 L60,50 L50,44 L40,50 L43,40 L35,34 L45,34 Z" fill="#d97706" />
                  <circle cx="50" cy="45" r="6" fill="#ffffff" />
                </svg>
              </div>

              <div className="pt-1">
                <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900">
                  เทศบาลเมืองชัยภูมิ อำเภอเมืองชัยภูมิ จังหวัดชัยภูมิ
                </h2>
                <p className="text-xs font-semibold text-slate-700">
                  Chaiyaphum Town Municipality, Chaiyaphum Province 36000
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  โทรศัพท์ 044-811-378 • โทรสาร 044-811-379 • www.chaiyaphumcity.go.th
                </p>
              </div>
            </div>

            {/* Right Box: Official Registration Metadata Box (สำหรับเจ้าหน้าที่ / ทะเบียนรับ) */}
            <div className="print-header-meta w-52 shrink-0 border-2 border-slate-800 rounded-lg p-2.5 bg-slate-50/70 text-[11px] space-y-1 shadow-2xs">
              <div className="font-extrabold text-slate-900 text-center border-b border-slate-300 pb-1 text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-blue-700" />
                <span>สำหรับเจ้าหน้าที่รับเรื่อง</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="font-bold text-slate-700">เลขที่คำร้อง:</span>
                <span className="font-mono font-extrabold text-blue-900 text-xs">{request.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">วันที่ยื่น:</span>
                <span className="font-medium text-slate-900">{dateOnlyFormatted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">เวลาบันทึก:</span>
                <span className="font-medium text-slate-900">{timeOnlyFormatted} น.</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1">
                <span className="font-bold text-slate-700">ความสำคัญ:</span>
                <span className="font-bold text-slate-900">{getPriorityLabelTh(request.priority)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">สถานะคำร้อง:</span>
                <span className="font-bold text-slate-900">{getStatusLabelTh(request.status)}</span>
              </div>
            </div>

          </div>

          {/* Document Title Header */}
          <div className="print-document-title text-center mt-4 pt-2 border-t border-slate-200">
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-950 underline decoration-1 underline-offset-4">
              {isCctvCategory 
                ? 'แบบคำร้องขอดูหรือขอสำเนาข้อมูลภาพจากกล้องโทรทัศน์วงจรปิด (CCTV) เทศบาลเมืองชัยภูมิ'
                : `แบบคำร้องขอรับบริการ: ${request.title}`}
            </h1>
          </div>
        </div>

        {/* Addressee Section */}
        <div className="print-addressee text-left text-sm pt-1">
          <p className="font-bold text-slate-950">
            เรียน นายกเทศมนตรีเมืองชัยภูมิ
          </p>
        </div>

        {/* =========================================================
            STRUCTURED DATE, TIMESTAMP & APPLICANT DATA SECTION
           ========================================================= */}
        <div className="space-y-3.5 text-sm leading-relaxed pt-1">
          
          {/* Row 1: Applicant Profile Data */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-2 bg-slate-50/40 p-2.5 rounded-lg border border-slate-200/80">
            <div className="md:col-span-5">
              <strong className="font-bold text-slate-900">ข้าพเจ้า:</strong>{' '}
              <span className="border-b border-dotted border-slate-700 px-2 inline-block font-semibold min-w-[180px] text-slate-950">
                {request.applicant.prefix}{request.applicant.fullName}
              </span>
            </div>
            <div className="md:col-span-3">
              <strong className="font-bold text-slate-900">ตำแหน่ง:</strong>{' '}
              <span className="border-b border-dotted border-slate-700 px-2 inline-block font-medium min-w-[100px]">
                {d.position || request.applicant.positionOrMajor || '-'}
              </span>
            </div>
            <div className="md:col-span-4">
              <strong className="font-bold text-slate-900">สังกัด/ฝ่าย:</strong>{' '}
              <span className="border-b border-dotted border-slate-700 px-2 inline-block font-medium min-w-[120px]">
                {d.division || request.applicant.department || '-'}
              </span>
            </div>

            <div className="md:col-span-6 pt-1">
              <strong className="font-bold text-slate-900">หน่วยงาน:</strong>{' '}
              <span className="border-b border-dotted border-slate-700 px-2 inline-block font-medium min-w-[200px]">
                {d.agency || request.applicant.department || 'เทศบาลเมืองชัยภูมิ'}
              </span>
            </div>
            <div className="md:col-span-6 pt-1">
              <strong className="font-bold text-slate-900">หมายเลขโทรศัพท์:</strong>{' '}
              <span className="border-b border-dotted border-slate-700 px-2 inline-block font-mono font-bold min-w-[150px] text-blue-950">
                {request.applicant.phone}
              </span>
            </div>
          </div>

          {/* Row 2: Location and Objective */}
          <div className="space-y-2">
            <div>
              <strong className="font-bold text-slate-900">มีความประสงค์ขอดูข้อมูลภาพจากกล้องวงจรปิด (CCTV) บริเวณ:</strong>{' '}
              <span className="border-b border-dotted border-slate-700 px-2 inline-block font-bold text-slate-950 w-full md:w-auto min-w-[340px]">
                {d.cctvLocation || d.location || request.title}
              </span>
            </div>

            <div>
              <strong className="font-bold text-slate-900">ขอบันทึกสำเนาข้อมูลภาพจากกล้องวงจรปิด บริเวณ:</strong>{' '}
              <span className="border-b border-dotted border-slate-700 px-2 inline-block font-medium w-full md:w-auto min-w-[340px]">
                {d.copyLocation || d.cctvLocation || 'บริเวณที่ระบุข้างต้น'}
              </span>
            </div>
          </div>

          {/* =========================================================
              IMPROVED DATE & TIMESTAMP LAYOUT GRID
             ========================================================= */}
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 space-y-2 text-xs">
            <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-700" />
                <span>กำหนดช่วงวันและเวลาของเหตุการณ์ที่ต้องการตรวจสอบ (Date & Time Interval)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                ระบุตามช่วงเวลาที่เกิดเหตุจริง
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
              {/* Footage Date Field */}
              <div className="md:col-span-4 bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">📅 วันที่เกิดเหตุ / บันทึกภาพ:</span>
                <span className="font-bold text-slate-950 text-sm">{footageDateFormatted}</span>
              </div>

              {/* Time Range Field */}
              <div className="md:col-span-5 bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">🕒 ช่วงเวลาที่ขอตรวจสอบ:</span>
                <span className="font-bold text-slate-950 text-sm font-mono">
                  {d.timeRange || '08:00 น. ถึง 17:00 น.'}
                </span>
              </div>

              {/* Camera Status Field */}
              <div className="md:col-span-3 bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">📹 สถานะกล้องวงจรปิด:</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {d.cameraStatus || 'พร้อมใช้งาน (ปกติ)'}
                </span>
              </div>
            </div>

            {/* GPS Map Coordinates if available */}
            {d.incidentLocationMap && (
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="font-semibold">พิกัดทางภูมิศาสตร์ (GPS Coordinates):</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                  {d.incidentLocationMap.lat.toFixed(6)}, {d.incidentLocationMap.lng.toFixed(6)}
                </span>
              </div>
            )}
          </div>

          {/* Row 4: Purpose */}
          <div>
            <strong className="font-bold text-slate-900">เพื่อวัตถุประสงค์:</strong>{' '}
            <span className="border-b border-dotted border-slate-700 px-2 inline-block font-medium min-w-[320px] text-slate-900">
              {d.purpose || request.reason || 'ใช้เป็นหลักฐานประกอบการดำเนินการทางกฎหมาย'}
            </span>
          </div>

          {/* Row 5: Attached Documents Checklist */}
          <div className="pt-1">
            <strong className="font-bold text-slate-900 block mb-1">
              ทั้งนี้ ข้าพเจ้าฯ ได้แนบเอกสารประกอบคำร้อง ดังนี้:
            </strong>
            <div className="flex flex-wrap items-center gap-6 pl-4 text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.hasOfficialLetter ?? request.attachments.some(a => a.documentCategory === 'official_letter')}
                  readOnly
                  className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-0"
                />
                <span>หนังสือแจ้งความหรือหนังสือจากหน่วยงานต้นสังกัด</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.hasOfficerCard ?? request.attachments.some(a => a.documentCategory === 'id_card')}
                  readOnly
                  className="w-4 h-4 rounded border-slate-400 text-blue-600 focus:ring-0"
                />
                <span>สำเนาบัตรประจำตัวประชาชน / บัตรข้าราชการ</span>
              </label>

              {request.attachments.length > 0 && (
                <span className="text-slate-700 font-semibold">
                  (เอกสารแนบในระบบรวม {request.attachments.length} รายการ: {request.attachments.map(a => a.name).join(', ')})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            4-LEVEL APPROVAL CHAIN WORKFLOW GRID (เทศบาลเมืองชัยภูมิ)
           ========================================================= */}
        <div className="print-approval-chain pt-3 border-t-2 border-slate-800 space-y-3 print-break-inside-avoid">
          <div className="text-center">
            <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">
              ลำดับการเสนอพิจารณาและอนุมัติคำร้อง (เทศบาลเมืองชัยภูมิ)
            </h2>
            <p className="text-[10px] text-slate-500">
              ขั้นตอนการพิจารณาตามระเบียบสารบรรณเทศบาลเมืองชัยภูมิ
            </p>
          </div>

          {/* Grid Rows for 4 Officials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            
            {/* Box 1: เรียน หัวหน้าฝ่ายปกครอง */}
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50/50 space-y-1.5">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between items-center">
                <span>๑. เรียน หัวหน้าฝ่ายปกครอง</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {request.approvalWorkflow?.steps[0]?.approvedAt 
                    ? `ลงวันที่ ${formatThaiDate(new Date(request.approvalWorkflow.steps[0].approvedAt), useThaiBuddhistYear)}`
                    : 'ขั้นที่ ๑'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>เห็นควร:</span>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[0]?.status === 'approved'} readOnly className="w-3.5 h-3.5" />
                  <span>อนุญาต</span>
                </label>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[0]?.status === 'rejected'} readOnly className="w-3.5 h-3.5" />
                  <span>ไม่อนุญาต</span>
                </label>
              </div>
              <div className="pt-2 text-center space-y-0.5">
                <div className="border-b border-dashed border-slate-400 pb-1 italic text-slate-600 text-[11px] min-h-[18px]">
                  {request.approvalWorkflow?.steps[0]?.comment || '(ลงชื่อ)............................................................'}
                </div>
                <div className="font-bold text-slate-900 pt-0.5 text-[11px]">
                  เจ้าพนักงานเทศกิจชำนาญงาน
                </div>
              </div>
            </div>

            {/* Box 2: เรียน หัวหน้าสำนักปลัดเทศบาล */}
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50/50 space-y-1.5">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between items-center">
                <span>๒. เรียน หัวหน้าสำนักปลัดเทศบาล</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {request.approvalWorkflow?.steps[1]?.approvedAt 
                    ? `ลงวันที่ ${formatThaiDate(new Date(request.approvalWorkflow.steps[1].approvedAt), useThaiBuddhistYear)}`
                    : 'ขั้นที่ ๒'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>เห็นควร:</span>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[1]?.status === 'approved'} readOnly className="w-3.5 h-3.5" />
                  <span>อนุญาต</span>
                </label>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[1]?.status === 'rejected'} readOnly className="w-3.5 h-3.5" />
                  <span>ไม่อนุญาต</span>
                </label>
              </div>
              <div className="pt-2 text-center space-y-0.5">
                <div className="border-b border-dashed border-slate-400 pb-1 italic text-slate-600 text-[11px] min-h-[18px]">
                  {request.approvalWorkflow?.steps[1]?.comment || '(ลงชื่อ)............................................................'}
                </div>
                <div className="font-bold text-slate-900 pt-0.5 text-[11px]">
                  หัวหน้าฝ่ายปกครอง
                </div>
              </div>
            </div>

            {/* Box 3: เรียน ปลัดเทศบาล */}
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50/50 space-y-1.5">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between items-center">
                <span>๓. เรียน ปลัดเทศบาล</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {request.approvalWorkflow?.steps[2]?.approvedAt 
                    ? `ลงวันที่ ${formatThaiDate(new Date(request.approvalWorkflow.steps[2].approvedAt), useThaiBuddhistYear)}`
                    : 'ขั้นที่ ๓'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>เห็นควร:</span>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[2]?.status === 'approved'} readOnly className="w-3.5 h-3.5" />
                  <span>อนุญาต</span>
                </label>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[2]?.status === 'rejected'} readOnly className="w-3.5 h-3.5" />
                  <span>ไม่อนุญาต</span>
                </label>
              </div>
              <div className="pt-2 text-center space-y-0.5">
                <div className="border-b border-dashed border-slate-400 pb-1 italic text-slate-600 text-[11px] min-h-[18px]">
                  {request.approvalWorkflow?.steps[2]?.comment || '(ลงชื่อ)............................................................'}
                </div>
                <div className="font-bold text-slate-900 pt-0.5 text-[11px]">
                  หัวหน้าสำนักปลัดเทศบาล
                </div>
              </div>
            </div>

            {/* Box 4: เรียน นายกเทศมนตรีเมืองชัยภูมิ */}
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50/50 space-y-1.5">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between items-center">
                <span>๔. เรียน นายกเทศมนตรีเมืองชัยภูมิ</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {request.approvalWorkflow?.steps[3]?.approvedAt 
                    ? `ลงวันที่ ${formatThaiDate(new Date(request.approvalWorkflow.steps[3].approvedAt), useThaiBuddhistYear)}`
                    : 'ขั้นที่ ๔'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>เห็นควร:</span>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[3]?.status === 'approved'} readOnly className="w-3.5 h-3.5" />
                  <span>อนุญาต</span>
                </label>
                <label className="flex items-center gap-1 font-semibold">
                  <input type="checkbox" checked={request.approvalWorkflow?.steps[3]?.status === 'rejected'} readOnly className="w-3.5 h-3.5" />
                  <span>ไม่อนุญาต</span>
                </label>
              </div>
              <div className="pt-2 text-center space-y-0.5">
                <div className="border-b border-dashed border-slate-400 pb-1 italic text-slate-600 text-[11px] min-h-[18px]">
                  {request.approvalWorkflow?.steps[3]?.comment || '(ลงชื่อ)............................................................'}
                </div>
                <div className="font-bold text-slate-900 pt-0.5 text-[11px]">
                  ปลัดเทศบาลเมืองชัยภูมิ
                </div>
              </div>
            </div>
          </div>

          {/* Final Signer Box: คำสั่งนายกเทศมนตรีเมืองชัยภูมิ */}
          <div className="border-2 border-slate-900 p-3.5 rounded-xl bg-slate-50/80 text-center space-y-2 text-xs">
            <div className="font-extrabold text-slate-900 text-sm">
              คำสั่งนายกเทศมนตรีเมืองชัยภูมิ
            </div>

            <div className="flex items-center justify-center gap-8 font-bold text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={request.status === 'approved' || request.status === 'completed'} 
                  readOnly 
                  className="w-4 h-4 text-emerald-600 rounded" 
                />
                <span className="text-emerald-950"> [ / ] อนุญาต</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={request.status === 'rejected'} 
                  readOnly 
                  className="w-4 h-4 text-rose-600 rounded" 
                />
                <span className="text-rose-950"> [  ] ไม่อนุญาต</span>
              </label>
            </div>

            <div className="pt-3 pb-1">
              <p className="text-slate-500 italic text-[11px]">
                (ลงชื่อ).............................................................
              </p>
              <p className="font-extrabold text-slate-950 text-sm mt-1">
                (นายบรรยงค์ เกียรติก้องชูชัย)
              </p>
              <p className="font-bold text-slate-800 text-xs">
                นายกเทศมนตรีเมืองชัยภูมิ
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================
            HANDOVER SIGNATURES (ผู้ขอข้อมูล & ผู้ส่งมอบข้อมูล)
           ========================================================= */}
        <div className="print-handover-signatures pt-4 border-t border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-6 text-center text-xs print-break-inside-avoid">
          {/* Left: ผู้ขอข้อมูล */}
          <div className="space-y-1.5 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/30">
            <p className="font-bold text-slate-900">ลงชื่อ ............................................................. ผู้ขอข้อมูล</p>
            <div className="h-10 flex items-center justify-center">
              {request.signatureDataUrl ? (
                <img src={request.signatureDataUrl} alt="ลายเซ็นผู้ขอข้อมูล" className="max-h-9 object-contain" />
              ) : (
                <span className="text-slate-500 italic">({request.applicant.prefix}{request.applicant.fullName})</span>
              )}
            </div>
            <p className="text-slate-700 font-semibold text-[11px]">
              ตำแหน่ง: <span className="underline">{d.position || request.applicant.positionOrMajor || 'ประชาชน/ผู้ร้อง'}</span>
            </p>
            <p className="text-slate-500 text-[10px]">
              วันที่ {dateOnlyFormatted}
            </p>
          </div>

          {/* Right: ผู้ให้ข้อมูล */}
          <div className="space-y-1.5 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50/30">
            <p className="font-bold text-slate-900">ลงชื่อ ............................................................. ผู้ให้ข้อมูล/ส่งมอบ</p>
            <div className="h-10 flex items-center justify-center text-slate-500 italic text-[11px]">
              ({request.assignedOfficer || 'เจ้าหน้าที่ประจำศูนย์ CCTV เทศบาลเมืองชัยภูมิ'})
            </div>
            <p className="text-slate-700 font-semibold text-[11px]">
              ตำแหน่ง: <span className="underline">เจ้าหน้าที่ศูนย์เทคโนโลยีและกล้องวงจรปิด</span>
            </p>
            <p className="text-slate-500 text-[10px]">
              วันที่ {dateOnlyFormatted}
            </p>
          </div>
        </div>

        {/* PDPA & Legal Warning Notice */}
        <div className="print-legal-warning mt-4 p-3 border border-rose-200 bg-rose-50/50 rounded-xl text-left text-[10px] text-slate-800 space-y-1 print-break-inside-avoid">
          <strong className="font-bold text-rose-900 block uppercase tracking-wider text-[11px]">
            ⚠️ ข้อตกลงและข้อกำหนดทางกฎหมาย (PDPA Agreement)
          </strong>
          <p className="leading-relaxed text-slate-700">
            ข้าพเจ้ารับรองว่าจะไม่นำข้อมูลภาพจากกล้องวงจรปิด (CCTV) ที่ได้รับไปเผยแพร่ในสื่อสังคมออนไลน์ หรือแสวงหาประโยชน์โดยมิชอบด้วยกฎหมาย หากเกิดความเสียหายใดๆ ข้าพเจ้ายินยอมรับผิดตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA) และกฎหมายอื่นที่เกี่ยวข้องทุกประการ
          </p>
        </div>

        {/* =========================================================
            SECURITY, TIMESTAMP & VERIFICATION FOOTER
           ========================================================= */}
        <div className="print-footer-container pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono print-break-inside-avoid">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ออกโดยระบบคำร้องดิจิทัล เทศบาลเมืองชัยภูมิ (Official e-Service Record)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>พิมพ์เมื่อ: {printTimestampFormatted}</span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <QrCode className="w-3.5 h-3.5" />
              <span>REF: {request.id}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
