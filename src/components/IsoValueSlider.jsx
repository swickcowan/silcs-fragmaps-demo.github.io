import React, { memo } from 'react';

const IsoValueSlider = memo(({ 
  label, 
  value, 
  onChange, 
  min = -2.0,  // Updated range for SILCS GFE data
  max = 0.5,   // Updated range for SILCS GFE data
  step = 0.1,
  color = '#ffffff',
  presetValues = [-1.5, -1.0, -0.5, 0.0] // Scientific presets from stringent to permissive
}) => {
  const handleSliderChange = (e) => {
    onChange(parseFloat(e.target.value));
  };

  const handlePresetClick = (presetValue) => {
    onChange(presetValue);
  };

  const getBackgroundStyle = () => {
    const percentage = ((value - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`
    };
  };

  // Color-code slider based on stringency level
  const getStringencyColor = (value) => {
    const normalized = (value - min) / (max - min);
    if (normalized < 0.3) return '#ef4444'; // Stringent - red
    if (normalized < 0.7) return '#eab308'; // Moderate - yellow  
    return '#22c55e'; // Permissive - green
  };

  const getStringencyLabel = (value) => {
    if (value <= -1.5) return 'Stringent';
    if (value <= -0.5) return 'Moderate';
    return 'Permissive';
  };

  const sliderColor = getStringencyColor(value);
  const stringencyLabel = getStringencyLabel(value);

  return (
    <div className="space-y-2">
      {/* Label and Value */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded" style={{ color }}>
            {value.toFixed(1)}
          </span>
          <span className="text-xs px-2 py-1 rounded" style={{ 
            backgroundColor: `${sliderColor}20`, 
            color: sliderColor,
            border: `1px solid ${sliderColor}40`
          }}>
            {stringencyLabel}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={getBackgroundStyle()}
        />
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Stringency:</span>
        <div className="flex gap-1">
          {presetValues.map((preset, index) => {
            const presetLabel = index === 0 ? 'High' : index === presetValues.length - 1 ? 'Low' : 'Med';
            const isActive = Math.abs(value - preset) < 0.05;
            
            return (
              <button
                key={preset}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetClick(preset);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
                style={{
                  borderColor: isActive ? color : undefined
                }}
                title={`${presetLabel} stringency (${preset.toFixed(1)})`}
              >
                {presetLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min/Max Labels with scientific meaning */}
      <div className="flex justify-between text-xs text-gray-500">
        <span className="flex flex-col">
          <span>{min.toFixed(1)}</span>
          <span className="text-xs text-gray-600">Stringent</span>
        </span>
        <span className="flex flex-col text-right">
          <span>{max.toFixed(1)}</span>
          <span className="text-xs text-gray-600">Permissive</span>
        </span>
      </div>
    </div>
  );
});

export default IsoValueSlider;
