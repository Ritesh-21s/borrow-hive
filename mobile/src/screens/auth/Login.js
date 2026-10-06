import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing } from '../../constants/theme';

export default function Login({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setApiError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation handled automatically by AppNavigator
    } catch (err) {
      setApiError(err.userMessage || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LogoLockup size={28} style={styles.logo} />

          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.sub}>Log in to your community</Text>

          {apiError ? <View style={styles.errorBanner}><Text style={styles.errorText}>{apiError}</Text></View> : null}

          <Input
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
            placeholder="you@college.edu"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
          />

          <Button title="Log in" onPress={handleLogin} loading={loading} style={styles.btnPrimary} />
          <Button title="Create account" variant="outline" onPress={() => navigation.navigate('Register')} />
          <Button title="Forgot password?" variant="ghost" onPress={() => {}} style={styles.ghost} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.xl, paddingTop: Spacing.xxxl },
  logo: { marginBottom: Spacing.xxl + 4 },
  heading: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26,
    color: Colors.ink,
    marginBottom: 6,
  },
  sub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.muted,
    marginBottom: Spacing.xl + 4,
  },
  btnPrimary: { marginBottom: Spacing.sm },
  ghost: { marginTop: Spacing.xs },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#DC2626',
  },
});
