import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, FileText } from 'lucide-react';
import { getUserNote, saveUserNote } from '../services/storage';

interface NotepadProps {
  userId: string;
  onClose: () => void;
}

export const Notepad: React.FC<NotepadProps> = ({ userId, onClose }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const content = await getUserNote(userId);
      setNote(content);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    await saveUserNote(userId, note);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 flex flex-col h-[60vh]">
        <div className="p-4 bg-yellow-50 flex justify-between items-center border-b border-yellow-100">
          <h3 className="font-bold text-yellow-800 flex items-center">
             <FileText size={20} className="mr-2" />
             პირადი ბლოკნოტი
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-yellow-100 rounded-full text-yellow-700 transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 p-4 bg-yellow-50/30 relative">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="animate-spin text-yellow-600" size={32} />
             </div>
           ) : (
             <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-full p-4 bg-transparent border-none outline-none resize-none font-mono text-gray-800 text-sm leading-relaxed"
                placeholder="ჩაწერეთ თქვენი შენიშვნები აქ..."
             />
           )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
            <span className="text-xs text-gray-400">ინახება ავტომატურად ბაზაში</span>
            <button 
                onClick={handleSave} 
                disabled={saving || loading}
                className="flex items-center px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-bold shadow-sm transition disabled:opacity-50"
            >
                {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                შენახვა
            </button>
        </div>
      </div>
    </div>
  );
};