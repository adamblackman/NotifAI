import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

// Only import the slider on non-web platforms
let Slider: any = null;
if (Platform.OS !== 'web') {
  Slider = require('@react-native-community/slider').default;
}

interface PlatformSliderProps {
  style?: any;
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
}

export function PlatformSlider({
  style,
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor = Colors.primary,
  maximumTrackTintColor = Colors.gray200,
}: PlatformSliderProps) {
  if (Platform.OS === 'web') {
    const sliderId = `slider-${React.useMemo(() => Math.random().toString(36).substr(2, 9), [])}`;
    
    React.useEffect(() => {
      const styleId = `slider-styles-${sliderId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .${sliderId}::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${minimumTrackTintColor};
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 3;
          }
          
          .${sliderId}::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: ${minimumTrackTintColor};
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            -moz-appearance: none;
          }
          
          .${sliderId}::-webkit-slider-track {
            background: transparent;
            height: 4px;
          }
          
          .${sliderId}::-moz-range-track {
            background: transparent;
            height: 4px;
            border: none;
          }
        `;
        document.head.appendChild(style);
      }
      
      return () => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }, [sliderId, minimumTrackTintColor, maximumTrackTintColor]);

    // Use HTML5 range input for web with a visible track background
    return (
      <View style={[styles.webSliderContainer, style]}>
        {/* Background track */}
        <View style={[styles.sliderTrack, { backgroundColor: maximumTrackTintColor }]} />
        
        {/* Progress track */}
        <View 
          style={[
            styles.sliderProgress, 
            { 
              backgroundColor: minimumTrackTintColor,
              width: `${((value - minimumValue) / (maximumValue - minimumValue)) * 100}%`
            }
          ]} 
        />
        
        {/* Actual input */}
        <input
          type="range"
          min={minimumValue}
          max={maximumValue}
          step={step}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className={sliderId}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '40px',
            WebkitAppearance: 'none',
            appearance: 'none',
            background: 'transparent',
            cursor: 'pointer',
            zIndex: 2,
          }}
        />
      </View>
    );
  }

  // Use react-native-community/slider for mobile platforms
  if (!Slider) {
    console.warn('Slider component not available');
    return null;
  }

  return (
    <Slider
      style={style}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      value={value}
      onValueChange={onValueChange}
      minimumTrackTintColor={minimumTrackTintColor}
      maximumTrackTintColor={maximumTrackTintColor}
    />
  );
}

const styles = StyleSheet.create({
  webSliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    transform: [{ translateY: -2 }],
    zIndex: 1,
  },
  sliderProgress: {
    position: 'absolute',
    top: '50%',
    left: 0,
    height: 4,
    borderRadius: 2,
    transform: [{ translateY: -2 }],
    zIndex: 1,
  },
}); 