import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import Avatar from './common/Avatar';

// Tab icons as emoji/text — clean and no extra icon library needed
const TAB_ICONS = {
  Home: { icon: '⌂', label: 'Home' },
  Marketplace: { icon: '🏪', label: 'Market' },
  Rides: { icon: '🚗', label: 'Rides' },
  Chat: { icon: '💬', label: 'Chat' },
  Profile: { icon: '👤', label: 'Profile' },
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { user } = useAuth();

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const tab = TAB_ICONS[route.name] || { icon: '•', label: route.name };

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const isProfile = route.name === 'Profile';

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, isFocused && styles.iconBoxActive]}>
              {isProfile && user ? (
                <Avatar uri={user.avatar?.url} name={user.name} size={20} />
              ) : (
                <Text style={[styles.icon, isFocused && styles.iconActive]}>{tab.icon}</Text>
              )}
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconBox: {
    width: 36,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EAEAE6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconBoxActive: {
    backgroundColor: Colors.accent,
  },
  icon: {
    fontSize: 13,
  },
  iconActive: {},
  label: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#B7BAC1',
  },
  labelActive: {
    color: Colors.accentDark,
  },
});

export default CustomTabBar;
