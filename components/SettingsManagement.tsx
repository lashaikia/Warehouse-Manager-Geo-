
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, Save, X, Database, Layers, LayoutGrid, Loader2, Palette, Check, Trash, AlertOctagon, RefreshCcw } from 'lucide-react';
import { getOptions, saveOption, deleteOption, updateOptionAndCascade, clearOperationalData, clearProductsCollection, clearTransactionsCollection } from '../services/storage';
import { Theme } from '../types';

type SettingsTab = 'warehouses' | 'racks' | 'categories' | 'appearance' | 'data';

interface SettingsManagementProps {
  currentTheme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

export const SettingsManagement: React.FC<SettingsManagementProps> = ({ currentTheme = 'classic', onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('warehouses');
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [inputValue, setInputValue] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'appearance' && activeTab !== 'data') {
        loadItems();
    }
  }, [activeTab]);

  const loadItems = async () => {
    setLoading(true);
    const data = await getOptions(activeTab as 'warehouses' | 'racks' | 'categories');
    setItems(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || activeTab === 'appearance' || activeTab === 'data') return;
    setLoading(true);

    if (editingItem) {
        const updatedList = await updateOptionAndCascade(activeTab as any, editingItem, inputValue.trim());
        setItems(updatedList);
        setEditingItem(null);
    } else {
        const updatedList = await saveOption(activeTab as any, inputValue.trim());
        setItems(updatedList);
    }
    setLoading(false);
    setInputValue('');
  };

  const handleEditClick = (item: string) => {
    setEditingItem(item);
    setInputValue(item);
  };

  const handleDeleteClick = async (item: string) => {
    if (window.confirm(`ნამდვილად გსურთ წაშლა: "${item}"? \nგაფრთხილება: პროდუქტებს, რომლებსაც ეს პარამეტრი აქვთ მითითებული, მონაცემი არ წაეშლებათ, მაგრამ სიაში აღარ გამოჩნდება.`)) {
        setLoading(true);
        const updatedList = await deleteOption(activeTab as any, item);
        setItems(updatedList);
        setLoading(false);
    }
  };

  const handleClearProducts = async () => {
      if (window.confirm("ნამდვილად გსურთ მხოლოდ მარაგების (პროდუქტების) წაშლა?")) {
          setLoading(true);
          const success = await clearProductsCollection();
          setLoading(false);
          if (success) {
              alert("პროდუქტები წაიშალა.");
              window.location.reload();
          } else {
              alert("შეცდომა წაშლისას.");
          }
      }
  };

  const handleClearTransactions = async () => {
      if (window.confirm("ნამდვილად გსურთ მხოლოდ ისტორიის (ტრანზაქციების) წაშლა?")) {
          setLoading(true);
          const success = await clearTransactionsCollection();
          setLoading(false);
          if (success) {
              alert("ისტორია წაიშალა.");
              window.location.reload();
          } else {
              alert("შეცდომა წაშლისას.");
          }
      }
  };

  const handleClearData = async () => {
      const confirm1 = window.confirm("ყურადღება! ნამდვილად გსურთ ბაზის სრული გასუფთავება? \n\nეს წაშლის ყველა პროდუქტს და ტრანზაქციას!");
      if (confirm1) {
          const confirm2 = window.confirm("დარწმუნებული ხართ? მონაცემების აღდგენა შეუძლებელი იქნება!");
          if (confirm2) {
              setLoading(true);
              const success = await clearOperationalData();
              setLoading(false);
              if (success) {
                  alert("მონაცემები სრულად წაიშალა.");
                  window.location.reload();
              } else {
                  alert("შეცდომა მონაცემების წაშლისას.");
              }
          }
      }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setInputValue('');
  };

  const getTabLabel = (tab: SettingsTab) => {
    switch(tab) {
        case 'warehouses': return 'საწყობები';
        case 'racks': return 'სტელაჟები';
        case 'categories': return 'კატეგორიები';
        case 'appearance': return 'გაფორმება';
        case 'data': return 'მონაცემები';
    }
  };

  const getTabIcon = (tab: SettingsTab) => {
    switch(tab) {
        case 'warehouses': return <Database size={18} className="mr-2" />;
        case 'racks': return <LayoutGrid size={18} className="mr-2" />;
        case 'categories': return <Layers size={18} className="mr-2" />;
        case 'appearance': return <Palette size={18} className="mr-2" />;
        case 'data': return <Trash size={18} className="mr-2" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
         <h2 className="text-2xl font-bold text-gray-800 flex items-center">
           <Settings className="mr-3 text-indigo-600" size={28} />
           სისტემური პარამეტრები
         </h2>
         <p className="text-gray-500 text-sm mt-1">ჩამოსაშლელი სიების და მონაცემების მართვა</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex flex-col space-y-2">
            {(['warehouses', 'racks', 'categories', 'appearance', 'data'] as SettingsTab[]).map(tab => (
                <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); cancelEdit(); }}
                    className={`flex items-center px-4 py-3 rounded-lg transition text-left font-medium ${
                        activeTab === tab 
                        ? 'bg-white shadow-md text-indigo-600 border border-indigo-100' 
                        : 'bg-transparent text-gray-600 hover:bg-white hover:shadow-sm'
                    }`}
                >
                    {getTabIcon(tab)}
                    {getTabLabel(tab)}
                </button>
            ))}
        </div>

        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative min-h-[400px]">
            
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                {getTabLabel(activeTab)}
            </h3>

            {activeTab === 'appearance' ? (
                <div className="space-y-6">
                    <p className="text-sm text-gray-500">აირჩიეთ პროგრამის ვიზუალური სტილი</p>
                    {/* Theme Grid Logic remains same, omitted for brevity but keeping structure */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div onClick={() => onThemeChange?.('classic')} className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${currentTheme === 'classic' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
                             <div className="flex items-center justify-between"><span className="font-bold text-gray-800">Classic</span>{currentTheme === 'classic' && <Check size={20} className="text-blue-600" />}</div>
                        </div>
                        <div onClick={() => onThemeChange?.('executive')} className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${currentTheme === 'executive' ? 'border-slate-800 bg-slate-100' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between"><span className="font-bold text-gray-800">Executive</span>{currentTheme === 'executive' && <Check size={20} className="text-slate-800" />}</div>
                        </div>
                        <div onClick={() => onThemeChange?.('glass')} className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${currentTheme === 'glass' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between"><span className="font-bold text-gray-800">Glass</span>{currentTheme === 'glass' && <Check size={20} className="text-indigo-600" />}</div>
                        </div>
                        <div onClick={() => onThemeChange?.('midnight')} className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${currentTheme === 'midnight' ? 'border-blue-400 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between"><span className={`font-bold ${currentTheme === 'midnight' ? 'text-blue-400' : 'text-gray-800'}`}>Midnight</span>{currentTheme === 'midnight' && <Check size={20} className="text-blue-400" />}</div>
                        </div>
                        <div onClick={() => onThemeChange?.('nature')} className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${currentTheme === 'nature' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between"><span className="font-bold text-gray-800">Nature</span>{currentTheme === 'nature' && <Check size={20} className="text-emerald-700" />}</div>
                        </div>
                         <div onClick={() => onThemeChange?.('sunset')} className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${currentTheme === 'sunset' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between"><span className="font-bold text-gray-800">Sunset</span>{currentTheme === 'sunset' && <Check size={20} className="text-orange-600" />}</div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'data' ? (
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertOctagon className="text-red-600" size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-800 mb-2">მონაცემების მართვა</h4>
                        <p className="text-gray-500 mb-6 text-sm max-w-md mx-auto">
                            აირჩიეთ სასურველი მოქმედება. წაშლის შემდეგ მონაცემების აღდგენა შეუძლებელია.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={handleClearProducts}
                                disabled={loading}
                                className="px-4 py-4 bg-orange-50 text-orange-700 font-bold rounded-xl border border-orange-200 hover:bg-orange-100 transition flex flex-col items-center justify-center disabled:opacity-50"
                            >
                                <Database size={24} className="mb-2" />
                                წაშალე მარაგები (პროდუქტები)
                            </button>

                            <button 
                                onClick={handleClearTransactions}
                                disabled={loading}
                                className="px-4 py-4 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 transition flex flex-col items-center justify-center disabled:opacity-50"
                            >
                                <RefreshCcw size={24} className="mb-2" />
                                წაშალე ისტორია (ტრანზაქციები)
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100">
                             <button 
                                onClick={handleClearData}
                                disabled={loading}
                                className="w-full px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition flex items-center justify-center disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Trash className="mr-2" />}
                                სრული გასუფთავება (ყველაფრის წაშლა)
                            </button>
                            <p className="text-xs text-red-400 mt-2">პარამეტრები, საზომი ერთეულები და მომხმარებლები არ წაიშლება.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {loading && (
                    <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-xl">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                        <input 
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={editingItem ? "შეიყვანეთ ახალი სახელი..." : "დაამატე ახალი..."}
                            className="flex-1 p-2.5 bg-gray-50 border border-gray-200 text-black rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center disabled:opacity-50"
                        >
                            {editingItem ? <Save size={18} /> : <Plus size={18} />}
                            <span className="ml-2 hidden sm:inline">{editingItem ? 'შენახვა' : 'დამატება'}</span>
                        </button>
                        {editingItem && (
                            <button 
                                type="button"
                                onClick={cancelEdit}
                                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </form>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {items.length > 0 ? (
                            items.map((item, idx) => (
                                <div key={idx} className="group flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition">
                                    <span className="text-gray-900 font-medium">{item}</span>
                                    <div className="flex space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEditClick(item)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                                            title="გადარქმევა"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(item)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                            title="წაშლა"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-400 py-4">სია ცარიელია</p>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
