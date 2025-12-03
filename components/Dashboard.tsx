import React, { useState } from 'react';
import { Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, AlertTriangle, Layers, Wifi, X, Maximize2, List, Gamepad2 } from 'lucide-react';
import { SnakeGame } from './SnakeGame';

interface DashboardProps {
  products: Product[];
}

export const Dashboard: React.FC<DashboardProps> = ({ products }) => {
  // Filter for active products (quantity > 0)
  const activeProducts = products.filter(p => p.quantity > 0);

  const totalProducts = activeProducts.length;
  const totalQuantity = activeProducts.reduce((acc, curr) => acc + curr.quantity, 0);
  const lowStockProducts = activeProducts.filter(p => p.isLowStockTracked && (p.quantity <= p.minQuantity));
  const lowStockCount = lowStockProducts.length;

  const [expandedChart, setExpandedChart] = useState(false);
  const [showActiveList, setShowActiveList] = useState(false);
  const [showLowStockList, setShowLowStockList] = useState(false);
  const [showSnakeGame, setShowSnakeGame] = useState(false);

  const categoryData = activeProducts.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.quantity;
    } else {
      acc.push({ name: curr.category || 'სხვა', value: curr.quantity });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getUnitLabel = (u?: string) => {
    switch(u) {
      case 'kg': return 'კგ';
      case 'm': return 'მეტრი';
      case 'l': return 'ლიტრი';
      default: return 'ცალი';
    }
  };

  // Modal Component for lists
  const ListModal = ({ title, items, onClose }: { title: string, items: Product[], onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col text-gray-800" onClick={e => e.stopPropagation()}>
         <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={20} /></button>
         </div>
         <div className="p-0 overflow-y-auto flex-1 bg-white">
            {items.length > 0 ? (
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0">
                        <tr>
                            <th className="p-3">კოდი</th>
                            <th className="p-3">დასახელება</th>
                            <th className="p-3 text-center">რაოდენობა</th>
                            <th className="p-3">საწყობი</th>
                            <th className="p-3 text-right">თარიღი</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                        {items.sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()).map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-3 font-mono text-gray-600">{p.nomenclature}</td>
                                <td className="p-3 font-medium text-gray-900">{p.name}</td>
                                <td className="p-3 text-center font-bold text-gray-900">
                                  {p.quantity} <span className="text-xs font-normal text-gray-500">{getUnitLabel(p.unit)}</span>
                                </td>
                                <td className="p-3 text-gray-600">{p.warehouse}</td>
                                <td className="p-3 text-right text-gray-500">{p.dateAdded}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-center p-8 text-gray-500">სია ცარიელია</p>
            )}
         </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">მიმოხილვა</h2>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-medium">
             <Wifi size={16} />
             <span>Cloud Connected</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
            onClick={() => setShowActiveList(true)}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 cursor-pointer hover:shadow-md transition group"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">აქტიური პროდუქტები</p>
            <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">საერთო რაოდენობა</p>
            <p className="text-2xl font-bold text-gray-800">{totalQuantity.toFixed(2)}</p>
          </div>
        </div>

        <div 
            onClick={() => lowStockCount > 0 && setShowLowStockList(true)}
            className={`p-6 rounded-xl shadow-sm border flex items-center space-x-4 transition ${lowStockCount > 0 ? 'bg-red-50 border-red-100 cursor-pointer hover:shadow-md' : 'bg-white border-gray-100'}`}
        >
          <div className={`p-3 rounded-full ${lowStockCount > 0 ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className={`text-sm ${lowStockCount > 0 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>ყურადღება (ზღვარი)</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>{lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-semibold text-gray-700">აქტიური მარაგები კატეგორიების მიხედვით</h3>
             <button onClick={() => setExpandedChart(true)} className="text-gray-400 hover:text-blue-600 transition"><Maximize2 size={20} /></button>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                formatter={(value) => [`${value} ერთეული`, 'რაოდენობა']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Fun Button */}
      <div className="flex justify-center mt-8">
        <button 
          onClick={() => setShowSnakeGame(true)}
          className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <Gamepad2 size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="font-bold tracking-wide text-sm">გართობა</span>
        </button>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-white z-50 p-8 flex flex-col animate-fade-in text-gray-800">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">დეტალური სტატისტიკა</h2>
                <button onClick={() => setExpandedChart(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={24}/></button>
            </div>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} ერთეული`, 'რაოდენობა']} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

      {/* Active List Modal */}
      {showActiveList && (
        <ListModal 
            title="აქტიური მარაგები (რაოდენობა > 0)" 
            items={activeProducts} 
            onClose={() => setShowActiveList(false)} 
        />
      )}

      {/* Low Stock Modal */}
      {showLowStockList && (
        <ListModal 
            title="მცირე მარაგები (ზღვარს ქვემოთ)" 
            items={lowStockProducts} 
            onClose={() => setShowLowStockList(false)} 
        />
      )}

      {/* Snake Game Modal */}
      {showSnakeGame && (
        <SnakeGame onClose={() => setShowSnakeGame(false)} />
      )}

    </div>
  );
};