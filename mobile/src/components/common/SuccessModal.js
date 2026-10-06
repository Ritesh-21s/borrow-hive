import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Button from './Button';
import { Colors, Spacing, Radius, Shadow } from '../../constants/theme';

/**
 * SuccessModal
 * A confirmation modal with icon, title, message, structured detail rows,
 * and primary & secondary action buttons.
 */
export default function SuccessModal({
  visible,
  icon = '✅',
  title = 'Success!',
  message = 'Your request has been successfully submitted.',
  details = [], // Array of { label: string, value: string }
  primaryBtnText = 'View Requests',
  onPrimaryPress,
  secondaryBtnText = 'Back to Home',
  onSecondaryPress,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose || onSecondaryPress}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Badge Icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>

          {/* Heading */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Details Box */}
          {details.length > 0 && (
            <View style={styles.detailsBox}>
              {details.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.detailRow,
                    idx < details.length - 1 && styles.detailRowBorder,
                  ]}
                >
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.btnGroup}>
            {primaryBtnText && onPrimaryPress && (
              <Button
                title={primaryBtnText}
                onPress={onPrimaryPress}
                style={styles.primaryBtn}
              />
            )}
            {secondaryBtnText && onSecondaryPress && (
              <Button
                title={secondaryBtnText}
                variant="outline"
                onPress={onSecondaryPress}
                style={styles.secondaryBtn}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 24, 29, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: '#C6EAD8',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F8F8F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.muted,
  },
  detailValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.ink,
    textAlign: 'right',
    maxWidth: '60%',
  },
  btnGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
  },
});
