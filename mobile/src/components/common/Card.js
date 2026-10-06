import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { Colors, Radius, Spacing, Shadow } from '../../constants/theme';

const BADGE_COLORS = {
  SELL:    { bg: '#DCFCE7', text: '#15803D' },
  BUY:     { bg: '#DBEAFE', text: '#1D4ED8' },
  OFFER:   { bg: '#FEF3C7', text: '#B45309' },
  REQUEST: { bg: '#F3E8FF', text: '#7E22CE' },
  BORROW:  { bg: '#FFEDD5', text: '#C2410C' },
  FULL:    { bg: '#FEE2E2', text: '#B91C1C' },
};

const Card = ({
  image,
  title,
  subtitle,
  price,
  budget,
  isFree,
  badge,
  badgeColor,
  badgeBg,
  avatarUrl,
  avatarName,
  onPress,
  style,
}) => {
  const badgeStyle = badge && BADGE_COLORS[badge.toUpperCase()] ? BADGE_COLORS[badge.toUpperCase()] : null;
  const bg = badgeBg || (badgeStyle ? badgeStyle.bg : Colors.accentLight);
  const color = badgeColor || (badgeStyle ? badgeStyle.text : Colors.accentDark);

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      {image ? (
        <Image source={{ uri: image }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={styles.thumbPlaceholder} />
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.subRow}>
          {(avatarUrl !== undefined || avatarName !== undefined) && (
            <Avatar uri={avatarUrl} name={avatarName} size={18} style={styles.cardAvatar} />
          )}
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {price !== undefined && price !== null && !isFree ? (
          <Text style={styles.price}>₹{price}</Text>
        ) : null}
        {budget !== undefined && budget !== null && budget > 0 ? (
          <Text style={styles.price}>Budget: ₹{budget}</Text>
        ) : null}
        {isFree ? <Text style={styles.free}>Free</Text> : null}
      </View>

      {badge ? (
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={[styles.badgeText, { color }]}>{badge.toUpperCase()}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: Colors.border,
    flexShrink: 0,
  },
  thumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#EDE9DF',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.ink,
    marginBottom: 2,
    flex: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  cardAvatar: {
    flexShrink: 0,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.muted,
    flex: 1,
  },
  price: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: Colors.accentDark,
    marginTop: 3,
  },
  free: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.success,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
});

export default Card;
