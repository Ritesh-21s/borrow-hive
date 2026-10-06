import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

export const LoadingState = ({ message = 'Loading…' }) => (
  <View style={styles.center}>
    <ActivityIndicator color={Colors.accent} size="large" />
    <Text style={styles.text}>{message}</Text>
  </View>
);

export const EmptyState = ({ icon = '📭', message = 'Nothing here yet.', subMessage }) => (
  <View style={styles.center}>
    <Text style={styles.emoji}>{icon}</Text>
    <Text style={styles.emptyTitle}>{message}</Text>
    {subMessage ? <Text style={styles.text}>{subMessage}</Text> : null}
  </View>
);

export const ErrorState = ({ message = 'Something went wrong.', onRetry }) => (
  <View style={styles.center}>
    <Text style={styles.emoji}>⚠️</Text>
    <Text style={styles.emptyTitle}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
  },
  emoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.ink,
    textAlign: 'center',
  },
  text: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
});
