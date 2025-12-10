import React, { useState } from 'react';
import { X, Delete } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleEqual = () => {
    try {
      const fullEq = equation + display;
      // eslint-disable-next-line no-eval
      const result = eval(fullEq.replace('x', '*'));
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const btnClass = "h-14 rounded-lg font-bold text-xl transition active:scale-95 shadow-sm";
  const numClass = `${btnClass} bg-gray-100 text-gray-800 hover:bg-gray-200`;
  const opClass = `${btnClass} bg-indigo-100 text-indigo-700 hover:bg-indigo-200`;
  const eqClass = `${btnClass} bg-indigo-600 text-white hover:bg-indigo-700`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-bold text-gray-700">კალკულატორი</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4 bg-gray-900 rounded-xl p-4 text-right shadow-inner">
             <div className="text-gray-400 text-xs h-4">{equation}</div>
             <div className="text-white text-3xl font-mono truncate">{display}</div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button onClick={handleClear} className={`${opClass} col-span-3 bg-red-100 text-red-600 hover:bg-red-200`}>C</button>
            <button onClick={() => handleOperator('/')} className={opClass}>/</button>
            
            <button onClick={() => handleNumber('7')} className={numClass}>7</button>
            <button onClick={() => handleNumber('8')} className={numClass}>8</button>
            <button onClick={() => handleNumber('9')} className={numClass}>9</button>
            <button onClick={() => handleOperator('*')} className={opClass}>x</button>
            
            <button onClick={() => handleNumber('4')} className={numClass}>4</button>
            <button onClick={() => handleNumber('5')} className={numClass}>5</button>
            <button onClick={() => handleNumber('6')} className={numClass}>6</button>
            <button onClick={() => handleOperator('-')} className={opClass}>-</button>
            
            <button onClick={() => handleNumber('1')} className={numClass}>1</button>
            <button onClick={() => handleNumber('2')} className={numClass}>2</button>
            <button onClick={() => handleNumber('3')} className={numClass}>3</button>
            <button onClick={() => handleOperator('+')} className={opClass}>+</button>
            
            <button onClick={() => handleNumber('0')} className={`${numClass} col-span-2`}>0</button>
            <button onClick={() => handleNumber('.')} className={numClass}>.</button>
            <button onClick={handleEqual} className={eqClass}>=</button>
          </div>
        </div>
      </div>
    </div>
  );
};