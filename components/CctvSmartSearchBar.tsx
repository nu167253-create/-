import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Search, 
  X, 
  Cpu, 
  Zap, 
  SlidersHorizontal, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  WifiOff, 
  Building, 
  Layers, 
  HelpCircle,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { ParsedSearchIntent, SmartSearchResult } from '../utils/cctvSearchIndex';
import { CctvStatus } from '../types/cctv';

interface CctvSmartSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  smartResult?: SmartSearchResult | null;
  totalCameras: number;
  filteredCount: number;
  onClear: () => void;
  onSelectSuggestion?: (query: string) => void;
  isAllSelected?: boolean;
  onToggleSelectAll?: () => void;
}

export const CctvSmartSearchBar: React.FC<CctvSmartSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  smartResult,
  totalCameras,
  filteredCount,
  onClear,
  onSelectSuggestion,
  isAllSelected,
  onToggleSelectAll
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsedIntent = smartResult?.intent;
  const hasActiveIntent = parsedIntent && (
    parsedIntent.status ||
    parsedIntent.zone ||
    parsedIntent.district ||
    parsedIntent.cameraType ||
    parsedIntent.keywords.length > 0
  );

  const quickSuggestions = [
    { label: '🔴 กล้องชำรุดทั้งหมด', query: 'กล้องชำรุด' },
    { label: '🟡 อยู่ระหว่างซ่อมบำรุง', query: 'กำลังซ่อมแซม' },
    { label: '⚪ ขาดการเชื่อมต่อ (Offline)', query: 'ขาดการเชื่อมต่อ' },
    { label: '🟢 กล้องปกติ ตู้ 1', query: 'กล้องปกติ ตู้ควบคุมที่ 1' },
    { label: '🏙️ ชุมชนเมืองเก่า', query: 'ชุมชนเมืองเก่า' },
    { label: '📹 กล้อง PTZ หมุนได้', query: 'กล้อง PTZ ปกติ' },
    { label: '⚡ ตู้สี่แยกโรบินสัน', query: 'ตู้สี่แยกโรบินสัน' }
  ];

  const handleSuggestionClick = (queryText: string) => {
    onSearchChange(queryText);
    if (onSelectSuggestion) onSelectSuggestion(queryText);
    inputRef.current?.focus();
  };

  const handleRemoveStatusIntent = () => {
    if (!parsedIntent?.status) return;
    // Remove status keywords from query
    const statusTerms = ['ชำรุด', 'เสีย', 'พัง', 'faulty', 'ปกติ', 'online', 'ซ่อม', 'maintenance', 'ออฟไลน์', 'offline'];
    let newQ = searchQuery;
    statusTerms.forEach(t => {
      newQ = newQ.replace(new RegExp(t, 'gi'), '');
    });
    onSearchChange(newQ.trim());
  };

  const handleRemoveZoneIntent = () => {
    if (!parsedIntent?.zone) return;
    let newQ = searchQuery.replace(new RegExp(parsedIntent.zone, 'gi'), '');
    onSearchChange(newQ.trim());
  };

  const handleRemoveDistrictIntent = () => {
    if (!parsedIntent?.district) return;
    let newQ = searchQuery.replace(new RegExp(parsedIntent.district, 'gi'), '');
    onSearchChange(newQ.trim());
  };

  const getStatusIcon = (status?: CctvStatus) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'faulty':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-amber-600" />;
      case 'offline':
        return <WifiOff className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-blue-700/40 space-y-3.5 relative overflow-hidden">
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md border border-blue-400/40">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
                <span>Smart Search กล้องวงจรปิด</span>
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI NLP Index
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-blue-200/80">
              ค้นหาด้วยภาษาธรรมชาติ คัดกรองตาม <strong className="text-white">เขต/ชุมชน (District)</strong>, <strong className="text-white">โซน/ตู้ควบคุม (Zone)</strong> หรือ <strong className="text-white">สถานะ (Status)</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Internal Index Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 border border-blue-500/30 text-blue-200 px-2.5 py-1 rounded-lg text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>ดัชนีพร้อมใช้งาน ({totalCameras} จุด)</span>
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="วิธีใช้การค้นหาด้วยภาษาธรรมชาติ"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Search Input Container */}
      <div className="relative z-10">
        <div className={`relative flex items-center bg-white rounded-xl shadow-md border transition-all ${
          isFocused ? 'ring-2 ring-blue-400 border-blue-400' : 'border-slate-200'
        }`}>
          <div className="pl-3.5 pr-2 text-slate-400 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-blue-600" />
          </div>

          <input
            ref={inputRef}
            type="text"
            id="cctv-smart-search-input"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder='ลองพิมพ์คำค้น เช่น "กล้องชำรุดในโซน 1", "กล้องปกติ ชุมชนเมืองเก่า", "ตู้สี่แยกโรบินสัน", "offline in zone 2"...'
            className="w-full py-3 pr-28 text-xs font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none"
          />

          {/* Right Action Buttons */}
          <div className="pr-2 flex items-center gap-1.5 shrink-0">
            {searchQuery && (
              <button
                type="button"
                onClick={onClear}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="h-5 w-px bg-slate-200" />

            <div className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-black px-2.5 py-1 rounded-lg">
              พบ {filteredCount} จุด
            </div>

            {onToggleSelectAll && (
              <button
                type="button"
                onClick={onToggleSelectAll}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all border cursor-pointer hidden md:flex items-center gap-1 ${
                  isAllSelected
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="เลือกกล้องทั้งหมดตามผลการค้นหานี้"
              >
                <span>{isAllSelected ? 'เลือกอยู่' : 'เลือกทั้งหมด'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Parsed Intent Badges */}
      {searchQuery && hasActiveIntent && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs animate-in fade-in duration-150">
          <span className="text-[11px] text-blue-200 font-semibold flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-300" />
            <span>วิเคราะห์เจตนาค้นหา:</span>
          </span>

          {parsedIntent.status && (
            <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-xs text-white border border-white/20 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
              {getStatusIcon(parsedIntent.status)}
              <span>สถานะ: {parsedIntent.statusLabel}</span>
              <button
                type="button"
                onClick={handleRemoveStatusIntent}
                className="hover:text-rose-300 ml-1"
                title="ยกเลิกการกรองสถานะนี้"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {parsedIntent.zone && (
            <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-xs text-white border border-white/20 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
              <Layers className="w-3.5 h-3.5 text-indigo-300" />
              <span>โซน/ตู้: {parsedIntent.zone}</span>
              <button
                type="button"
                onClick={handleRemoveZoneIntent}
                className="hover:text-rose-300 ml-1"
                title="ยกเลิกการกรองโซนนี้"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {parsedIntent.district && (
            <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-xs text-white border border-white/20 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
              <Building className="w-3.5 h-3.5 text-teal-300" />
              <span>เขต/ชุมชน: {parsedIntent.district}</span>
              <button
                type="button"
                onClick={handleRemoveDistrictIntent}
                className="hover:text-rose-300 ml-1"
                title="ยกเลิกการกรองเขตนี้"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {parsedIntent.cameraTypeLabel && (
            <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-xs text-white border border-white/20 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
              <span>ชนิด: {parsedIntent.cameraTypeLabel}</span>
            </span>
          )}

          {parsedIntent.keywords.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-white/10 text-blue-200 border border-white/10 text-[11px] px-2 py-0.5 rounded-lg">
              <span>คำสำคัญ: "{parsedIntent.keywords.join(', ')}"</span>
            </span>
          )}

          {smartResult && (
            <span className="text-[10px] text-blue-300/80 ml-auto hidden sm:inline">
              ⚡ ดัชนีตอบสนองใน {smartResult.queryTimeMs} ms
            </span>
          )}
        </div>
      )}

      {/* Natural Language Prompt Suggestions Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
        <span className="text-[11px] font-bold text-blue-300 shrink-0">
          💡 คำสั่งค้นหายอดนิยม:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {quickSuggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(item.query)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-blue-100 hover:text-white border border-white/10 hover:border-white/30 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Natural Language Query Help Guide */}
      {showHelp && (
        <div className="bg-slate-800/95 border border-blue-400/40 rounded-xl p-4 text-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>คู่มือการใช้งาน Smart Natural Language Search</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300 text-[11px]">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
              <div className="font-bold text-blue-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>1. กรองตามสถานะ (Status)</span>
              </div>
              <p className="text-slate-400">
                รองรับคำเหมือน: <em>ชำรุด, เสีย, พัง, ภาพดับ, กำลังซ่อม, บำรุงรักษา, ออฟไลน์, ขาดการเชื่อมต่อ, ใช้งานได้ปกติ, online, faulty</em>
              </p>
              <div className="text-amber-200 font-mono text-[10px] pt-1">
                ตัวอย่าง: "กล้องเสีย", "กล้องที่กำลังซ่อม"
              </div>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
              <div className="font-bold text-indigo-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. กรองตามโซน / ตู้ (Zone)</span>
              </div>
              <p className="text-slate-400">
                ระบุชื่อโซนหรือหมายเลขตู้ควบคุม: <em>โซน 1, โซน 2, ตู้ 1, ตู้ควบคุมที่ 6, ตู้สี่แยกโรบินสัน, NVR 1</em>
              </p>
              <div className="text-amber-200 font-mono text-[10px] pt-1">
                ตัวอย่าง: "โซน 1 ชำรุด", "ตู้ 6"
              </div>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
              <div className="font-bold text-teal-300 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-teal-400" />
                <span>3. กรองตามเขต / ชุมชน (District)</span>
              </div>
              <p className="text-slate-400">
                ระบุชื่อชุมชนหรือพื้นที่: <em>ชุมชนเมืองเก่า, ชุมชนโคกน้อย, ชุมชนตลาด, เขตเทศบาล, สี่แยกบายพาส</em>
              </p>
              <div className="text-amber-200 font-mono text-[10px] pt-1">
                ตัวอย่าง: "ชุมชนเมืองเก่า ปกติ", "โคกน้อย"
              </div>
            </div>
          </div>

          <div className="bg-blue-950/60 p-2.5 rounded-lg border border-blue-800/40 text-[11px] text-blue-200 flex items-center justify-between">
            <span>
              💡 <strong>เทคนิคขั้นสูง:</strong> รวมเงื่อนไขพร้อมกันได้ เช่น <code className="bg-blue-900 px-1 py-0.5 rounded text-white">"กล้องชำรุด โซน 1 ชุมชนโคกน้อย"</code> ระบบจะแยกตัวกรองให้อัตโนมัติในระดับมิลลิวินาที
            </span>
            <button
              type="button"
              onClick={() => {
                onSearchChange('กล้องชำรุด โซน 1');
                setShowHelp(false);
              }}
              className="text-white hover:underline flex items-center gap-0.5 font-bold shrink-0 ml-3"
            >
              <span>ลองใช้ตัวอย่างนี้</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
