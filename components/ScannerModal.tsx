import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Image as ImageIcon, X, Loader2, ScanLine, FileSpreadsheet, CheckCircle2, Save, AlertTriangle, Trash2, CheckSquare, Square } from 'lucide-react';
import { scanDocumentImage, ScannedItem } from '../services/aiScanner';
import { parseExcelFile } from '../services/excelService';

interface ScannerModalProps {
  onClose: () => void;
  onImport: (items: ScannedItem[]) => void;
}

// Extend internal item to track selection state
interface LocalScannedItem extends ScannedItem {
  selected: boolean;
}

const DUPLICATE_COLORS = [
  'bg-red-100',
  'bg-orange-100',
  'bg-yellow-100',
  'bg-blue-100',
  'bg-purple-100',
  'bg-pink-100',
  'bg-indigo-100',
  'bg-teal-100'
];

export const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, onImport }) => {
  const [loading, setLoading] = useState(false);
  const [scannedItems, setScannedItems] = useState<LocalScannedItem[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');

  // Calculate duplicates map: index -> color class
  const duplicateColorMap = useMemo(() => {
    const counts: Record<string, number[]> = {};
    const map: Record<number, string> = {};

    // Group indices by nomenclature
    scannedItems.forEach((item, idx) => {
      const key = item.nomenclature.trim().toLowerCase();
      if (!key) return;
      if (!counts[key]) counts[key] = [];
      counts[key].push(idx);
    });

    let colorIndex = 0;
    Object.values(counts).forEach((indices) => {
      if (indices.length > 1) {
        const colorClass = DUPLICATE_COLORS[colorIndex % DUPLICATE_COLORS.length];
        indices.forEach((idx) => {
          map[idx] = colorClass;
        });
        colorIndex++;
      }
    });

    return map;
  }, [scannedItems]);

  const processItems = (items: ScannedItem[]) => {
      // Mark all as selected by default
      const localItems = items.map(i => ({ ...i, selected: true }));
      setScannedItems(localItems);
      setActiveTab('preview');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setError('');
      try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            const items = await scanDocumentImage(base64);
            if (items.length === 0) {
                setError('სურათზე მონაცემები ვერ მოიძებნა.');
            } else {
                processItems(items);
            }
            setLoading(false);
          };
          reader.readAsDataURL(file);
      } catch (err: any) {
          setError('სურათის დამუშავება ვერ მოხერხდა.');
          setLoading(false);
      }
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setLoading(true);
          setError('');
          try {
              const items = await parseExcelFile(file);
              processItems(items);
          } catch (err: any) {
              setError(err.message || 'Excel ფაილის დამუშავება ვერ მოხერხდა.');
          } finally {
              setLoading(false);
          }
      }
  };

  const handleItemChange = (index: number, field: keyof ScannedItem, value: string | number) => {
      const newItems = [...scannedItems];
      newItems[index] = { ...newItems[index], [field]: value };
      setScannedItems(newItems);
  };

  const toggleSelection = (index: number) => {
      const newItems = [...scannedItems];
      newItems[index].selected = !newItems[index].selected;
      setScannedItems(newItems);
  };

  const toggleSelectAll = () => {
      const allSelected = scannedItems.every(i => i.selected);
      const newItems = scannedItems.map(i => ({ ...i, selected: !allSelected }));
      setScannedItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
      const newItems = scannedItems.filter((_, i) => i !== index);
      setScannedItems(newItems);
      if (newItems.length === 0) setActiveTab('upload');
  };

  const handleFinalImport = () => {
      const selected = scannedItems.filter(i => i.selected);
      if (selected.length === 0) {
          alert('გთხოვთ მონიშნოთ მინიმუმ ერთი ჩანაწერი');
          return;
      }
      // Remove the 'selected' property before passing back
      const cleanItems = selected.map(({ selected, ...rest }) => rest);
      onImport(cleanItems);
  };

  const getUnitLabel = (u?: string) => {
    switch(u) {
      case 'kg': return 'კგ';
      case 'm': return 'მ';
      case 'l': return 'ლ';
      default: return 'ც';
    }
  };

  const allSelected = scannedItems.length > 0 && scannedItems.every(i => i.selected);
  const selectedCount = scannedItems.filter(i => i.selected).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-fade-in overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <ScanLine className="mr-2 text-indigo-600" />
                ჯგუფური ატვირთვა / იმპორტი
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            
            {/* 1. UPLOAD VIEW */}
            {activeTab === 'upload' && (
                <div className="h-full flex flex-col items-center justify-center space-y-8 py-10">
                     {loading ? (
                         <div className="flex flex-col items-center">
                             <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
                             <p className="text-gray-600 font-medium animate-pulse">სისტემა ამუშავებს მონაცემებს...</p>
                         </div>
                     ) : (
                         <>
                            <div className="text-center space-y-2">
                                <h4 className="text-xl font-bold text-gray-800">აირჩიეთ წყარო</h4>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    ატვირთეთ Excel-ის ცხრილი ან გადაუღეთ ფოტო დოკუმენტს.
                                    სისტემა ავტომატურად ამოიღებს სიას.
                                </p>
                                {error && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
                                        <AlertTriangle size={18} className="mr-2" />
                                        {error}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl px-4">
                                {/* Excel */}
                                <div className="relative group cursor-pointer">
                                    <div className="absolute inset-0 bg-green-100 rounded-2xl transform transition group-hover:scale-105"></div>
                                    <div className="relative bg-white border-2 border-green-100 p-6 rounded-2xl flex flex-col items-center text-center h-full transition group-hover:border-green-300">
                                        <div className="p-4 bg-green-50 text-green-600 rounded-full mb-4">
                                            <FileSpreadsheet size={32} />
                                        </div>
                                        <h5 className="font-bold text-gray-800 mb-1">Excel ფაილი</h5>
                                        <p className="text-xs text-gray-400 mb-4">.xlsx, .xls (მხოლოდ 1 ტაბი)</p>
                                        <span className="mt-auto inline-block px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg group-hover:bg-green-700 transition">ატვირთვა</span>
                                    </div>
                                    <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>

                                {/* Image Gallery */}
                                <div className="relative group cursor-pointer">
                                    <div className="absolute inset-0 bg-indigo-100 rounded-2xl transform transition group-hover:scale-105"></div>
                                    <div className="relative bg-white border-2 border-indigo-100 p-6 rounded-2xl flex flex-col items-center text-center h-full transition group-hover:border-indigo-300">
                                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                                            <ImageIcon size={32} />
                                        </div>
                                        <h5 className="font-bold text-gray-800 mb-1">სურათი</h5>
                                        <p className="text-xs text-gray-400 mb-4">გალერეიდან</p>
                                        <span className="mt-auto inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg group-hover:bg-indigo-700 transition">არჩევა</span>
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>

                                {/* Camera */}
                                <div className="relative group cursor-pointer">
                                    <div className="absolute inset-0 bg-blue-100 rounded-2xl transform transition group-hover:scale-105"></div>
                                    <div className="relative bg-white border-2 border-blue-100 p-6 rounded-2xl flex flex-col items-center text-center h-full transition group-hover:border-blue-300">
                                        <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-4">
                                            <Camera size={32} />
                                        </div>
                                        <h5 className="font-bold text-gray-800 mb-1">კამერა</h5>
                                        <p className="text-xs text-gray-400 mb-4">ფოტოს გადაღება</p>
                                        <span className="mt-auto inline-block px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg group-hover:bg-blue-700 transition">გადაღება</span>
                                    </div>
                                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                            </div>
                         </>
                     )}
                </div>
            )}

            {/* 2. PREVIEW & EDIT VIEW */}
            {activeTab === 'preview' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm gap-4">
                         <div className="flex items-center text-green-600 font-bold">
                             <CheckCircle2 size={20} className="mr-2" />
                             სულ: {scannedItems.length} | მონიშნულია: {selectedCount}
                         </div>
                         <div className="flex items-center space-x-2 text-sm">
                             <div className="flex items-center px-2 py-1 bg-gray-100 rounded text-gray-600">
                                <span className="w-3 h-3 rounded-full bg-red-100 border border-red-200 mr-2"></span>
                                დუბლიკატები (ფერის მიხედვით)
                             </div>
                             <button onClick={() => { setScannedItems([]); setActiveTab('upload'); }} className="text-gray-500 hover:text-red-500 underline ml-2">
                                 გაუქმება / თავიდან
                             </button>
                         </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 w-10 text-center">
                                            <button onClick={toggleSelectAll} className="text-gray-600 hover:text-indigo-600">
                                                {allSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>
                                        </th>
                                        <th className="p-3 w-10">#</th>
                                        <th className="p-3">ნომენკლატურა</th>
                                        <th className="p-3">დასახელება</th>
                                        <th className="p-3 w-32 text-center">რაოდენობა</th>
                                        <th className="p-3 w-28">ერთეული</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {scannedItems.map((item, idx) => {
                                        const bgColor = duplicateColorMap[idx] || (item.selected ? 'bg-white' : 'bg-gray-50');
                                        const opacityClass = item.selected ? 'opacity-100' : 'opacity-50 grayscale';
                                        
                                        return (
                                            <tr key={idx} className={`${bgColor} hover:bg-opacity-80 transition-colors ${opacityClass}`}>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => toggleSelection(idx)} className="text-gray-500 hover:text-indigo-600">
                                                        {item.selected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                                                    </button>
                                                </td>
                                                <td className="p-3 text-gray-500 text-xs font-mono">{idx + 1}</td>
                                                <td className="p-3">
                                                    <input 
                                                        type="text" 
                                                        value={item.nomenclature} 
                                                        onChange={(e) => handleItemChange(idx, 'nomenclature', e.target.value)}
                                                        className="w-full p-1.5 border border-gray-200 hover:border-indigo-400 focus:border-indigo-600 rounded bg-white bg-opacity-50 font-mono text-black font-bold shadow-sm"
                                                        placeholder="კოდი..."
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        type="text" 
                                                        value={item.name} 
                                                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                                        className="w-full p-1.5 border border-gray-200 hover:border-indigo-400 focus:border-indigo-600 rounded bg-white bg-opacity-50 text-black font-medium shadow-sm"
                                                        placeholder="დასახელება..."
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="w-full p-1.5 border border-gray-200 hover:border-indigo-400 focus:border-indigo-600 rounded bg-white bg-opacity-50 text-black font-bold text-center shadow-sm"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                     <select 
                                                        value={item.unit}
                                                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                                        className="w-full p-1.5 border border-gray-200 hover:border-indigo-400 focus:border-indigo-600 rounded bg-white bg-opacity-50 text-black text-xs shadow-sm"
                                                     >
                                                         <option value="pcs">ცალი</option>
                                                         <option value="kg">კგ</option>
                                                         <option value="m">მ</option>
                                                         <option value="l">მოცულობა (l)</option>
                                                     </select>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => handleDeleteItem(idx)} className="text-gray-400 hover:text-red-500 transition p-1 hover:bg-red-50 rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* Footer */}
        {activeTab === 'preview' && (
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end space-x-3">
                <button 
                    onClick={onClose} 
                    className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                    გაუქმება
                </button>
                <button 
                    onClick={handleFinalImport} 
                    disabled={selectedCount === 0}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center transition transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    <Save size={20} className="mr-2" />
                    იმპორტი ({selectedCount})
                </button>
            </div>
        )}
      </div>
    </div>
  );
};