import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import Button from './Button';
import { Colors, Spacing, Radius } from '../../constants/theme';

/**
 * ConfirmModal
 * A high-quality in-app confirmation modal for actions like Sold, Delete, Start Ride, Complete, Fulfilled.
 * Completely cross-platform (Web & Mobile).
 */
export default function ConfirmModal({
  visible,
  icon = '⚠️',
  title = 'Are you sure?',
  message = 'Please confirm this action.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {icon ? (
            <View style={[styles.iconCircle, destructive && styles.iconCircleDestructive]}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                destructive ? styles.destructiveBtn : styles.primaryConfirmBtn,
                loading && { opacity: 0.7 },
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={destructive ? '#fff' : Colors.ink} size="small" />
              ) : (
                <Text
                  style={[
                    styles.confirmBtnText,
                    destructive ? styles.destructiveText : styles.primaryText,
                  ]}
                >
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card || 12,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircleDestructive: {
    backgroundColor: '#FEE2E2',
  },
  iconText: {
    fontSize: 26,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.xl,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.btn || 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.ink,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.btn || 8,
  },
  primaryConfirmBtn: {
    backgroundColor: Colors.accent,
  },
  destructiveBtn: {
    backgroundColor: '#DC2626',
  },
  confirmBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  primaryText: {
    color: '#2A1503',
  },
  destructiveText: {
    color: '#FFFFFF',
  },
});
