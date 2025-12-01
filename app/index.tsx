import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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

// Interface untuk History
interface ConversionHistory {
    id: string;
    timestamp: number;
    inputValue: string;
    inputUnit: string;
    resultValue: string;
    outputUnit: string;
    category: string;
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
            { from: 'Centimeters', to: 'Inches', factor: 0.393701 },
            { from: 'Inches', to: 'Centimeters', factor: 1 / 0.393701 },
            { from: 'Yards', to: 'Meters', factor: 0.9144 },
            { from: 'Meters', to: 'Yards', factor: 1 / 0.9144 },
        ]
    },
    // Kategori 2: Massa
    {
        id: 'mass', icon: 'weight-kilogram', label: 'Mass', conversions: [
            { from: 'Kilograms', to: 'Pounds', factor: 2.20462 },
            { from: 'Pounds', to: 'Kilograms', factor: 1 / 2.20462 },
            { from: 'Grams', to: 'Ounces', factor: 0.035274 },
            { from: 'Ounces', to: 'Grams', factor: 1 / 0.035274 },
            { from: 'Pounds', to: 'Ounces', factor: 16 },
            { from: 'Ounces', to: 'Pounds', factor: 1 / 16 },
            { from: 'Tons', to: 'Kilograms', factor: 1000 },
            { from: 'Kilograms', to: 'Tons', factor: 1 / 1000 },
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
            // Formula: C = K - 273.15
            { from: 'Kelvin', to: 'Celsius', formula: (k: number) => k - 273.15 },
            // Formula: F = (K - 273.15) * 9/5 + 32
            { from: 'Kelvin', to: 'Fahrenheit', formula: (k: number) => (k - 273.15) * 9 / 5 + 32 },
            // Formula: K = (F - 32) * 5/9 + 273.15
            { from: 'Fahrenheit', to: 'Kelvin', formula: (f: number) => (f - 32) * 5 / 9 + 273.15 },
        ]
    },
    // Kategori 4: Volume
    {
        id: 'volume', icon: 'bottle-wine', label: 'Volume', conversions: [
            { from: 'Liters', to: 'Gallons (US)', factor: 0.264172 },
            { from: 'Gallons (US)', to: 'Liters', factor: 1 / 0.264172 },
            { from: 'Milliliters', to: 'Fluid Ounces (US)', factor: 0.033814 },
            { from: 'Fluid Ounces (US)', to: 'Milliliters', factor: 1 / 0.033814 },
            { from: 'Liters', to: 'Cubic Meters', factor: 0.001 },
            { from: 'Cubic Meters', to: 'Liters', factor: 1000 },
            { from: 'Gallons (US)', to: 'Gallons (UK)', factor: 0.832674 },
            { from: 'Gallons (UK)', to: 'Gallons (US)', factor: 1 / 0.832674 },
        ]
    },
    // Kategori 5: Area
    {
        id: 'area', icon: 'square-outline', label: 'Area', conversions: [
            { from: 'Square Meters', to: 'Square Feet', factor: 10.7639 },
            { from: 'Square Feet', to: 'Square Meters', factor: 1 / 10.7639 },
            { from: 'Square Kilometers', to: 'Square Miles', factor: 0.386102 },
            { from: 'Square Miles', to: 'Square Kilometers', factor: 1 / 0.386102 },
            { from: 'Hectares', to: 'Acres', factor: 2.47105 },
            { from: 'Acres', to: 'Hectares', factor: 1 / 2.47105 },
        ]
    },
    // Kategori 6: Time
    {
        id: 'time', icon: 'clock-outline', label: 'Time', conversions: [
            { from: 'Seconds', to: 'Minutes', factor: 1 / 60 },
            { from: 'Minutes', to: 'Seconds', factor: 60 },
            { from: 'Minutes', to: 'Hours', factor: 1 / 60 },
            { from: 'Hours', to: 'Minutes', factor: 60 },
            { from: 'Hours', to: 'Days', factor: 1 / 24 },
            { from: 'Days', to: 'Hours', factor: 24 },
            { from: 'Days', to: 'Weeks', factor: 1 / 7 },
            { from: 'Weeks', to: 'Days', factor: 7 },
        ]
    },
    // Kategori Kustom BARU
    {
        id: 'custom', icon: 'form-select', label: 'Custom', conversions: [] // Kosong karena diisi oleh user
    }
];


