import React from 'react';
import { Product } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, AlertTriangle, Layers, Wifi } from 'lucide-react';

interface DashboardProps {
  products: Product[];
}

export const Dashboard: React.FC<DashboardProps> = ({ products }) => {
  const totalProducts = products.length;
  const totalQuantity = products.reduce((acc, curr) => acc + curr.quantity, 0);
  const lowStockCount = products.filter(p => p.isLowStockTracked && (p.quantity <= p.minQuantity)).length;

  const categoryData = products.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.quantity;
    } else {
      acc.push({ name: curr.category || 'სხვა', value: curr.quantity });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">მიმოხილვა</h2>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-sm font-medium">
             <Wifi size={16} />
             <span>Cloud Connected</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">სულ პროდუქტები</p>
            <p className="text-2xl font-bold text-gray-800">{totalProducts}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">საერთო რაოდენობა</p>
            <p className="text-2xl font-bold text-gray-800">{totalQuantity}</p>
          </div>
        </div>

        <div className={`p-6 rounded-xl shadow-sm border flex items-center space-x-4 ${lowStockCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className={`p-3 rounded-full ${lowStockCount > 0 ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className={`text-sm ${lowStockCount > 0 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>ყურადღება (ზღვარი)</p>
            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>{lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">მარაგები კატეგორიების მიხედვით</h3>
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
  );
};