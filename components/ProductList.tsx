import React, { useState } from 'react';
import { Product, Role } from '../types';
import { Search, Edit2, Trash2, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  userRole: Role;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, userRole, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = userRole === 'admin' || userRole === 'editor';
  const canDelete = userRole === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">საწყობის მარაგები</h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="ძებნა (სახელი, კოდი, საწყობი)..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
                <th className="p-4 w-16">ფოტო</th>
                <th className="p-4">ნომენკლატურა</th>
                <th className="p-4">დასახელება</th>
                <th className="p-4">კატეგორია</th>
                <th className="p-4">საწყობი / სტელაჟი</th>
                <th className="p-4 text-center">რაოდენობა</th>
                {(canEdit || canDelete) && <th className="p-4 text-center">მოქმედება</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const isLowStock = product.isLowStockTracked && (product.quantity <= product.minQuantity);
                  const hasImage = product.images && product.images.length > 0;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                          {hasImage ? (
                            <img src={product.images[0]} alt="thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={20} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm text-gray-600">{product.nomenclature}</td>
                      <td className="p-4 text-gray-800 font-medium">{product.name}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          {product.category || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {product.warehouse ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-700">{product.warehouse}</span>
                            <span className="text-xs text-gray-500">{product.rack}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className={`font-semibold text-lg ${isLowStock ? 'text-red-600' : 'text-gray-700'}`}>
                            {product.quantity}
                          </span>
                          {isLowStock && (
                            <div className="group relative">
                              <AlertCircle size={16} className="text-red-500 cursor-help" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                მცირე მარაგი! (მინ: {product.minQuantity})
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="p-4">
                          <div className="flex justify-center space-x-2">
                            {canEdit && (
                              <button 
                                onClick={() => onEdit(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="რედაქტირება"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => {
                                  if(window.confirm('ნამდვილად გსურთ პროდუქტის წაშლა?')) {
                                    onDelete(product.id);
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="წაშლა"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canEdit || canDelete ? 7 : 6} className="p-8 text-center text-gray-500">
                    მონაცემები ვერ მოიძებნა
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-right text-sm text-gray-500">
          სულ: {filteredProducts.length} ჩანაწერი
        </div>
      </div>
    </div>
  );
};