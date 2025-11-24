import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// --- 1. Definisi Tipe Data (Interfaces dan Types) ---

// Tipe untuk konversi linear (menggunakan faktor)
interface LinearConversion {
  from: string;
  to: string;
  factor: number;
  formula?: undefined; // Pastikan formula tidak ada
}

// Tipe untuk konversi non-linear (menggunakan fungsi formula)
interface NonLinearConversion {
  from: string;
  to: string;
  factor?: undefined; // Pastikan factor tidak ada
  formula: (value: number) => number;
}

type ConversionUnit = LinearConversion | NonLinearConversion;

interface ConversionCategory {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap; // Tipe untuk nama ikon
  label: string;
  conversions: ConversionUnit[];
}

// --- 2. Data Konversi Kompleks (Typed) ---

const COMPLEX_CONVERSION_DATA: ConversionCategory[] = [
  // Kategori 1: Panjang
  {
    id: 'length', icon: 'tape-measure', label: 'Length', conversions: [
      { from: 'Meters', to: 'Feet', factor: 3.28084 },
      { from: 'Feet', to: 'Meters', factor: 1 / 3.28084 },
      { from: 'Kilometers', to: 'Miles', factor: 0.621371 },
      { from: 'Miles', to: 'Kilometers', factor: 1 / 0.621371 },
    ]
  },
  // Kategori 2: Massa
  {
    id: 'mass', icon: 'weight-kilogram', label: 'Mass', conversions: [
      { from: 'Kilograms', to: 'Pounds', factor: 2.20462 },
      { from: 'Pounds', to: 'Kilograms', factor: 1 / 2.20462 },
      { from: 'Grams', to: 'Ounces', factor: 0.035274 },
      { from: 'Ounces', to: 'Grams', factor: 1 / 0.035274 },
    ]
  },
  // Kategori 3: Suhu (Konversi Non-linear)
  {
    id: 'temperature', icon: 'thermometer', label: 'Temperature', conversions: [
      // Formula: (C * 9/5) + 32 = F
      { from: 'Celsius', to: 'Fahrenheit', formula: (c: number) => (c * 9 / 5) + 32 },
      // Formula: (F - 32) * 5/9 = C
      { from: 'Fahrenheit', to: 'Celsius', formula: (f: number) => (f - 32) * 5 / 9 },
      // Formula: K = C + 273.15
      { from: 'Celsius', to: 'Kelvin', formula: (c: number) => c + 273.15 },
    ]
  },
  // Kategori 4: Volume
  {
    id: 'volume', icon: 'bottle-wine', label: 'Volume', conversions: [
      { from: 'Liters', to: 'Gallons (US)', factor: 0.264172 },
      { from: 'Gallons (US)', to: 'Liters', factor: 1 / 0.264172 },
      { from: 'Milliliters', to: 'Fluid Ounces (US)', factor: 0.033814 },
      { from: 'Fluid Ounces (US)', to: 'Milliliters', factor: 1 / 0.033814 },
    ]
  },
];

