import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { communityAPI } from '../../api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { LogoLockup } from '../../components/Logo';
import { Colors, Spacing } from '../../constants/theme';

export default function Register({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [domainMatch, setDomainMatch] = useState(null); // { matched, community }

  const checkDomain = async (val) => {
    setEmail(val);
    const domain = val.split('@')[1];
    if (domain && domain.includes('.')) {
      try {
        const res = await communityAPI.checkDomain(domain);
        setDomainMatch(res.data.data);
      } catch (_) {
        setDomainMatch(null);
      }
    } else {
      setDomainMatch(null);
    }
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setApiError('');

    // If no domain match, go to community verify
    if (domainMatch && !domainMatch.matched) {
      navigation.navigate('CommunityVerify', { name, email, password });
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password });
    } catch (err) {
      if (err.response?.data?.requiresInviteCode) {
        navigation.navigate('CommunityVerify', { name, email, password });
      } else {
        setApiError(err.userMessage || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = password.length === 0 ? '' : password.length < 6 ? 'Too short' : password.length < 10 ? 'Good' : 'Strong — good to go';
  const strengthColor = password.length < 6 ? Colors.error : password.length < 10 ? Colors.accent : Colors.success;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LogoLockup size={28} style={styles.logo} />
          <Text style={styles.heading}>Create account</Text>

          {apiError ? <View style={styles.errorBanner}><Text style={styles.errorText}>{apiError}</Text></View> : null}

          <Input label="Full name" value={name} onChangeText={setName} placeholder="Ritesh Kumar" autoCapitalize="words" error={errors.name} />
          <Input label="Email (college / org)" value={email} onChangeText={checkDomain} placeholder="you@college.edu" keyboardType="email-address" error={errors.email} />

          {domainMatch?.matched && (
            <View style={styles.domainChip}>
              <Text style={styles.domainText}>Domain matched: {domainMatch.community?.name} ✓</Text>
            </View>
          )}

          <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry error={errors.password} />
          {strengthLabel ? <Text style={[styles.strength, { color: strengthColor }]}>{strengthLabel}</Text> : null}

          <Button title="Continue" onPress={handleContinue} loading={loading} style={styles.btn} />
          <Button title="Already have an account? Log in" variant="ghost" onPress={() => navigation.navigate('Login')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.xl, paddingTop: Spacing.xxxl },
  logo: { marginBottom: Spacing.xl },
  heading: { fontFamily: 'Fraunces_600SemiBold', fontSize: 26, color: Colors.ink, marginBottom: Spacing.xl },
  btn: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  domainChip: {
    backgroundColor: Colors.successLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  domainText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.success },
  strength: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: -6, marginBottom: Spacing.sm },
  errorBanner: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#DC2626' },
});
