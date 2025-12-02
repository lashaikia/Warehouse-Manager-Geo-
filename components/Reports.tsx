import React, { useState, useMemo, useRef } from 'react';
import { Product } from '../types';
import { Download, Printer, Settings, Filter, X, Check, Database, Upload, Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import { getDatabaseJSON, importDatabaseJSON } from '../services/storage';

interface ReportsProps {
  products: Product[];
}

type FilterType = 'category' | 'warehouse' | 'rack' | 'quantity' | 'dateAdded';

interface ActiveFilter {
  id: string;
  type: FilterType;
  label: string;
  value: any; 
  displayValue: string;
}

export const Reports: React.FC<ReportsProps> = ({ products }) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType>('category');
  const [tempValue, setTempValue] = useState<string>('');
  const [tempRange, setTempRange] = useState({ min: '', max: '' });
  const [tempDateRange, setTempDateRange] = useState({ start: '', end: '' });

  const uniqueCategories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort(), 
    [products]
  );
  
  const uniqueWarehouses = useMemo(() => 
    Array.from(new Set(products.map(p => p.warehouse).filter(Boolean))).sort(), 
    [products]
  );

  const uniqueRacks = useMemo(() => 
    Array.from(new Set(products.map(p => p.rack).filter(Boolean))).sort(), 
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (activeFilters.length === 0) return products;

    return products.filter(p => {
      return activeFilters.every(filter => {
        switch (filter.type) {
          case 'category':
            return p.category === filter.value;
          case 'warehouse':
            return p.warehouse === filter.value;
          case 'rack':
            return p.rack === filter.value;
          case 'quantity':
            const qty = p.quantity;
            const min = filter.value.min !== '' ? Number(filter.value.min) : Number.MIN_SAFE_INTEGER;
            const max = filter.value.max !== '' ? Number(filter.value.max) : Number.MAX_SAFE_INTEGER;
            return qty >= min && qty <= max;
          case 'dateAdded':
            const date = p.dateAdded; 
            const start = filter.value.start || '0000-01-01';
            const end = filter.value.end || '9999-12-31';
            return date >= start && date <= end;
          default:
            return true;
        }
      });
    });
  }, [products, activeFilters]);

  const totalProducts = filteredProducts.length;
  const totalQuantity = filteredProducts.reduce((acc, p) => acc + p.quantity, 0);

  const addFilter = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    let newFilter: ActiveFilter | null = null;

    if (selectedFilterType === 'category' && tempValue) {
      newFilter = { id: newId, type: 'category', label: 'კატეგორია', value: tempValue, displayValue: tempValue };
    } else if (selectedFilterType === 'warehouse' && tempValue) {
      newFilter = { id: newId, type: 'warehouse', label: 'საწყობი', value: tempValue, displayValue: tempValue };
    } else if (selectedFilterType === 'rack' && tempValue) {
      newFilter = { id: newId, type: 'rack', label: 'სტელაჟი', value: tempValue, displayValue: tempValue };
    } else if (selectedFilterType === 'quantity') {
      if (tempRange.min === '' && tempRange.max === '') return; 
      const display = `${tempRange.min || '0'}-დან ${tempRange.max || '∞'}-მდე`;
      newFilter = { id: newId, type: 'quantity', label: 'რაოდენობა', value: { ...tempRange }, displayValue: display };
    } else if (selectedFilterType === 'dateAdded') {
      if (tempDateRange.start === '' && tempDateRange.end === '') return;
      const display = `${tempDateRange.start || 'დასაწყისი'} - ${tempDateRange.end || 'დასასრული'}`;
      newFilter = { id: newId, type: 'dateAdded', label: 'თარიღი', value: { ...tempDateRange }, displayValue: display };
    }

    if (newFilter) {
      setActiveFilters([...activeFilters, newFilter]);
      setTempValue('');
      setTempRange({ min: '', max: '' });
      setTempDateRange({ start: '', end: '' });
    }
  };

  const removeFilter = (id: string) => {
    setActiveFilters(activeFilters.filter(f => f.id !== id));
  };

  // CSV/Excel Export
  const handleExportExcel = () => {
    const headers = ["ნომენკლატურა", "დასახელება", "კატეგორია", "საწყობი", "სტელაჟი", "რაოდენობა", "თარიღი"];
    
    // Helper to escape CSV fields (handles commas in text)
    const escapeCsv = (text: string | number) => {
        const str = String(text || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = filteredProducts.map(p => [
        p.nomenclature,
        p.name,
        p.category,
        p.warehouse,
        p.rack,
        p.quantity,
        p.dateAdded
    ]);

    const csvContent = [
        headers.join(','), 
        ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    // Add Byte Order Mark (BOM) for UTF-8 so Excel opens Georgian text correctly
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print in New Tab
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("გთხოვთ დაუშვათ 'Pop-ups' ამ საიტისთვის, რათა ბეჭდვის ფანჯარა გაიხსნას.");
        return;
    }

    const dateStr = new Date().toLocaleString('ka-GE');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ka">
      <head>
        <meta charset="UTF-8">
        <title>საწყობის ანგარიში</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; }
          h1 { margin-bottom: 5px; }
          .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border: 1px solid #eee; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1>საწყობის ანგარიში</h1>
        <div class="meta">გენერირების თარიღი: ${dateStr}</div>
        
        <div class="summary">
           <strong>სულ ჩანაწერი:</strong> ${totalProducts} | 
           <strong>ჯამური რაოდენობა:</strong> ${totalQuantity}
           ${activeFilters.length > 0 ? `<br><strong>ფილტრები:</strong> ${activeFilters.map(f => `${f.label}: ${f.displayValue}`).join(', ')}` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>ნომენკლატურა</th>
              <th>დასახელება</th>
              <th>კატეგორია</th>
              <th>საწყობი</th>
              <th>სტელაჟი</th>
              <th style="text-align:center">რაოდენობა</th>
              <th style="text-align:right">თარიღი</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map(p => `
              <tr>
                <td>${p.nomenclature}</td>
                <td>${p.name}</td>
                <td>${p.category || '-'}</td>
                <td>${p.warehouse || '-'}</td>
                <td>${p.rack || '-'}</td>
                <td style="text-align:center"><strong>${p.quantity}</strong></td>
                <td style="text-align:right">${p.dateAdded}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleBackup = async () => {
    const json = await getDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `warehouse_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (importDatabaseJSON(content)) {
          alert('მონაცემები წარმატებით აღდგა! გთხოვთ დააჭიროთ OK გვერდის გასაახლებლად.');
          window.location.reload();
        } else {
          alert('შეცდომა ფაილის კითხვისას. დარწმუნდით რომ სწორი JSON ფაილია.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold text-gray-800">ანგარიშგება</h2>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm ${
              activeFilters.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Settings size={18} className="mr-2" />
            პარამეტრები
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
          >
            <FileSpreadsheet size={18} className="mr-2" />
            Excel
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Printer size={18} className="mr-2" />
            ბეჭდვა
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-none">
        <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {activeFilters.length > 0 ? 'მომხმარებლის ანგარიში' : 'საწყობის სრული ანგარიში'}
            </h1>
            <p className="text-gray-500">გენერირების თარიღი: {new Date().toLocaleString('ka-GE')}</p>
            
            {activeFilters.length > 0 && (
               <div className="mt-4 flex flex-wrap gap-2">
                 <div className="flex items-center text-sm text-gray-500 mr-2">
                   <Filter size={16} className="mr-1" />
                   გამოყენებული ფილტრები:
                 </div>
                 {activeFilters.map(f => (
                   <span key={f.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                     {f.label}: {f.displayValue}
                   </span>
                 ))}
               </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">ნაპოვნია (ჩანაწერი)</p>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">ჯამური რაოდენობა (ერთეული)</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">მონაცემები</h3>
          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="p-3 font-semibold text-gray-800">ნომენკლატურა</th>
                    <th className="p-3 font-semibold text-gray-800">დასახელება</th>
                    <th className="p-3 font-semibold text-gray-800">კატეგორია</th>
                    <th className="p-3 font-semibold text-gray-800">საწყობი</th>
                    <th className="p-3 font-semibold text-gray-800">სტელაჟი</th>
                    <th className="p-3 font-semibold text-gray-800 text-center">რაოდენობა</th>
                    <th className="p-3 font-semibold text-gray-800 text-right">თარიღი</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3 text-gray-900 font-mono">{p.nomenclature}</td>
                      <td className="p-3 font-medium text-gray-900">{p.name}</td>
                      <td className="p-3 text-gray-900">{p.category}</td>
                      <td className="p-3 text-gray-900">{p.warehouse || '-'}</td>
                      <td className="p-3 text-gray-900">{p.rack || '-'}</td>
                      <td className={`p-3 text-center font-bold text-gray-900`}>
                        {p.quantity}
                      </td>
                      <td className="p-3 text-right text-gray-900 whitespace-nowrap">{p.dateAdded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">ამ პარამეტრებით მონაცემები ვერ მოიძებნა</p>
          )}
        </div>
      </div>

      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl animate-fade-in overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Settings size={20} className="mr-2 text-indigo-600" />
                რეპორტის კონსტრუქტორი
              </h3>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4 border-b border-gray-200 pb-6">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center">
                   <Filter size={16} className="mr-2" />
                   ფილტრების დამატება
                </h4>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">პარამეტრი</label>
                    <select
                      value={selectedFilterType}
                      onChange={(e) => {
                         setSelectedFilterType(e.target.value as FilterType);
                         setTempValue('');
                         setTempRange({min: '', max: ''});
                         setTempDateRange({start: '', end: ''});
                      }}
                      className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="category">კატეგორია</option>
                      <option value="warehouse">საწყობი</option>
                      <option value="rack">სტელაჟი</option>
                      <option value="quantity">რაოდენობა (Range)</option>
                      <option value="dateAdded">დამატების თარიღი</option>
                    </select>
                  </div>

                  <div className="animate-fade-in">
                    
                    {selectedFilterType === 'category' && (
                       <select
                         value={tempValue}
                         onChange={(e) => setTempValue(e.target.value)}
                         className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       >
                         <option value="">აირჩიეთ კატეგორია...</option>
                         {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    )}

                    {selectedFilterType === 'warehouse' && (
                       <select
                         value={tempValue}
                         onChange={(e) => setTempValue(e.target.value)}
                         className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       >
                         <option value="">აირჩიეთ საწყობი...</option>
                         {uniqueWarehouses.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    )}

                    {selectedFilterType === 'rack' && (
                       <select
                         value={tempValue}
                         onChange={(e) => setTempValue(e.target.value)}
                         className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                       >
                         <option value="">აირჩიეთ სტელაჟი...</option>
                         {uniqueRacks.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    )}

                    {selectedFilterType === 'quantity' && (
                       <div className="flex gap-4">
                          <div className="w-1/2">
                            <input 
                               type="number"
                               placeholder="მინიმუმი"
                               value={tempRange.min}
                               onChange={e => setTempRange({...tempRange, min: e.target.value})}
                               className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div className="w-1/2">
                            <input 
                               type="number"
                               placeholder="მაქსიმუმი"
                               value={tempRange.max}
                               onChange={e => setTempRange({...tempRange, max: e.target.value})}
                               className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                       </div>
                    )}

                    {selectedFilterType === 'dateAdded' && (
                       <div className="flex gap-4">
                          <div className="w-1/2">
                            <label className="text-xs text-gray-500 mb-1 block">დან</label>
                            <input 
                               type="date"
                               value={tempDateRange.start}
                               onChange={e => setTempDateRange({...tempDateRange, start: e.target.value})}
                               className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div className="w-1/2">
                            <label className="text-xs text-gray-500 mb-1 block">მდე</label>
                            <input 
                               type="date"
                               value={tempDateRange.end}
                               onChange={e => setTempDateRange({...tempDateRange, end: e.target.value})}
                               className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                       </div>
                    )}

                  </div>

                  <button
                    onClick={addFilter}
                    disabled={
                        (selectedFilterType === 'category' && !tempValue) ||
                        (selectedFilterType === 'warehouse' && !tempValue) ||
                        (selectedFilterType === 'rack' && !tempValue) ||
                        (selectedFilterType === 'quantity' && !tempRange.min && !tempRange.max) ||
                        (selectedFilterType === 'dateAdded' && !tempDateRange.start && !tempDateRange.end)
                    }
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium flex justify-center items-center"
                  >
                    <Plus size={18} className="mr-2" />
                    ფილტრის დამატება
                  </button>
                </div>

                {activeFilters.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">გააქტიურებული ფილტრები:</p>
                    <div className="flex flex-col gap-2">
                      {activeFilters.map(filter => (
                        <div key={filter.id} className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                          <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase mr-2">{filter.label}:</span>
                            <span className="text-sm font-medium text-gray-800">{filter.displayValue}</span>
                          </div>
                          <button 
                             onClick={() => removeFilter(filter.id)}
                             className="text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                    <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                        არცერთი ფილტრი არ არის არჩეული.
                    </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">მონაცემთა ბაზა</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleBackup}
                    className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <Database size={24} className="text-gray-500 group-hover:text-blue-600 mb-2" />
                    <span className="text-xs font-medium text-gray-900">შენახვა (Backup)</span>
                  </button>

                  <div className="relative">
                     <input 
                      type="file" 
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleRestore}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                     <button 
                      className="w-full h-full flex flex-col items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition group"
                     >
                      <Upload size={24} className="text-gray-500 group-hover:text-orange-600 mb-2" />
                      <span className="text-xs font-medium text-gray-900">აღდგენა</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end sticky bottom-0">
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="flex items-center px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition font-medium"
              >
                <Check size={18} className="mr-2" />
                გამოყენება და დახურვა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};