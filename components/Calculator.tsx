import React, { useState, useEffect } from 'react';
import { X, Delete, History, Calculator as CalcIcon, Scale, RotateCcw, ArrowRight, ArrowDownUp } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
}

type Mode = 'standard' | 'counting' | 'converter';
type ConvCategory = 'warehouse' | 'length' | 'weight' | 'area' | 'volume' | 'temp' | 'time';

// Conversion Rates (Base unit is the first in list)
const CONVERSION_DATA: any = {
    length: {
        units: { m: 1, km: 0.001, cm: 100, mm: 1000, ft: 3.28084, in: 39.3701, yd: 1.09361, mi: 0.000621371 },
        labels: { m: 'მეტრი (m)', km: 'კილომეტრი (km)', cm: 'სანტიმეტრი (cm)', mm: 'მილიმეტრი (mm)', ft: 'ფუტი (ft)', in: 'დუიმი (in)', yd: 'იარდი (yd)', mi: 'მილი (mi)' }
    },
    weight: {
        units: { kg: 1, g: 1000, mg: 1000000, t: 0.001, lb: 2.20462, oz: 35.274 },
        labels: { kg: 'კილოგრამი (kg)', g: 'გრამი (g)', mg: 'მილიგრამი (mg)', t: 'ტონა (t)', lb: 'გირვანქა (lb)', oz: 'უნცია (oz)' }
    },
    area: {
        units: { m2: 1, ha: 0.0001, km2: 0.000001, ft2: 10.7639, ac: 0.000247105 },
        labels: { m2: 'კვ. მეტრი (m²)', ha: 'ჰექტარი (ha)', km2: 'კვ. კილომეტრი (km²)', ft2: 'კვ. ფუტი (ft²)', ac: 'აკრი (ac)' }
    },
    volume: {
        units: { l: 1, ml: 1000, m3: 0.001, gal: 0.264172, fl_oz: 33.814 },
        labels: { l: 'ლიტრი (l)', ml: 'მილილიტრი (ml)', m3: 'კუბ. მეტრი (m³)', gal: 'გალონი (gal)', fl_oz: 'თხევადი უნცია (oz)' }
    },
    time: {
        units: { min: 1, s: 60, h: 1/60, d: 1/1440, wk: 1/10080 },
        labels: { min: 'წუთი', s: 'წამი', h: 'საათი', d: 'დღე', wk: 'კვირა' }
    },
    // Temperature handles separately due to formulas
    temp: {
        units: ['C', 'F', 'K'],
        labels: { C: 'ცელსიუსი (°C)', F: 'ფარენჰეიტი (°F)', K: 'კელვინი (K)' }
    }
};

