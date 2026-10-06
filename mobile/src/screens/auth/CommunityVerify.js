import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Colors, Spacing } from '../../constants/theme';

export default function CommunityVerify({ navigation, route }) {
  const { name, email, password } = route.params || {};
  const { register } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({ name, email, password, inviteCode: inviteCode.trim().toUpperCase() });
    } catch (err) {
      setError(err.userMessage || 'Invalid invite code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.chip}>
          <Text style={styles.chipText}>Community</Text>
        </View>
        <Text style={styles.heading}>Verify your community</Text>
        <Text style={styles.sub}>We couldn't match your email to a community</Text>

        <Input
          label="Invite code"
          value={inviteCode}
          onChangeText={(v) => { setInviteCode(v.toUpperCase()); setError(''); }}
          placeholder="KPRIET2026"
          autoCapitalize="characters"
          error={error}
        />

        <Button title="Verify & join" onPress={handleVerify} loading={loading} style={styles.btn} />

        <Text style={styles.orText}>— or —</Text>
        <Button title="Search for your community" variant="outline" onPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.xl, paddingTop: Spacing.xxxl },
  chip: {
    backgroundColor: Colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.accentDark },
  heading: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: Colors.ink, marginBottom: 6 },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.muted, marginBottom: Spacing.xl },
  btn: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  orText: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginBottom: Spacing.md },
});
