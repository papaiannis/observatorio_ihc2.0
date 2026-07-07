import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  sage: '#9EB36D',
  earth: '#4A3F35',
  avatarBg: '#FCECDA',
};

interface HeaderProps {
  onAvatarPress?: () => void;
  onSearchPress?: () => void;
  onAddPress?: () => void;
}

export default function Header({
  onAvatarPress,
  onSearchPress,
  onAddPress,
}: HeaderProps) {
  const handleAvatarPress = onAvatarPress || (() => router.replace('/bienvenida'));
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top, height: 70 + insets.top }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.avatarContainer}
          activeOpacity={0.8}
          onPress={handleAvatarPress}
        >
          <Ionicons name="person" size={20} color={C.earth} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onSearchPress}>
          <Ionicons name="search-outline" size={26} color={C.earth} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onAddPress}>
          <Ionicons name="add" size={32} color={C.earth} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.sage,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    padding: 4,
  },
});