export const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [mode, setMode] = useState<Mode>('standard');
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  
  // Counting Mode State
  const [countList, setCountList] = useState<number[]>([]);
  const [countResult, setCountResult] = useState<{sum: number, count: number} | null>(null);

  // Converter State
  const [convCategory, setConvCategory] = useState<ConvCategory>('warehouse');
  
  // Warehouse specific
  const [totalWeight, setTotalWeight] = useState('');
  const [unitWeight, setUnitWeight] = useState('');
  
  // General Converter
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [convInput, setConvInput] = useState('');
  const [convOutput, setConvOutput] = useState('');

  // Initialize dropdowns when category changes
  useEffect(() => {
      if (convCategory !== 'warehouse') {
          const units = CONVERSION_DATA[convCategory].units;
          const keys = Array.isArray(units) ? units : Object.keys(units);
          setFromUnit(keys[0]);
          setToUnit(keys[1] || keys[0]);
          setConvInput('');
          setConvOutput('');
      }
  }, [convCategory]);

  // --- Handlers for Standard & Counting ---

  const handleNumber = (num: string) => {
    if (countResult && mode === 'counting') {
        setCountList([]);
        setCountResult(null);
        setDisplay(num);
        return;
    }
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    if (mode === 'standard') {
        setEquation(display + ' ' + op + ' ');
        setDisplay('0');
    } else if (mode === 'counting') {
        if (op === '+') {
            const val = parseFloat(display);
            if (!isNaN(val)) {
                const newList = [...countList, val];
                setCountList(newList);
                setDisplay('0');
                setCountResult(null);
            }
        }
    }
  };

  const handleEqual = () => {
    if (mode === 'standard') {
        try {
            const fullEq = equation + display;
            // eslint-disable-next-line no-eval
            const result = eval(fullEq.replace('x', '*'));
            setDisplay(String(Number(result.toFixed(4))));
            setEquation('');
        } catch (e) {
            setDisplay('Error');
        }
    } else if (mode === 'counting') {
        let currentList = [...countList];
        const currentVal = parseFloat(display);
        if (currentVal > 0) {
            currentList.push(currentVal);
        }
        
        const sum = currentList.reduce((a, b) => a + b, 0);
        setCountResult({
            sum,
            count: currentList.length
        });
        setCountList(currentList);
        setDisplay('0');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setCountList([]);
    setCountResult(null);
  };

  const handleBackspace = () => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const handleMathFunc = (func: 'sqrt' | 'sqr' | 'recip') => {
      const val = parseFloat(display);
      if(isNaN(val)) return;
      
      let res = 0;
      if(func === 'sqrt') res = Math.sqrt(val);
      if(func === 'sqr') res = val * val;
      if(func === 'recip') res = 1 / val;
      
      setDisplay(String(Number(res.toFixed(4))));
  };

  // --- Converter Logic ---
  
  // 1. Warehouse Logic
  const calculatePackCount = () => {
      const total = parseFloat(totalWeight);
      const unit = parseFloat(unitWeight);
      if (total && unit) {
          return (total / unit).toFixed(2);
      }
      return '0';
  };

  // 2. General Conversion Logic
  const runConversion = (value: string) => {
      setConvInput(value);
      const val = parseFloat(value);
      if (isNaN(val)) {
          setConvOutput('');
          return;
      }

      if (convCategory === 'temp') {
          let res = val;
          // To Celsius first
          let inC = val;
          if (fromUnit === 'F') inC = (val - 32) * 5/9;
          if (fromUnit === 'K') inC = val - 273.15;
          
          // From Celsius to Target
          if (toUnit === 'C') res = inC;
          if (toUnit === 'F') res = (inC * 9/5) + 32;
          if (toUnit === 'K') res = inC + 273.15;
          
          setConvOutput(res.toFixed(2));
      } else {
          // Standard ratio conversion
          const rates = CONVERSION_DATA[convCategory].units;
          // Convert to base (divide by own rate), then to target (multiply by target rate)
          
          // Formula: val / rates[from] * rates[to]
          const baseValue = val / rates[fromUnit];
          const result = baseValue * rates[toUnit];
          
          // Cleanup formatting
          let formatted = result.toString();
          if (result % 1 !== 0) formatted = result.toFixed(4).replace(/\.?0+$/, '');
          setConvOutput(formatted);
      }
  };

  // Trigger conversion when units change
  useEffect(() => {
      if (convInput) runConversion(convInput);
  }, [fromUnit, toUnit]);


  // --- Render Helpers ---

  const renderTabs = () => (
    <div className="flex p-1 bg-gray-100 rounded-lg mb-4 mx-4">
        <button 
            onClick={() => { setMode('standard'); handleClear(); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mode === 'standard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
            სტანდარტული
        </button>
        <button 
            onClick={() => { setMode('counting'); handleClear(); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mode === 'counting' ? 'bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
            დათვლა
        </button>
        <button 
            onClick={() => { setMode('converter'); handleClear(); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mode === 'converter' ? 'bg-orange-100 text-orange-700 shadow-sm ring-1 ring-orange-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
            კონვერტორი
        </button>
    </div>
  );

  const btnClass = "h-12 rounded-lg font-bold text-lg transition active:scale-95 shadow-sm flex items-center justify-center";
  const numClass = `${btnClass} bg-white border border-gray-200 text-gray-800 hover:bg-gray-50`;
  const opClass = `${btnClass} bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200`;
  const actionClass = `${btnClass} bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100`;
  const eqClass = `${btnClass} bg-indigo-600 text-white hover:bg-indigo-700 shadow-md`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-bold text-gray-700 flex items-center">
             <CalcIcon size={18} className="mr-2" />
             კალკულატორი
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition">
            <X size={20} />
          </button>
        </div>
        
        {renderTabs()}

        {/* Display Area */}
        <div className="px-6 pb-2">
            <div className={`bg-gray-50 rounded-xl p-4 text-right shadow-inner border border-gray-100 h-32 flex flex-col justify-end overflow-hidden relative ${mode === 'counting' ? 'bg-blue-50/50 border-blue-100' : ''}`}>
                 {mode === 'standard' && (
                     <>
                        <div className="text-gray-400 text-sm h-6 font-mono">{equation}</div>
                        <div className="text-gray-800 text-4xl font-mono tracking-tight font-medium truncate">{display}</div>
                     </>
                 )}

                 {mode === 'counting' && (
                     <div className="flex flex-col h-full justify-between">
                        <div className="text-xs text-gray-400 text-left overflow-y-auto max-h-12 scrollbar-thin">
                            {countList.join(' + ')}
                            {countList.length > 0 && display !== '0' && ' + '}
                            {display !== '0' && display}
                        </div>
                        {countResult ? (
                            <div className="animate-fade-in">
                                <div className="text-blue-600 text-3xl font-bold font-mono">
                                    = {countResult.sum}
                                </div>
                                <div className="text-gray-500 text-xs font-bold mt-1 bg-white inline-block px-2 py-1 rounded-full border border-gray-200">
                                    ({countResult.count} ერთეული)
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-800 text-4xl font-mono tracking-tight font-medium truncate">{display}</div>
                        )}
                     </div>
                 )}

                {mode === 'converter' && (
                    <div className="flex flex-col items-center justify-center h-full text-orange-600/80 font-bold">
                        {convCategory === 'warehouse' ? 'საწყობის პაკეტები' : CONVERSION_DATA[convCategory]?.labels?.m?.split(' ')[0] || 'კონვერტორი'}
                    </div>
                )}
            </div>
        </div>

        {/* Keypad / Controls */}
        <div className="p-4 bg-gray-50 flex-1 overflow-y-auto">
          
          {/* STANDARD MODE KEYPAD */}
          {mode === 'standard' && (
              <div className="grid grid-cols-4 gap-2">
                {/* Memory Row (Visual Only for now) */}
                <button className="text-[10px] font-bold text-gray-400 hover:text-indigo-600">MC</button>
                <button className="text-[10px] font-bold text-gray-400 hover:text-indigo-600">MR</button>
                <button className="text-[10px] font-bold text-gray-400 hover:text-indigo-600">M+</button>
                <button className="text-[10px] font-bold text-gray-400 hover:text-indigo-600">M-</button>
                
                {/* Scientific Row */}
                <button onClick={() => handleMathFunc('recip')} className={opClass}>¹/x</button>
                <button onClick={() => handleMathFunc('sqr')} className={opClass}>x²</button>
                <button onClick={() => handleMathFunc('sqrt')} className={opClass}>√x</button>
                <button onClick={() => handleOperator('/')} className={actionClass}>÷</button>

                {/* Numpad */}
                <button onClick={() => handleNumber('7')} className={numClass}>7</button>
                <button onClick={() => handleNumber('8')} className={numClass}>8</button>
                <button onClick={() => handleNumber('9')} className={numClass}>9</button>
                <button onClick={() => handleOperator('*')} className={actionClass}>×</button>

                <button onClick={() => handleNumber('4')} className={numClass}>4</button>
                <button onClick={() => handleNumber('5')} className={numClass}>5</button>
                <button onClick={() => handleNumber('6')} className={numClass}>6</button>
                <button onClick={() => handleOperator('-')} className={actionClass}>-</button>

                <button onClick={() => handleNumber('1')} className={numClass}>1</button>
                <button onClick={() => handleNumber('2')} className={numClass}>2</button>
                <button onClick={() => handleNumber('3')} className={numClass}>3</button>
                <button onClick={() => handleOperator('+')} className={actionClass}>+</button>

                <button onClick={() => handleOperator('.')} className={numClass}>.</button>
                <button onClick={() => handleNumber('0')} className={numClass}>0</button>
                <button onClick={handleBackspace} className={`${opClass} text-red-500`}><Delete size={20} /></button>
                <button onClick={handleEqual} className={eqClass}>=</button>

                 <button onClick={handleClear} className="col-span-4 mt-2 h-10 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 transition">გასუფთავება (C)</button>
              </div>
          )}

          {/* COUNTING MODE KEYPAD */}
          {mode === 'counting' && (
              <div className="grid grid-cols-4 gap-2">
                 <div className="col-span-4 bg-blue-50 p-2 rounded-lg mb-2 text-xs text-blue-800 border border-blue-100 flex items-center">
                    <History size={14} className="mr-2" />
                    აკრიფეთ რიცხვი და დააჭირეთ "+" ღილაკს დასამატებლად.
                 </div>

                 <button onClick={() => handleNumber('7')} className={numClass}>7</button>
                 <button onClick={() => handleNumber('8')} className={numClass}>8</button>
                 <button onClick={() => handleNumber('9')} className={numClass}>9</button>
                 <button onClick={handleBackspace} className={`${opClass} text-red-500`}><Delete size={20} /></button>

                 <button onClick={() => handleNumber('4')} className={numClass}>4</button>
                 <button onClick={() => handleNumber('5')} className={numClass}>5</button>
                 <button onClick={() => handleNumber('6')} className={numClass}>6</button>
                 {/* Big Plus Button spans 2 rows */}
                 <button onClick={() => handleOperator('+')} className={`${actionClass} row-span-2 bg-blue-600 text-white hover:bg-blue-700 text-2xl`}>+</button>

                 <button onClick={() => handleNumber('1')} className={numClass}>1</button>
                 <button onClick={() => handleNumber('2')} className={numClass}>2</button>
                 <button onClick={() => handleNumber('3')} className={numClass}>3</button>
                 
                 <button onClick={() => handleNumber('0')} className={`${numClass} col-span-2`}>0</button>
                 <button onClick={() => handleNumber('.')} className={numClass}>.</button>
                 <button onClick={handleEqual} className={`${eqClass} bg-green-600 hover:bg-green-700`}>=</button>

                 <button onClick={handleClear} className="col-span-4 mt-2 h-10 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 transition">სიის გასუფთავება (Reset)</button>
              </div>
          )}

          {/* CONVERTER MODE UI */}
          {mode === 'converter' && (
              <div className="space-y-4">
                  {/* Category Selector */}
                  <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">კატეგორია</label>
                      <div className="relative">
                          <select 
                            value={convCategory}
                            onChange={(e) => setConvCategory(e.target.value as ConvCategory)}
                            className="w-full p-2 pl-9 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none appearance-none"
                          >
                              <option value="warehouse">📦 საწყობი (პაკეტები)</option>
                              <option value="length">📏 სიგრძე</option>
                              <option value="weight">⚖️ მასა / წონა</option>
                              <option value="temp">🌡️ ტემპერატურა</option>
                              <option value="area">📐 ფართობი</option>
                              <option value="volume">🧊 მოცულობა</option>
                              <option value="time">⏰ დრო</option>
                          </select>
                          <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      </div>
                  </div>

                  {convCategory === 'warehouse' ? (
                      /* Weight to Quantity Section */
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm animate-fade-in">
                          <h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center">
                              <Scale size={16} className="mr-2" />
                              წონა &gt რაოდენობა
                          </h4>
                          <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">სულ წონა</label>
                                    <input 
                                        type="number" 
                                        value={totalWeight}
                                        onChange={(e) => setTotalWeight(e.target.value)}
                                        placeholder="მაგ: 70"
                                        className="w-full p-2 rounded border border-gray-300 focus:border-orange-500 outline-none text-sm text-black"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">ერთეულის წონა</label>
                                    <input 
                                        type="number" 
                                        value={unitWeight}
                                        onChange={(e) => setUnitWeight(e.target.value)}
                                        placeholder="მაგ: 5"
                                        className="w-full p-2 rounded border border-gray-300 focus:border-orange-500 outline-none text-sm text-black"
                                    />
                                </div>
                              </div>
                              
                              <div className="bg-white p-3 rounded-lg border border-orange-200 flex justify-between items-center">
                                  <span className="text-sm text-gray-600">რაოდენობა:</span>
                                  <span className="text-xl font-bold text-orange-600">{calculatePackCount()}</span>
                              </div>
                          </div>
                      </div>
                  ) : (
                      /* Standard Converter UI */
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 animate-fade-in">
                          
                          {/* Input Section */}
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500">საიდან</label>
                              <input 
                                  type="number" 
                                  value={convInput}
                                  onChange={(e) => runConversion(e.target.value)}
                                  className="w-full p-2 text-lg font-mono border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-black"
                                  placeholder="0"
                              />
                              <select 
                                  value={fromUnit}
                                  onChange={(e) => setFromUnit(e.target.value)}
                                  className="w-full p-2 mt-1 bg-gray-50 border border-gray-200 rounded text-sm text-black"
                              >
                                  {Object.keys(CONVERSION_DATA[convCategory].labels).map(k => (
                                      <option key={k} value={k}>{CONVERSION_DATA[convCategory].labels[k]}</option>
                                  ))}
                              </select>
                          </div>

                          <div className="flex justify-center -my-2 relative z-10">
                              <div className="bg-indigo-50 p-2 rounded-full border border-indigo-100">
                                  <ArrowDownUp size={16} className="text-indigo-600" />
                              </div>
                          </div>

                          {/* Output Section */}
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-gray-500">სად</label>
                              <div className="w-full p-2 text-lg font-mono font-bold text-indigo-700 bg-indigo-50 rounded border border-indigo-100 min-h-[46px] flex items-center">
                                  {convOutput}
                              </div>
                              <select 
                                  value={toUnit}
                                  onChange={(e) => setToUnit(e.target.value)}
                                  className="w-full p-2 mt-1 bg-gray-50 border border-gray-200 rounded text-sm text-black"
                              >
                                  {Object.keys(CONVERSION_DATA[convCategory].labels).map(k => (
                                      <option key={k} value={k}>{CONVERSION_DATA[convCategory].labels[k]}</option>
                                  ))}
                              </select>
                          </div>

                      </div>
                  )}
              </div>
          )}

        </div>
      </div>
    </div>
  );
};