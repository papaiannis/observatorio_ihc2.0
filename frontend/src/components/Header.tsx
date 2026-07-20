import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../utils/authStore';

const C = {
  sage: '#9EB36D',
  earth: '#4A3F35',
  avatarBg: '#FCECDA',
  gray: '#A09D9A',
};

/** Placeholder de búsqueda por pestaña; las pestañas ausentes de este mapa no muestran el ícono de búsqueda */
const SEARCH_PLACEHOLDERS: Record<string, string> = {
  observatorio: 'Buscar por especie o usuario...',
  comunidad: 'Buscar por especie o usuario...',
  documentos: 'Buscar proyecto...',
};

interface HeaderProps {
  onAvatarPress?: () => void;
  onAddPress?: () => void;
  /** pestaña activa del orquestador; determina si se muestra el ícono de búsqueda y su placeholder */
  activeTab?: string;
  /** se llama en cada cambio del texto de búsqueda (y con '' al cerrarla o cambiar de pestaña) */
  onSearchQueryChange?: (query: string) => void;
}

export default function Header({
  onAvatarPress,
  onAddPress,
  activeTab,
  onSearchQueryChange,
}: HeaderProps) {
  const { user } = useSession();
  const handleAvatarPress = onAvatarPress || (() => router.replace('/bienvenida'));
  const insets = useSafeAreaInsets();

  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState('');

  const searchPlaceholder = activeTab ? SEARCH_PLACEHOLDERS[activeTab] : undefined;
  const searchAvailable = !!searchPlaceholder;

  // Cerrar y limpiar la búsqueda al cambiar de pestaña, para no filtrar contenido de otra vista
  useEffect(() => {
    setSearchActive(false);
    setQuery('');
    onSearchQueryChange?.('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    onSearchQueryChange?.(text);
  };

  const closeSearch = () => {
    setSearchActive(false);
    setQuery('');
    onSearchQueryChange?.('');
  };

  if (searchActive) {
    return (
      <View style={[styles.header, { paddingTop: insets.top, height: 70 + insets.top }]}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={closeSearch}>
          <Ionicons name="arrow-back" size={24} color={C.earth} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleChangeText}
          placeholder={searchPlaceholder}
          placeholderTextColor={C.gray}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => handleChangeText('')}>
            <Ionicons name="close-circle" size={20} color={C.earth} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top, height: 70 + insets.top }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.avatarContainer}
          activeOpacity={0.8}
          onPress={handleAvatarPress}
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person" size={20} color={C.earth} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.headerRight}>
        {searchAvailable && (
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSearchActive(true)}>
            <Ionicons name="search-outline" size={26} color={C.earth} />
          </TouchableOpacity>
        )}
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
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: C.avatarBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    resizeMode: 'cover',
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
