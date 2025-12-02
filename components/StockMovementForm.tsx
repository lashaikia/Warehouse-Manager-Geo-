import React, { useState } from 'react';
import { Product } from '../types';
import { Save, X, Search, Calendar, Camera, Image as ImageIcon, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface StockMovementFormProps {
  products: Product[];
  type: 'inbound' | 'outbound';
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const StockMovementForm: React.FC<StockMovementFormProps> = ({ products, type, onSubmit, onCancel }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number | string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  
  const [searchNom, setSearchNom] = useState('');
  const [searchName, setSearchName] = useState('');

  const isOutbound = type === 'outbound';
  const colorClass = isOutbound ? 'orange' : 'green';
  const title = isOutbound ? 'საქონლის გატანა' : 'საქონლის მიღება';

  const handleNomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchNom(val);
    const found = products.find(p => p.nomenclature === val);
    if (found) {
      setSelectedProduct(found);
      setSearchName(found.name);
    } else {
      setSelectedProduct(null);
      setSearchName('');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchName(val);
    const found = products.find(p => p.name === val);
    if (found) {
      setSelectedProduct(found);
      setSearchNom(found.nomenclature);
    } else {
      const exactMatch = products.find(p => p.name === val);
      if(exactMatch) {
         setSelectedProduct(exactMatch);
         setSearchNom(exactMatch.nomenclature);
      } else {
         setSelectedProduct(null);
      }
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as Blob);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    const qtyNum = Number(quantity);
    if (qtyNum <= 0) {
        alert('რაოდენობა უნდა იყოს 0-ზე მეტი');
        return;
    }
    
    if (isOutbound && qtyNum > selectedProduct.quantity) {
        alert(`შეცდომა: საწყობში არის მხოლოდ ${selectedProduct.quantity} ცალი.`);
        return;
    }

    onSubmit({
      productId: selectedProduct.id,
      quantity: qtyNum,
      date,
      notes,
      images
    });
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-100 max-w-2xl mx-auto animate-fade-in">
      <div className={`flex items-center mb-6 pb-4 border-b border-gray-100`}>
        <div className={`p-3 rounded-full mr-4 bg-${colorClass}-100 text-${colorClass}-600`}>
          {isOutbound ? <ArrowUpCircle size={28} /> : <ArrowDownCircle size={28} />}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">
            {isOutbound ? 'მარაგების ჩამოწერა / გაცემა' : 'არსებული მარაგების შევსება'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase">პროდუქტის მოძებნა</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">ნომენკლატურა</label>
              <div className="relative">
                <input
                  list="nom-options"
                  className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  placeholder="ძებნა კოდით..."
                  value={searchNom}
                  onChange={handleNomChange}
                  autoComplete="off"
                />
                <datalist id="nom-options">
                  {products.map(p => <option key={p.id} value={p.nomenclature} />)}
                </datalist>
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500">დასახელება</label>
              <div className="relative">
                <input
                  list="name-options"
                  className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ძებნა სახელით..."
                  value={searchName}
                  onChange={handleNameChange}
                  autoComplete="off"
                />
                <datalist id="name-options">
                  {products.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {selectedProduct && (
            <div className="mt-2 p-3 bg-blue-50 text-blue-800 rounded text-sm border border-blue-100 flex justify-between">
              <span>ნაპოვნია: <strong>{selectedProduct.name}</strong></span>
              <span>ნაშთი: <strong>{selectedProduct.quantity}</strong></span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
               {isOutbound ? 'გასატანი რაოდენობა *' : 'მისაღები რაოდენობა *'}
            </label>
            <input
              required
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar size={16} className="mr-1" />
                {isOutbound ? 'გატანის თარიღი' : 'მიღების თარიღი'}
             </label>
             <input
               type="date"
               value={date}
               onChange={(e) => setDate(e.target.value)}
               className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
             />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">შენიშვნა / აღწერილობა</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder={isOutbound ? "მაგ: ობიექტი N2, პასუხისმგებელი პირი..." : "მაგ: ინვოისი N123, მომწოდებელი შპს..."}
              />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {isOutbound ? 'დოკუმენტაციის ფოტო' : 'დოკუმენტაციის / ტვირთის ფოტო'}
            </label>
            <div className="flex flex-wrap gap-4">
             <div className="relative">
               <input
                 type="file"
                 multiple
                 accept="image/*"
                 onChange={handleImageUpload}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
               <button type="button" className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition">
                 <ImageIcon size={20} className="mr-2" />
                 ატვირთვა
               </button>
             </div>
             <div className="relative">
               <input
                 type="file"
                 accept="image/*"
                 capture="environment"
                 onChange={handleImageUpload}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               />
               <button type="button" className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 transition">
                 <Camera size={20} className="mr-2" />
                 კამერა
               </button>
             </div>
            </div>
            
            {images.length > 0 && (
               <div className="flex flex-wrap gap-3 mt-2">
                 {images.map((img, idx) => (
                   <div key={idx} className="relative group w-20 h-20">
                     <img src={img} alt="Doc" className="w-full h-full object-cover rounded border border-gray-300" />
                     <button
                       type="button"
                       onClick={() => removeImage(idx)}
                       className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                     >
                       <X size={12} />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={!selectedProduct}
            className={`flex items-center px-8 py-2 text-white rounded-lg shadow-md transition ${!selectedProduct ? 'bg-gray-400 cursor-not-allowed' : `bg-${colorClass}-600 hover:bg-${colorClass}-700`}`}
          >
            <Save size={18} className="mr-2" />
            {isOutbound ? 'გატანა' : 'მიღება'}
          </button>
        </div>

      </form>
    </div>
  );
};