import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { rideAPI } from '../../api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Colors, Spacing, Radius } from '../../constants/theme';
import SuccessModal from '../../components/common/SuccessModal';

export default function CreateRide({ navigation, route }) {
  const existing = route.params?.ride;
  const isEdit = !!existing;

  const initialType = route.params?.type || (existing?.type === 'request' ? 'request' : 'offer');
  const [type, setType] = useState(initialType);
  const isRequest = type === 'request';

  const [from, setFrom] = useState(existing?.from || '');
  const [to, setTo] = useState(existing?.to || '');
  const [time, setTime] = useState(
    existing?.departureTime
      ? new Date(existing.departureTime).toISOString().slice(0, 16)
      : existing?.startTime
      ? new Date(existing.startTime).toISOString().slice(0, 16)
      : ''
  );
  const [totalSeats, setTotalSeats] = useState(existing?.totalSeats?.toString() || '3');
  const [cost, setCost] = useState(
    existing?.pricePerSeat?.toString() || existing?.cost?.toString() || '0'
  );
  const [notes, setNotes] = useState(existing?.notes || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!from.trim()) e.from = 'Pickup location / From is required';
    if (!to.trim()) e.to = 'Destination / To is required';
    if (!time) e.time = 'Time is required (YYYY-MM-DDTHH:mm)';
    else if (new Date(time) <= new Date()) e.time = 'Must be in the future';

    if (!isRequest) {
      if (!totalSeats || parseInt(totalSeats, 10) < 1) {
        e.totalSeats = 'At least 1 seat';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        type,
        from: from.trim(),
        to: to.trim(),
        departureTime: new Date(time).toISOString(),
        startTime: new Date(time).toISOString(),
        totalSeats: isRequest ? 1 : parseInt(totalSeats, 10),
        cost: isRequest ? 0 : parseFloat(cost) || 0,
        pricePerSeat: isRequest ? 0 : parseFloat(cost) || 0,
        notes: notes.trim(),
      };

      if (isEdit) {
        await rideAPI.updateRide(existing._id, payload);
      } else {
        await rideAPI.createRide(payload);
      }
      setShowSuccess(true);
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Failed to save ride.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Toggle if not edit */}
        {!isEdit && (
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={[styles.typeBtn, !isRequest && styles.typeBtnActiveOffer]}
              onPress={() => setType('offer')}
            >
              <Text style={[styles.typeBtnText, !isRequest && styles.typeBtnTextActive]}>
                🚗 Offer a Ride
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, isRequest && styles.typeBtnActiveRequest]}
              onPress={() => setType('request')}
            >
              <Text style={[styles.typeBtnText, isRequest && styles.typeBtnTextActive]}>
                🙋 Request a Ride
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.heading}>
          {isEdit
            ? 'Edit Ride Details'
            : isRequest
            ? 'Request a Ride'
            : 'Offer Seats in your Vehicle'}
        </Text>
        <Text style={styles.subheading}>
          {isRequest
            ? 'Let community drivers know where and when you need a ride.'
            : 'Share seats, split travel costs, and commute together.'}
        </Text>

        <View style={styles.row}>
          <Input
            label="From / Pickup point *"
            value={from}
            onChangeText={setFrom}
            placeholder="e.g. North Gate / Campus Hostel"
            style={styles.half}
            error={errors.from}
          />
          <Input
            label="To / Destination *"
            value={to}
            onChangeText={setTo}
            placeholder="e.g. Railway Station / City Mall"
            style={styles.half}
            error={errors.to}
          />
        </View>

        <Input
          label={isRequest ? 'When do you need the ride? (YYYY-MM-DDTHH:mm) *' : 'Departure Time (YYYY-MM-DDTHH:mm) *'}
          value={time}
          onChangeText={setTime}
          placeholder="2026-10-06T17:30"
          error={errors.time}
        />

        {!isRequest && (
          <View style={styles.row}>
            <Input
              label="Total Seats Available *"
              value={totalSeats}
              onChangeText={setTotalSeats}
              placeholder="3"
              keyboardType="numeric"
              style={styles.half}
              error={errors.totalSeats}
            />
            <Input
              label="Cost per seat ₹ (Optional)"
              value={cost}
              onChangeText={setCost}
              placeholder="50"
              keyboardType="numeric"
              style={styles.half}
            />
          </View>
        )}

        <Input
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder={
            isRequest
              ? 'e.g. Have a small backpack, can walk to main road…'
              : 'e.g. Leaving on time, can stop near metro station on the way…'
          }
          multiline
          numberOfLines={3}
        />

        <Button
          title={isEdit ? 'Save Changes' : isRequest ? 'Post Ride Request' : 'Publish Ride Offer'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        icon="🚗"
        title={isEdit ? 'Ride Updated!' : isRequest ? 'Ride Request Posted!' : 'Ride Offer Published!'}
        message={
          isRequest
            ? 'Your ride request is now live. Drivers heading your way can tap to chat with you.'
            : 'Your ride is live. Passengers can now send join requests.'
        }
        details={[
          { label: 'Type', value: isRequest ? 'Ride Request' : 'Ride Offer' },
          { label: 'Route', value: `${from} → ${to}` },
          { label: 'Time', value: time },
          ...(!isRequest ? [{ label: 'Seats', value: `${totalSeats} seats` }] : []),
        ]}
        primaryBtnText="View Rides"
        onPrimaryPress={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
        secondaryBtnText="Back"
        onSecondaryPress={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 50 },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#EBEBE6',
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  typeBtnActiveOffer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  typeBtnActiveRequest: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#C084FC',
  },
  typeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.muted,
  },
  typeBtnTextActive: {
    color: Colors.ink,
  },
  heading: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: Colors.ink,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.muted,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
  submitBtn: { marginTop: Spacing.md },
});
