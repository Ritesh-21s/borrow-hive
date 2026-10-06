import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Colors } from '../../constants/theme';
import { LogoMark } from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export default function Splash({ navigation }) {
  const { user, loading } = useAuth();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Navigation handled by AppNavigator switching stacks
      // This screen only shows during bootstrap
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <LogoMark size={72} variant="dark" />
        <Text style={styles.wordmark}>BorrowHive</Text>
        <Text style={styles.tagline}>your community, shared</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 14,
  },
  wordmark: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: '#FBFAF7',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#9AA0AC',
  },
});
