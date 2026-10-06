import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../constants/theme';

const Chip = ({ label, active, onPress, style }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.active, style]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  active: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.ink,
  },
  textActive: {
    color: '#fff',
  },
});

export default Chip;
