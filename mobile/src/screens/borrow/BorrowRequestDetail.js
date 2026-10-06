import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borrowAPI, chatAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { LoadingState, ErrorState } from '../../components/common/States';
import { Colors, Spacing } from '../../constants/theme';

const fmt = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function BorrowRequestDetail({ navigation, route }) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const res = await borrowAPI.getRequest(requestId);
      setReq(res.data.data.borrowRequest);
    } catch (err) {
      setError(err.userMessage || 'Failed to load request.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doAction = async (action, label) => {
    setActionLoading(true);
    try {
      await borrowAPI[action](requestId);
      Alert.alert('Done', `Request ${label}.`);
      load();
    } catch (err) {
      Alert.alert('Error', err.userMessage || `Failed to ${label}.`);
    } finally { setActionLoading(false); }
  };

  const handleChat = async () => {
    const otherId = req.ownerId._id === user._id ? req.borrowerId._id : req.ownerId._id;
    const otherName = req.ownerId._id === user._id ? req.borrowerId.name : req.ownerId.name;
    try {
      const res = await chatAPI.createConversation({ participantId: otherId });
      navigation.navigate('Conversation', {
        conversationId: res.data.data.conversation._id,
        title: otherName,
        deal: {
          icon: '📦',
          title: req.listingId?.title || 'Borrow Request',
          statusLabel: `Status: ${req.status}`,
          status: req.status,
          screen: 'BorrowRequestDetail',
          screenParams: { requestId: req._id },
        },
      });
    } catch (err) { Alert.alert('Error', err.userMessage); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!req) return null;

  const isOwner = req.ownerId?._id === user._id;
  const isBorrower = req.borrowerId?._id === user._id;
  const otherName = isOwner ? req.borrowerId?.name : req.ownerId?.name;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Who wants to borrow */}
        <View style={styles.headerCard}>
          <Avatar
            uri={isOwner ? req.borrowerId?.avatar?.url : req.ownerId?.avatar?.url}
            name={otherName}
            size={38}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {isOwner ? `${otherName} wants to borrow` : 'Your borrow request for'}
            </Text>
            <Text style={styles.headerSub}>{req.listingId?.title}</Text>
          </View>
        </View>

        <Text style={styles.timeText}>⏱ {fmt(req.startTime)} → {fmt(req.endTime)}</Text>

        {req.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Note</Text>
            <Text style={styles.noteText}>{req.note}</Text>
          </View>
        ) : null}

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={[styles.chip, { backgroundColor: req.status === 'ACCEPTED' ? '#DFF3EA' : '#FBEAD1' }]}>
            <Text style={[styles.chipText, { color: req.status === 'ACCEPTED' ? Colors.success : Colors.accentDark }]}>{req.status}</Text>
          </View>
        </View>

        {/* Actions for owner */}
        {isOwner && req.status === 'PENDING' && (
          <View style={styles.actions}>
            <Button title="Accept" onPress={() => doAction('accept', 'accepted')} loading={actionLoading} style={styles.actionBtn} />
            <Button title="Reject" variant="outline" onPress={() => doAction('reject', 'rejected')} style={styles.actionBtn} />
          </View>
        )}
        {isOwner && req.status === 'ACCEPTED' && (
          <View style={styles.actions}>
            <Button title="Mark as returned" onPress={() => doAction('markReturned', 'returned')} loading={actionLoading} style={styles.actionBtn} />
            <Button
              title="Cancel borrow"
              variant="outline"
              onPress={() =>
                Alert.alert('Cancel borrow?', 'This will cancel the active borrow request.', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, cancel', style: 'destructive', onPress: () => doAction('cancel', 'cancelled') },
                ])
              }
              style={[styles.actionBtn, styles.dangerBtn]}
            />
          </View>
        )}

        {/* Actions for borrower */}
        {isBorrower && req.status === 'PENDING' && (
          <Button
            title="Cancel request"
            variant="outline"
            onPress={() =>
              Alert.alert('Cancel request?', 'Are you sure you want to withdraw this borrow request?', [
                { text: 'No', style: 'cancel' },
                { text: 'Yes, cancel', style: 'destructive', onPress: () => doAction('cancel', 'cancelled') },
              ])
            }
            loading={actionLoading}
            style={[styles.mt, styles.dangerBtn]}
          />
        )}

        <Button title={`Chat with ${otherName} about pickup →`} variant="ghost" onPress={handleChat} style={styles.chatBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  avatar: { width: 40, height: 40, borderRadius: 99, backgroundColor: '#E4E0D4' },
  headerInfo: { flex: 1 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted },
  timeText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  noteBox: { backgroundColor: Colors.surface, borderRadius: 8, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  noteLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, color: Colors.muted, textTransform: 'uppercase', marginBottom: 4 },
  noteText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  statusLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  actionBtn: { flex: 1 },
  dangerBtn: { borderColor: '#E53E3E' },
  mt: { marginTop: Spacing.sm },
  chatBtn: { marginTop: Spacing.xs },
});