// --- 3. Komponen Utama ---
export default function UnitConverter(): React.ReactElement {
    // State dengan tipe eksplisit
    const [inputValue, setInputValue] = useState<string>('');
    const [resultValue, setResultValue] = useState<string>('');
    const [activeCategoryId, setActiveCategoryId] = useState<string>('length');
    const [activeConversionIndex, setActiveConversionIndex] = useState<number>(0);
    const [isSwapped, setIsSwapped] = useState<boolean>(false);
    const [history, setHistory] = useState<ConversionHistory[]>([]);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [showLeftFade, setShowLeftFade] = useState<boolean>(false);
    const [showRightFade, setShowRightFade] = useState<boolean>(true);
    const [showUnitLeftFade, setShowUnitLeftFade] = useState<boolean>(false);
    const [showUnitRightFade, setShowUnitRightFade] = useState<boolean>(true);

    // --- State untuk Konversi Kustom BARU ---
    const [customFromUnit, setCustomFromUnit] = useState<string>('');
    const [customToUnit, setCustomToUnit] = useState<string>('');
    const [customFactor, setCustomFactor] = useState<string>('');

    // Refs untuk ScrollView
    const categoryScrollViewRef = useRef<ScrollView>(null);
    const unitScrollViewRef = useRef<ScrollView>(null);

    // Refs untuk scroll metrics (mempertahankan fungsi scrolling)
    const categoryScrollMetrics = useRef<{ scrollX: number; contentWidth: number; layoutWidth: number }>({ scrollX: 0, contentWidth: 0, layoutWidth: 0 });
    const unitScrollMetrics = useRef<{ scrollX: number; contentWidth: number; layoutWidth: number }>({ scrollX: 0, contentWidth: 0, layoutWidth: 0 });

    // --- Ambil Data Konversi Aktif ---
    const activeCategory: ConversionCategory | undefined = useMemo(() => {
        return COMPLEX_CONVERSION_DATA.find(d => d.id === activeCategoryId);
    }, [activeCategoryId]);

    // Dapatkan konversi aktif, atau buat "konversi kustom" fiktif
    const currentConversionSet: ConversionUnit | undefined = useMemo(() => {
        if (activeCategoryId === 'custom') {
            // Konversi Kustom: Selalu Linear (sesuai batasan)
            const factorNum = parseFloat(customFactor);
            return {
                from: customFromUnit || 'Unit A',
                to: customToUnit || 'Unit B',
                factor: isNaN(factorNum) ? 0 : factorNum,
            } as LinearConversion; // Cast untuk tipe
        }
        return activeCategory?.conversions[activeConversionIndex];
    }, [activeCategory, activeConversionIndex, activeCategoryId, customFromUnit, customToUnit, customFactor]);

    // Tentukan Unit Input/Output
    const [inputUnit, outputUnit]: [string, string] = useMemo(() => {
        if (activeCategoryId === 'custom') {
            return isSwapped
                ? [customToUnit || 'Unit B', customFromUnit || 'Unit A']
                : [customFromUnit || 'Unit A', customToUnit || 'Unit B'];
        }

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
    }, [currentConversionSet, isSwapped, activeCategoryId, customFromUnit, customToUnit]);


    // --- Fungsi Konversi Utama ---
    const convert = useCallback(() => {
        if (!currentConversionSet) return;

        const trimmedInput = inputValue.trim();
        if (trimmedInput === '' || trimmedInput === '-') {
            setResultValue('');
            return;
        }

        const num: number = parseFloat(trimmedInput);
        if (isNaN(num)) {
            setResultValue('');
            return;
        }

        // Validasi angka yang terlalu besar atau kecil
        if (!isFinite(num)) {
            setResultValue('Error');
            return;
        }

        let converted: number = 0;

        try {
            if ('formula' in currentConversionSet && currentConversionSet.formula) {
                // Konversi Non-Linear (Suhu)
                converted = currentConversionSet.formula(num);
            } else if ('factor' in currentConversionSet && currentConversionSet.factor !== undefined) {
                // Konversi Linear atau Kustom
                const factor: number = currentConversionSet.factor;

                if (activeCategoryId === 'custom' && factor === 0) {
                    setResultValue('Factor must be non-zero');
                    return;
                }

                if (isSwapped) {
                    // Konversi terbalik
                    converted = num * (1 / factor);
                } else {
                    converted = num * factor;
                }
            } else {
                setResultValue('Error: No formula/factor');
                return;
            }

            // Format hasil
            let formatted = converted.toString();
            if (converted % 1 !== 0) {
                formatted = converted.toFixed(8).replace(/\.?0+$/, '');
            }

            // Format angka besar dengan thousand separator
            if (Math.abs(converted) >= 1000) {
                try {
                    const parts = formatted.split('.');
                    // Hapus koma sebelumnya jika ada, lalu format ulang
                    parts[0] = parseFloat(parts[0].replace(/,/g, '')).toLocaleString('en-US');
                    formatted = parts.join('.');
                } catch (e) {
                    // Fallback ke format asli jika error
                }
            }

            setResultValue(formatted);

            // Simpan ke history jika ada input valid
            if (trimmedInput !== '' && !isNaN(num) && isFinite(num)) {
                const historyItem: ConversionHistory = {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    inputValue: trimmedInput,
                    inputUnit: inputUnit,
                    resultValue: formatted,
                    outputUnit: outputUnit,
                    category: activeCategoryId === 'custom' ? `Custom: ${customFromUnit || 'Unit A'} ↔ ${customToUnit || 'Unit B'}` : (activeCategory?.label || ''),
                };
                setHistory(prev => [historyItem, ...prev].slice(0, 10)); // Simpan maksimal 10 item
            }
        } catch (error) {
            setResultValue('Error');
        }
    }, [inputValue, currentConversionSet, isSwapped, inputUnit, outputUnit, activeCategory, activeCategoryId, customFactor, customFromUnit, customToUnit]);

    // Efek samping: Jalankan konversi saat input/mode berubah
    useEffect(() => {
        convert();
    }, [inputValue, currentConversionSet, isSwapped, convert]);

    // --- Fungsi Swap Cepat ---
    const swapConversion = (): void => {
        const isTemperature = activeCategoryId === 'temperature';
        const isCustom = activeCategoryId === 'custom';

        if (isTemperature) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Non-Linear Unit', 'Cannot use quick swap for temperature conversion due to complex formulas. Please select a different conversion.');
            return;
        }

        if (isCustom && parseFloat(customFactor) === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Invalid Factor', 'Cannot swap if the custom factor is 0.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSwapped(prev => !prev);
        // Nilai hasil konversi sebelumnya menjadi input baru
        const tempResult: string = resultValue;
        setResultValue('');
        setInputValue(tempResult);
        Keyboard.dismiss();
        // Konversi akan otomatis dipicu oleh useEffect
    };

    // --- Fungsi Ganti Kategori & Unit ---
    const handleCategoryChange = (categoryId: string): void => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveCategoryId(categoryId);
        setActiveConversionIndex(0);
        setIsSwapped(false);
        setInputValue('');
        setResultValue('');
        Keyboard.dismiss();

        // Reset unit selector scroll position
        setTimeout(() => {
            unitScrollViewRef.current?.scrollTo({ x: 0, animated: false });
            setShowUnitLeftFade(false);
            // Jika kategori kustom, unit selector tersembunyi, jadi tidak perlu fade kanan
            if (categoryId === 'custom') {
                setShowUnitRightFade(false);
            } else {
                // Logika ini akan diurus oleh onLayout/onContentSizeChange,
                // tapi defaultnya kita anggap bisa discroll
                setShowUnitRightFade(true);
            }
        }, 100);
    };

    const handleUnitChange = (index: number): void => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveConversionIndex(index);
        setIsSwapped(false);
        setInputValue('');
        setResultValue('');
        Keyboard.dismiss();

        // Reset unit selector scroll position
        setTimeout(() => {
            unitScrollViewRef.current?.scrollTo({ x: 0, animated: false });
            setShowUnitLeftFade(false);
        }, 100);
    };

    // Fungsi scroll untuk category selector (dipertahankan)
    const scrollCategoryLeft = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentX = categoryScrollMetrics.current.scrollX;
        const newX = Math.max(0, currentX - 150);

        if (categoryScrollViewRef.current) {
            categoryScrollViewRef.current.scrollTo({
                x: newX,
                animated: true,
            });
        }
    }, []);

    const scrollCategoryRight = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentX = categoryScrollMetrics.current.scrollX;
        const maxX = Math.max(0, categoryScrollMetrics.current.contentWidth - categoryScrollMetrics.current.layoutWidth);
        const newX = Math.min(maxX, currentX + 150);

        if (categoryScrollViewRef.current) {
            categoryScrollViewRef.current.scrollTo({
                x: newX,
                animated: true,
            });
        }
    }, []);

    // Fungsi scroll untuk unit selector (dipertahankan)
    const scrollUnitLeft = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentX = unitScrollMetrics.current.scrollX;
        const newX = Math.max(0, currentX - 150);

        if (unitScrollViewRef.current) {
            unitScrollViewRef.current.scrollTo({
                x: newX,
                animated: true,
            });
        }
    }, []);

    const scrollUnitRight = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const currentX = unitScrollMetrics.current.scrollX;
        const maxX = Math.max(0, unitScrollMetrics.current.contentWidth - unitScrollMetrics.current.layoutWidth);
        const newX = Math.min(maxX, currentX + 150);

        if (unitScrollViewRef.current) {
            unitScrollViewRef.current.scrollTo({
                x: newX,
                animated: true,
            });
        }
    }, []);


    // --- 4. Render UI (TSX) ---

    // Render selector unit spesifik (dipertahankan & disembunyikan untuk kustom)
    const renderUnitSelector = (): React.ReactElement | null => {
        if (!activeCategory || activeCategoryId === 'custom') return null;

        return (
            <View style={styles.unitSelectorWrapper}>
                {/* Left Fade Indicator for Unit Selector */}
                {showUnitLeftFade && (
                    <View style={[styles.fadeIndicator, styles.fadeLeft]}>
                        <View style={styles.fadeGradientLeft}>
                            <Pressable
                                onPress={scrollUnitLeft}
                                style={styles.fadeArrowButton}
                                accessibilityRole="button"
                                accessibilityLabel="Scroll units left"
                            >
                                <MaterialCommunityIcons name="chevron-left" size={18} color="#7FE797" style={styles.fadeArrow} />
                            </Pressable>
                        </View>
                    </View>
                )}

                <ScrollView
                    ref={unitScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.unitSelectorContainer}
                    contentContainerStyle={styles.unitSelectorContent}
                    onScroll={(event) => {
                        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                        const scrollX = contentOffset.x;
                        const maxScrollX = contentSize.width - layoutMeasurement.width;

                        // Update scroll metrics
                        unitScrollMetrics.current.scrollX = scrollX;
                        unitScrollMetrics.current.contentWidth = contentSize.width;
                        unitScrollMetrics.current.layoutWidth = layoutMeasurement.width;

                        // Show left fade if scrolled right
                        setShowUnitLeftFade(scrollX > 5);

                        // Show right fade if not at the end
                        const contentWidth = contentSize.width;
                        const layoutWidth = layoutMeasurement.width;
                        setShowUnitRightFade(contentWidth > layoutWidth && scrollX < maxScrollX - 5);
                    }}
                    onContentSizeChange={(contentWidth) => {
                        // Update content width
                        unitScrollMetrics.current.contentWidth = contentWidth;

                        // Check if content is scrollable
                        const layoutWidth = unitScrollMetrics.current.layoutWidth;
                        if (layoutWidth > 0) {
                            const isScrollable = contentWidth > layoutWidth;
                            setShowUnitRightFade(isScrollable);
                        } else {
                            // If layout width not yet known, check later
                            setTimeout(() => {
                                const currentLayoutWidth = unitScrollMetrics.current.layoutWidth;
                                if (currentLayoutWidth > 0) {
                                    setShowUnitRightFade(contentWidth > currentLayoutWidth);
                                }
                            }, 100);
                        }
                    }}
                    onLayout={(event) => {
                        // Update layout measurement
                        const { width: layoutWidth } = event.nativeEvent.layout;
                        unitScrollMetrics.current.layoutWidth = layoutWidth;

                        // Check if scrollable with current content width
                        const contentWidth = unitScrollMetrics.current.contentWidth;
                        if (contentWidth > 0) {
                            setShowUnitRightFade(contentWidth > layoutWidth);
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    {activeCategory.conversions.map((conversion: ConversionUnit, index: number) => (
                        <Pressable
                            key={index}
                            style={[
                                styles.unitButton,
                                activeConversionIndex === index && styles.activeUnitButton,
                            ]}
                            onPress={() => handleUnitChange(index)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: activeConversionIndex === index }}
                            accessibilityLabel={`Convert from ${conversion.from} to ${conversion.to}`}
                        >
                            <Text style={[styles.unitButtonText, activeConversionIndex === index && styles.activeUnitButtonText]}>
                                {conversion.from} → {conversion.to}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Right Fade Indicator for Unit Selector */}
                {showUnitRightFade && (
                    <View style={[styles.fadeIndicator, styles.fadeRight]} pointerEvents="box-none">
                        <View style={styles.fadeGradientRight} pointerEvents="box-none">
                            <Pressable
                                onPress={scrollUnitRight}
                                style={styles.fadeArrowButton}
                                accessibilityRole="button"
                                accessibilityLabel="Scroll units right"
                            >
                                <MaterialCommunityIcons name="chevron-right" size={18} color="#7FE797" style={styles.fadeArrow} />
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // Render Kategori Selector (dipertahankan)
    const renderCategorySelector = (data: ConversionCategory): React.ReactElement => (
        <Pressable
            key={data.id}
            style={[
                styles.categoryButton,
                activeCategoryId === data.id && styles.activeCategoryButton,
            ]}
            onPress={() => handleCategoryChange(data.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeCategoryId === data.id }}
            accessibilityLabel={`${data.label} category`}
            accessibilityHint={`Select ${data.label} conversion category`}
        >
            <MaterialCommunityIcons
                name={data.icon}
                size={28}
                color={activeCategoryId === data.id ? '#0A0A0A' : '#7FE797'}
            />
            <Text style={[styles.categoryButtonText, activeCategoryId === data.id && styles.activeCategoryButtonText]}>
                {data.label}
            </Text>
        </Pressable>
    );

    // --- Component Kustom Input BARU ---
    const renderCustomConversionInputs = (): React.ReactElement => (
        <Animated.View entering={FadeIn.duration(300)} style={styles.customInputContainer}>
            <Text style={styles.customTitle}>Define Your Custom Conversion (Linear)</Text>

            {/* Unit 'From' & 'To' */}
            <View style={styles.customUnitRow}>
                <TextInput
                    style={styles.customUnitInput}
                    placeholder="Unit A Name (e.g., USD)"
                    placeholderTextColor="#666666"
                    value={customFromUnit}
                    onChangeText={setCustomFromUnit}
                    autoCapitalize="words"
                    accessibilityLabel="Custom 'From' Unit Name"
                />
                <MaterialCommunityIcons name="arrow-right-bold" size={20} color="#7FE797" style={{ marginHorizontal: 10 }} />
                <TextInput
                    style={styles.customUnitInput}
                    placeholder="Unit B Name (e.g., EUR)"
                    placeholderTextColor="#666666"
                    value={customToUnit}
                    onChangeText={setCustomToUnit}
                    autoCapitalize="words"
                    accessibilityLabel="Custom 'To' Unit Name"
                />
            </View>

            {/* Factor Input */}
            <View style={styles.customFactorRow}>
                <Text style={styles.customFactorText}>
                    1 {customFromUnit || 'Unit A'} =
                </Text>
                <TextInput
                    style={styles.customFactorInput}
                    placeholder="Factor (e.g., 0.85)"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                    value={customFactor}
                    onChangeText={setCustomFactor}
                    accessibilityLabel="Custom Conversion Factor"
                />
                <Text style={styles.customFactorText}>
                    {customToUnit || 'Unit B'}
                </Text>
            </View>
            <Text style={styles.customHint}>
                *Conversion will be $Input \times Factor$. Leave factor at 1 if 1:1.
            </Text>
        </Animated.View>
    );
    // --- End Component Kustom Input BARU ---

    const isTemperature: boolean = activeCategoryId === 'temperature';
    const isCustom: boolean = activeCategoryId === 'custom';
    const isSwapDisabled: boolean = isTemperature || (isCustom && parseFloat(customFactor) === 0);

    // Animasi untuk swap button
    const swapScale = useSharedValue(1);
    const swapAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: swapScale.value }],
    }));

    const handleSwapPress = () => {
        swapScale.value = withSpring(0.9, { damping: 15 }, () => {
            swapScale.value = withSpring(1);
        });
        swapConversion();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Animated.View entering={FadeIn.duration(300)}>
                <Text style={styles.title}>Calversion</Text>
            </Animated.View>

            {/* Category Selector */}
            <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.categorySelectorWrapper}>
                {/* Left Fade Indicator with Arrow */}
                {showLeftFade && (
                    <View style={[styles.fadeIndicator, styles.fadeLeft]} pointerEvents="box-none">
                        <View style={styles.fadeGradientLeft} pointerEvents="box-none">
                            <Pressable
                                onPress={scrollCategoryLeft}
                                style={styles.fadeArrowButton}
                                accessibilityRole="button"
                                accessibilityLabel="Scroll categories left"
                            >
                                <MaterialCommunityIcons name="chevron-left" size={20} color="#7FE797" style={styles.fadeArrow} />
                            </Pressable>
                        </View>
                    </View>
                )}

                <ScrollView
                    ref={categoryScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categorySelectorContainer}
                    contentContainerStyle={styles.categorySelectorContent}
                    onScroll={(event) => {
                        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                        const scrollX = contentOffset.x;
                        const contentWidth = contentSize.width;
                        const layoutWidth = layoutMeasurement.width;
                        const maxScrollX = Math.max(0, contentWidth - layoutWidth);

                        // Update scroll metrics
                        categoryScrollMetrics.current.scrollX = scrollX;
                        categoryScrollMetrics.current.contentWidth = contentWidth;
                        categoryScrollMetrics.current.layoutWidth = layoutWidth;

                        // Show left fade if scrolled right
                        setShowLeftFade(scrollX > 5);

                        // Show right fade if not at the end
                        setShowRightFade(contentWidth > layoutWidth && scrollX < maxScrollX - 5);
                    }}
                    onContentSizeChange={(contentWidth, contentHeight) => {
                        // Update content width
                        categoryScrollMetrics.current.contentWidth = contentWidth;

                        // Check if content is scrollable
                        const layoutWidth = categoryScrollMetrics.current.layoutWidth;
                        if (layoutWidth > 0) {
                            const isScrollable = contentWidth > layoutWidth;
                            setShowRightFade(isScrollable);
                        } else {
                            // If layout width not yet known, check later
                            setTimeout(() => {
                                const currentLayoutWidth = categoryScrollMetrics.current.layoutWidth;
                                if (currentLayoutWidth > 0) {
                                    setShowRightFade(contentWidth > currentLayoutWidth);
                                }
                            }, 100);
                        }
                    }}
                    onLayout={(event) => {
                        // Update layout measurement
                        const { width: layoutWidth } = event.nativeEvent.layout;
                        categoryScrollMetrics.current.layoutWidth = layoutWidth;

                        // Check if scrollable with current content width
                        const contentWidth = categoryScrollMetrics.current.contentWidth;
                        if (contentWidth > 0) {
                            setShowRightFade(contentWidth > layoutWidth);
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    {COMPLEX_CONVERSION_DATA.map(renderCategorySelector)}
                </ScrollView>

                {/* Right Fade Indicator with Arrow */}
                {showRightFade && (
                    <View style={[styles.fadeIndicator, styles.fadeRight]} pointerEvents="box-none">
                        <View style={styles.fadeGradientRight} pointerEvents="box-none">
                            <Pressable
                                onPress={scrollCategoryRight}
                                style={styles.fadeArrowButton}
                                accessibilityRole="button"
                                accessibilityLabel="Scroll categories right"
                            >
                                <MaterialCommunityIcons name="chevron-right" size={20} color="#7FE797" style={styles.fadeArrow} />
                            </Pressable>
                        </View>
                    </View>
                )}
            </Animated.View>

            {/* Unit Selector (Dynamic) - Tersembunyi di mode Kustom */}
            <Animated.View entering={FadeIn.delay(200).duration(300)}>
                {renderUnitSelector()}
            </Animated.View>

            {/* Input Kustom - Tampilkan hanya di mode Kustom */}
            {isCustom && (
                <Animated.View entering={FadeIn.delay(200).duration(300)}>
                    {renderCustomConversionInputs()}
                </Animated.View>
            )}

            {/* Main Conversion Card */}
            <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.mainCard}>

                {/* Header dengan History Toggle */}
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Conversion</Text>
                    {history.length > 0 && (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowHistory(!showHistory);
                            }}
                            style={styles.historyButton}
                            accessibilityRole="button"
                            accessibilityLabel={showHistory ? "Hide conversion history" : "Show conversion history"}
                        >
                            <MaterialCommunityIcons
                                name={showHistory ? "history" : "history"}
                                size={20}
                                color={showHistory ? "#7FE797" : "#999999"}
                            />
                            <Text style={[styles.historyButtonText, showHistory && styles.historyButtonTextActive]}>
                                History ({history.length})
                            </Text>
                        </Pressable>
                    )}
                </View>

                {/* History Panel */}
                {showHistory && history.length > 0 && (
                    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.historyPanel}>
                        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                            {history.map((item) => (
                                <Pressable
                                    key={item.id}
                                    style={styles.historyItem}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setInputValue(item.inputValue);
                                        setShowHistory(false);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Use previous conversion: ${item.inputValue} ${item.inputUnit} = ${item.resultValue} ${item.outputUnit}`}
                                >
                                    <View style={styles.historyContent}>
                                        <Text style={styles.historyValue}>
                                            {item.inputValue} {item.inputUnit} = {item.resultValue} {item.outputUnit}
                                        </Text>
                                        <Text style={styles.historyCategory}>{item.category}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color="#666666" />
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setHistory([]);
                                setShowHistory(false);
                            }}
                            style={styles.clearHistoryButton}
                            accessibilityRole="button"
                            accessibilityLabel="Clear conversion history"
                        >
                            <Text style={styles.clearHistoryText}>Clear History</Text>
                        </Pressable>
                    </Animated.View>
                )}

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
                        accessibilityLabel={`Input value in ${inputUnit}`}
                        accessibilityHint="Enter a number to convert"
                        clearButtonMode="while-editing"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                    />
                </View>

                {/* Swap Button & Separator */}
                <View style={styles.separatorContainer}>
                    <View style={styles.lineSeparator} />
                    <Animated.View style={swapAnimatedStyle}>
                        <Pressable
                            style={[styles.swapButton, isSwapDisabled && styles.disabledSwapButton]}
                            onPress={handleSwapPress}
                            disabled={isSwapDisabled}
                            accessibilityRole="button"
                            accessibilityLabel="Swap conversion units"
                            accessibilityHint="Swaps the input and output units for linear conversions"
                        >
                            <MaterialCommunityIcons name="swap-vertical" size={24} color={isSwapDisabled ? '#666666' : '#7FE797'} />
                        </Pressable>
                    </Animated.View>
                    <View style={styles.lineSeparator} />
                </View>

                {/* Output Row */}
                <View style={styles.outputRow}>
                    <Text style={styles.unitLabel}>{outputUnit}</Text>
                    <Text
                        style={styles.resultText}
                        accessibilityLabel={`Result: ${resultValue || '0'} ${outputUnit}`}
                        accessibilityRole="text"
                    >
                        {resultValue || '0.0000'}
                    </Text>
                </View>
            </Animated.View>

        </SafeAreaView>
    );
}

// --- 5. Stylesheet (Lengkap dengan Styles Kustom) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
        padding: 24,
        paddingTop: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        marginBottom: 30,
        color: '#E0E0E0',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    categorySelectorWrapper: {
        position: 'relative',
        marginBottom: 20,
        width: '100%',
        minHeight: 90,
    },
    categorySelectorContainer: {
        width: '100%',
        minHeight: 90,
    },
    categorySelectorContent: {
        paddingHorizontal: 4,
        gap: 12,
        alignItems: 'center',
        paddingVertical: 5,
    },
    categoryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        backgroundColor: '#1A1A1A',
        borderWidth: 1.5,
        borderColor: '#333333',
        minWidth: 100,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    activeCategoryButton: {
        backgroundColor: '#7FE797',
        borderColor: '#7FE797',
        shadowColor: '#7FE797',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
        transform: [{ scale: 1.05 }],
    },
    categoryButtonText: {
        fontSize: 12,
        color: '#999999',
        fontWeight: '600',
        marginTop: 6,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    activeCategoryButtonText: {
        color: '#0A0A0A',
        fontWeight: '700',
    },

    unitSelectorWrapper: {
        position: 'relative',
        marginBottom: 25,
    },
    unitSelectorContainer: {
        maxHeight: 50,
    },
    unitSelectorContent: {
        paddingRight: 10,
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
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#E0E0E0',
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333333',
        gap: 6,
    },
    historyButtonText: {
        fontSize: 12,
        color: '#999999',
        fontWeight: '600',
    },
    historyButtonTextActive: {
        color: '#7FE797',
    },
    historyPanel: {
        marginBottom: 20,
        maxHeight: 200,
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#333333',
    },
    historyList: {
        maxHeight: 150,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 4,
        backgroundColor: '#151515',
    },
    historyContent: {
        flex: 1,
    },
    historyValue: {
        fontSize: 14,
        color: '#E0E0E0',
        fontWeight: '500',
        marginBottom: 4,
    },
    historyCategory: {
        fontSize: 11,
        color: '#7FE797',
        fontWeight: '500',
    },
    clearHistoryButton: {
        marginTop: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#2A2A2A',
        alignItems: 'center',
    },
    clearHistoryText: {
        fontSize: 12,
        color: '#FF6B6B',
        fontWeight: '600',
    },
    fadeIndicator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 50,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fadeLeft: {
        left: 0,
    },
    fadeRight: {
        right: 0,
    },
    fadeGradientLeft: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 50,
        backgroundColor: '#0D0D0D',
        opacity: 0.9,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: 8,
        pointerEvents: 'box-none',
    },
    fadeGradientRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 50,
        backgroundColor: '#0D0D0D',
        opacity: 0.9,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 8,
        pointerEvents: 'box-none',
    },
    fadeArrow: {
        opacity: 0.8,
    },
    fadeArrowButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        minWidth: 36,
        minHeight: 36,
    },
    // --- Styles Kustom BARU ---
    customInputContainer: {
        padding: 20,
        backgroundColor: '#1C1C1C',
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333333',
    },
    customTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#7FE797',
        marginBottom: 15,
        textAlign: 'center',
    },
    customUnitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        justifyContent: 'space-between',
    },
    customUnitInput: {
        flex: 1,
        padding: 10,
        backgroundColor: '#2A2A2A',
        borderRadius: 8,
        color: '#E0E0E0',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        minWidth: 100,
    },
    customFactorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'space-between',
        backgroundColor: '#2A2A2A',
        borderRadius: 8,
        padding: 10,
    },
    customFactorText: {
        fontSize: 14,
        color: '#CCCCCC',
        fontWeight: '500',
        minWidth: 50,
        textAlign: 'center',
    },
    customFactorInput: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#333333',
        borderRadius: 6,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginHorizontal: 10,
        minWidth: 80,
    },
    customHint: {
        fontSize: 11,
        color: '#999999',
        marginTop: 5,
        textAlign: 'left',
        paddingHorizontal: 10,
    }
});