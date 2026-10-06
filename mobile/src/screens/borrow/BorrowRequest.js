import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { borrowAPI } from '../../api';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Colors, Spacing } from '../../constants/theme';

import SuccessModal from '../../components/common/SuccessModal';

export default function BorrowRequest({ navigation, route }) {
  const { listing } = route.params;
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null); // null | 'none' | 'conflict'
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!startTime) e.startTime = 'Start time required';
    if (!endTime) e.endTime = 'End time required';
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) e.endTime = 'End must be after start';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await borrowAPI.createRequest({ listingId: listing._id, startTime, endTime, note });
      setShowSuccess(true);
    } catch (err) {
      if (err.response?.status === 409) {
        Alert.alert('Conflict', 'This item is already booked for that time window. Please choose a different time.');
      } else {
        Alert.alert('Error', err.userMessage || 'Failed to send request.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Request to borrow</Text>

        <Card
          image={listing?.images?.[0]?.url}
          title={listing?.title}
          subtitle={`Owner: ${listing?.ownerId?.name || 'Unknown'}`}
          style={styles.card}
        />

        <Input
          label="Start time (ISO or YYYY-MM-DDTHH:mm)"
          value={startTime}
          onChangeText={setStartTime}
          placeholder="2025-01-20T14:00:00"
          error={errors.startTime}
        />
        <Input
          label="End time"
          value={endTime}
          onChangeText={setEndTime}
          placeholder="2025-01-20T16:00:00"
          error={errors.endTime}
        />

        <View style={styles.banner}>
          <Text style={styles.bannerText}>✓ No conflicting bookings in this window</Text>
        </View>

        <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Any details for the owner…" multiline numberOfLines={2} />

        <Button title="Send request" onPress={handleSend} loading={loading} />
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        icon="📦"
        title="Borrow Request Sent!"
        message="Your request has been forwarded to the owner. You will be notified as soon as they respond."
        details={[
          { label: 'Item', value: listing?.title || 'Item' },
          { label: 'Owner', value: listing?.ownerId?.name || 'Owner' },
          { label: 'Start Time', value: startTime },
          { label: 'End Time', value: endTime },
        ]}
        primaryBtnText="View My Borrows"
        onPrimaryPress={() => {
          setShowSuccess(false);
          navigation.replace('BorrowDashboard');
        }}
        secondaryBtnText="Back to Marketplace"
        onSecondaryPress={() => {
          setShowSuccess(false);
          navigation.navigate('Tabs', { screen: 'Marketplace' });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  heading: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: Colors.ink, marginBottom: Spacing.md },
  card: { marginBottom: Spacing.lg },
  banner: { backgroundColor: Colors.successLight, borderRadius: 8, padding: Spacing.md, marginBottom: Spacing.md },
  bannerText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.success },
});
