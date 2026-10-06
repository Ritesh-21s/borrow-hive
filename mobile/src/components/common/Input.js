import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  multiline,
  numberOfLines,
  style,
  inputStyle,
  editable = true,
  rightIcon,
  onRightIconPress,
  returnKeyType,
  onSubmitEditing,
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputContainer,
        focused && !error ? styles.focused : null,
        error ? styles.errorBorder : null,
        !editable ? styles.disabled : null,
      ]}>
        <TextInput
          style={[styles.input, multiline ? styles.multiline : null, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          // Suppress browser default blue outline on web
          {...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {})}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eye}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        ) : null}
        {(rightIcon && !secureTextEntry) ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.eye}>
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.input,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    // Smooth transition handled via state
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.ink,
  },
  multiline: {
    paddingTop: 11,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  focused: {
    borderColor: Colors.accent,           // warm amber — matches brand
    borderWidth: 1.5,
    // Soft amber glow (native)
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    backgroundColor: '#FFFEF9',           // very subtle warm tint
  },
  errorBorder: {
    borderColor: Colors.error,
    borderWidth: 1.5,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    fontSize: 11,
    color: Colors.error,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  eye: {
    padding: 4,
  },
  eyeText: {
    fontSize: 14,
  },
});

export default Input;
