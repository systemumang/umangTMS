
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check, Square, CheckSquare, ListChecks, Eraser } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: React.ReactNode;
  options: Option[];
  value: string | string[]; // Single value or array of values
  onChange: (value: any) => void;
  multiple?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Select...',
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Robust value normalization: Ensure value is an array if multiple is true
  const currentValues = useMemo(() => {
    if (!multiple) return typeof value === 'string' ? value : '';
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      return value.split(',').map(s => s.trim());
    }
    return [];
  }, [value, multiple]);

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => {
      const labelA = String(a?.label || '');
      const labelB = String(b?.label || '');
      return labelA.localeCompare(labelB);
    });
  }, [options]);

  const filteredOptions = useMemo(() => {
    const safeSearch = searchTerm.toLowerCase().trim();
    if (!safeSearch) return sortedOptions;
    return sortedOptions.filter(option => 
      String(option?.label || '').toLowerCase().includes(safeSearch)
    );
  }, [sortedOptions, searchTerm]);

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const vals = Array.isArray(currentValues) ? currentValues : [];
      const newValue = vals.includes(optionValue)
        ? vals.filter(v => v !== optionValue)
        : [...vals, optionValue];
      onChange(newValue);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const handleSelectAllVisible = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!multiple) return;
    const visibleValues = filteredOptions.map(o => o.value);
    const existingValues = Array.isArray(currentValues) ? currentValues : [];
    const combined = Array.from(new Set([...existingValues, ...visibleValues]));
    onChange(combined);
    inputRef.current?.focus();
  };

  const handleClearAllVisible = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!multiple) return;
    const visibleValues = filteredOptions.map(o => o.value);
    const existingValues = Array.isArray(currentValues) ? currentValues : [];
    const remaining = existingValues.filter(v => !visibleValues.includes(v));
    onChange(remaining);
    inputRef.current?.focus();
  };

  const removeValue = (e: React.MouseEvent, valToRemove: string) => {
    e.stopPropagation();
    if (Array.isArray(currentValues)) {
      onChange(currentValues.filter(v => v !== valToRemove));
    } else {
      onChange('');
    }
  };

  const getDisplayValue = () => {
    if (multiple) {
       const vals = Array.isArray(currentValues) ? currentValues : [];
       if (vals.length === 0) return <span className="text-gray-400">{placeholder}</span>;
       
       return (
         <div className="flex flex-wrap gap-1.5 py-0.5">
           {vals.map(val => {
             const opt = options.find(o => o.value === val);
             return (
               <span key={val} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center border border-indigo-200">
                 {opt ? opt.label : val}
                 <X size={12} className="ml-1.5 cursor-pointer hover:text-red-600 transition-colors" onClick={(e) => removeValue(e, val)} />
               </span>
             );
           })}
         </div>
       );
    } else {
      const selectedOption = options.find(o => o.value === currentValues);
      return selectedOption ? (
        <span className="text-gray-900 font-medium">{selectedOption.label}</span>
      ) : (
        <span className="text-gray-400">{placeholder}</span>
      );
    }
  };

  return (
    <div className={`space-y-1 relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-500 cursor-pointer flex justify-between items-center min-h-[44px] transition-all ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-500' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 overflow-hidden">
          {getDisplayValue()}
        </div>
        <ChevronDown size={16} className={`text-indigo-400 flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0 z-10 space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-3 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 font-medium"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            
            {multiple && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-white border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  <ListChecks size={14} />
                  All
                </button>
                <button
                  type="button"
                  onClick={handleClearAllVisible}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Eraser size={14} />
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = multiple 
                    ? (Array.isArray(currentValues) && currentValues.includes(option.value))
                    : currentValues === option.value;
                
                return (
                  <div
                    key={option.value}
                    className={`px-4 py-3 text-sm cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0 ${isSelected ? 'bg-indigo-50/50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option.value);
                    }}
                  >
                    <div className="flex-shrink-0">
                      {multiple ? (
                        isSelected ? (
                          <CheckSquare size={20} className="text-indigo-600" />
                        ) : (
                          <Square size={20} className="text-gray-300" />
                        )
                      ) : (
                        isSelected && <Check size={18} className="text-indigo-600" />
                      )}
                    </div>
                    <span className={`flex-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>{option.label}</span>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-sm text-gray-400 text-center font-bold uppercase tracking-widest">
                No matching results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
