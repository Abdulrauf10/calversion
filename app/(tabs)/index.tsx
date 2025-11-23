import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function UnitConverter() {
  const [value, setValue] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState<'mToFt' | 'ftToM' | 'kgToLb' | 'lbToKg'>('mToFt');

  const convert = () => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      setResult('Please enter a valid number');
      return;
    }

    let converted = 0;
    switch (mode) {
      case 'mToFt':
        converted = num * 3.28084;
        setResult(`${num} meters = ${converted.toFixed(2)} feet`);
        break;
      case 'ftToM':
        converted = num / 3.28084;
        setResult(`${num} feet = ${converted.toFixed(2)} meters`);
        break;
      case 'kgToLb':
        converted = num * 2.20462;
        setResult(`${num} kg = ${converted.toFixed(2)} lbs`);
        break;
      case 'lbToKg':
        converted = num / 2.20462;
        setResult(`${num} lbs = ${converted.toFixed(2)} kg`);
        break;
    }
  };

  const modes = [
    { id: 'mToFt', label: 'Meters → Feet' },
    { id: 'ftToM', label: 'Feet → Meters' },
    { id: 'kgToLb', label: 'Kg → Lbs' },
    { id: 'lbToKg', label: 'Lbs → Kg' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unit Converter</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter a number"
        keyboardType="numeric"
        value={value}
        onChangeText={setValue}
      />

      <View style={styles.buttonGroup}>
        {modes.map((m) => (
          <Pressable
            key={m.id}
            style={[
              styles.modeButton,
              mode === m.id && styles.activeButton, // highlight active button
            ]}
            onPress={() => setMode(m.id as any)}
          >
            <Text
              style={[
                styles.buttonText,
                mode === m.id && styles.activeButtonText,
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.convertButton} onPress={convert}>
        <Text style={styles.convertButtonText}>Convert</Text>
      </Pressable>

      {result ? <Text style={styles.result}>{result}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 24,
    color: '#FFFFFF',
  },
  input: {
    width: '85%',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  buttonGroup: {
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  modeButton: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#1A1A1A',
    borderColor: '#333',
    alignItems: 'center',
    marginVertical: 4,
  },
  activeButton: {
    backgroundColor: '#3A7BFF',
    borderColor: '#3A7BFF',
  },
  buttonText: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  activeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  convertButton: {
    backgroundColor: '#28A745',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 10,
    marginTop: 16,
    elevation: 3,
  },
  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  result: {
    marginTop: 26,
    fontSize: 20,
    fontWeight: '600',
    color: '#EAEAEA',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});

