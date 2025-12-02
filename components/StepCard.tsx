import React from 'react';

interface StepCardProps {
  icon: React.ReactNode;
  step: number;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

export const StepCard: React.FC<StepCardProps> = ({ icon, step, title, description, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative bg-white p-6 rounded-2xl border transition-all duration-300 cursor-pointer group hover:shadow-lg
        ${isActive 
          ? 'border-blue-500 shadow-md ring-1 ring-blue-500' 
          : 'border-slate-200 hover:border-blue-300'
        }
      `}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isActive ? 'bg-blue-50' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
          {icon}
        </div>
        
        <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
          ნაბიჯი {step}
        </span>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {title}
        </h3>
        
        <p className="text-slate-500 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};