// --- 3. Komponen Utama ---
export default function UnitConverter(): React.ReactElement {
  // State dengan tipe eksplisit
  const [inputValue, setInputValue] = useState<string>('');
  const [resultValue, setResultValue] = useState<string>('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('length');
  const [activeConversionIndex, setActiveConversionIndex] = useState<number>(0);
  const [isSwapped, setIsSwapped] = useState<boolean>(false);

  // --- Ambil Data Konversi Aktif ---
  const activeCategory: ConversionCategory | undefined = useMemo(() => {
    return COMPLEX_CONVERSION_DATA.find(d => d.id === activeCategoryId);
  }, [activeCategoryId]);

  const currentConversionSet: ConversionUnit | undefined = useMemo(() => {
    return activeCategory?.conversions[activeConversionIndex];
  }, [activeCategory, activeConversionIndex]);

  // Tentukan Unit Input/Output
  const [inputUnit, outputUnit]: [string, string] = useMemo(() => {
    if (currentConversionSet) {
      // Jika Non-Linear (Suhu), tidak bisa di-swap
      if ('formula' in currentConversionSet) {
        return [currentConversionSet.from, currentConversionSet.to];
      }
      // Konversi Linear
      return isSwapped
        ? [currentConversionSet.to, currentConversionSet.from]
        : [currentConversionSet.from, currentConversionSet.to];
    }
    return ['', ''];
  }, [currentConversionSet, isSwapped]);


  // --- Fungsi Konversi Utama ---
  const convert = useCallback(() => {
    if (!currentConversionSet) return;

    const num: number = parseFloat(inputValue);
    if (isNaN(num) || inputValue.trim() === '') {
      setResultValue('');
      return;
    }

    let converted: number = 0;

    if ('formula' in currentConversionSet && currentConversionSet.formula) {
      // Konversi Non-Linear (Suhu)
      converted = currentConversionSet.formula(num);
    } else if ('factor' in currentConversionSet && currentConversionSet.factor !== undefined) {
      // Konversi Linear
      const factor: number = currentConversionSet.factor;
      if (isSwapped) {
        converted = num * (1 / factor); // Konversi terbalik
      } else {
        converted = num * factor;
      }
    }

    setResultValue(converted.toFixed(4));
  }, [inputValue, currentConversionSet, isSwapped]);

  // Efek samping: Jalankan konversi saat input/mode berubah
  useEffect(() => {
    convert();
  }, [inputValue, currentConversionSet, isSwapped, convert]);

  // --- Fungsi Swap Cepat ---
  const swapConversion = (): void => {
    if ('formula' in (currentConversionSet || {})) {
      Alert.alert('Non-Linear Unit', 'Cannot use quick swap for temperature conversion due to complex formulas. Please select a different conversion.');
      return;
    }

    setIsSwapped(prev => !prev);
    // Nilai hasil konversi sebelumnya menjadi input baru
    const tempResult: string = resultValue;
    setResultValue('');
    setInputValue(tempResult);
    // Konversi akan otomatis dipicu oleh useEffect
  };

  // --- Fungsi Ganti Kategori & Unit ---
  const handleCategoryChange = (categoryId: string): void => {
    setActiveCategoryId(categoryId);
    setActiveConversionIndex(0);
    setIsSwapped(false);
    setInputValue('');
    setResultValue('');
  };

  const handleUnitChange = (index: number): void => {
    setActiveConversionIndex(index);
    setIsSwapped(false);
    setInputValue('');
    setResultValue('');
  };

  // --- 4. Render UI (TSX) ---

  // Render selector unit spesifik
  const renderUnitSelector = (): React.ReactElement | null => {
    if (!activeCategory) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitSelectorContainer}>
        {activeCategory.conversions.map((conversion: ConversionUnit, index: number) => (
          <Pressable
            key={index}
            style={[
              styles.unitButton,
              activeConversionIndex === index && styles.activeUnitButton,
            ]}
            onPress={() => handleUnitChange(index)}
          >
            <Text style={[styles.unitButtonText, activeConversionIndex === index && styles.activeUnitButtonText]}>
              {conversion.from} → {conversion.to}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  };

  // Render Kategori Selector
  const renderCategorySelector = (data: ConversionCategory): React.ReactElement => (
    <Pressable
      key={data.id}
      style={[
        styles.categoryButton,
        activeCategoryId === data.id && styles.activeCategoryButton,
      ]}
      onPress={() => handleCategoryChange(data.id)}
    >
      <MaterialCommunityIcons
        name={data.icon}
        size={24}
        color={activeCategoryId === data.id ? '#0A0A0A' : '#7FE797'}
      />
      <Text style={[styles.categoryButtonText, activeCategoryId === data.id && styles.activeCategoryButtonText]}>
        {data.label}
      </Text>
    </Pressable>
  );

  const isTemperature: boolean = activeCategoryId === 'temperature';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calversion</Text>

      {/* Category Selector */}
      <View style={styles.categorySelectorContainer}>
        {COMPLEX_CONVERSION_DATA.map(renderCategorySelector)}
      </View>

      {/* Unit Selector (Dynamic) */}
      {renderUnitSelector()}

      {/* Main Conversion Card */}
      <View style={styles.mainCard}>

        {/* Input Row */}
        <View style={styles.inputRow}>
          <Text style={styles.unitLabel}>{inputUnit}</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#999999"
            keyboardType="numeric"
            value={inputValue}
            onChangeText={setInputValue}
          />
        </View>

        {/* Swap Button & Separator */}
        <View style={styles.separatorContainer}>
          <View style={styles.lineSeparator} />
          <Pressable
            style={[styles.swapButton, isTemperature && styles.disabledSwapButton]}
            onPress={swapConversion}
            disabled={isTemperature} // Menonaktifkan tombol secara fisik
          >
            <MaterialCommunityIcons name="swap-vertical" size={24} color={isTemperature ? '#666666' : '#7FE797'} />
          </Pressable>
          <View style={styles.lineSeparator} />
        </View>

        {/* Output Row */}
        <View style={styles.outputRow}>
          <Text style={styles.unitLabel}>{outputUnit}</Text>
          <Text style={styles.resultText}>{resultValue || '0.0000'}</Text>
        </View>
      </View>

    </View>
  );
}

// --- 5. Stylesheet (Tidak Berubah dari versi sebelumnya yang bagus) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 30,
    color: '#E0E0E0',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  categorySelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeCategoryButton: {
    backgroundColor: '#7FE797',
    shadowColor: '#7FE797',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  categoryButtonText: {
    fontSize: 10,
    color: '#999999',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  activeCategoryButtonText: {
    color: '#0A0A0A',
    fontWeight: '700',
  },

  unitSelectorContainer: {
    maxHeight: 50,
    marginBottom: 25,
  },
  unitButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  activeUnitButton: {
    backgroundColor: '#1C1C1C',
    borderColor: '#7FE797',
  },
  unitButtonText: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  activeUnitButtonText: {
    color: '#7FE797',
    fontWeight: '600',
  },

  mainCard: {
    width: '100%',
    backgroundColor: '#1C1C1C',
    borderRadius: 25,
    padding: 30,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7FE797',
    minWidth: 100,
  },
  input: {
    flex: 1,
    padding: 15,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    marginLeft: 20,
  },
  resultText: {
    flex: 1,
    padding: 15,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    marginLeft: 20,
  },

  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  lineSeparator: {
    flex: 1,
    height: 1,
    backgroundColor: '#333333',
  },
  swapButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 50,
    padding: 8,
    marginHorizontal: 15,
    borderWidth: 2,
    borderColor: '#7FE797',
  },
  disabledSwapButton: {
    borderColor: '#333333',
  }
});