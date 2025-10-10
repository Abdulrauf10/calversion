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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    width: '80%',
    marginBottom: 20,
    fontSize: 18,
  },
  buttonGroup: {
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  modeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    marginVertical: 4,
  },
  activeButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  activeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  convertButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 10,
  },
  convertButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  result: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '500',
  },
});
