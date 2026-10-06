import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

const SearchBar = ({ value, onChangeText, placeholder = 'Search…', style }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.focused, style]}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>⌕</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    marginBottom: Spacing.md,
  },
  focused: {
    borderColor: Colors.accent,
    backgroundColor: '#FFFEF9',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    fontSize: 16,
    color: Colors.muted,
    marginRight: Spacing.sm,
  },
  iconFocused: {
    color: Colors.accent,
  },
  input: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.ink,
  },
});

export default SearchBar;
