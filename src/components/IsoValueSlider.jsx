import React, { memo } from 'react';

const IsoValueSlider = memo(({ 
  label, 
  value, 
  onChange, 
  min = 0.1, 
  max = 3.0, 
  step = 0.1,
  color = '#ffffff',
  presetValues = [0.5, 1.0, 1.5, 2.0]
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

  return (
    <div className="space-y-2">
      {/* Label and Value */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300">{label}</label>
        <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded" style={{ color }}>
          {value.toFixed(1)}
        </span>
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
        <span className="text-xs text-gray-400">Presets:</span>
        <div className="flex gap-1">
          {presetValues.map((preset) => (
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
                Math.abs(value - preset) < 0.05
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
              style={{
                borderColor: Math.abs(value - preset) < 0.05 ? color : undefined
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Min/Max Labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
});

export default IsoValueSlider;
