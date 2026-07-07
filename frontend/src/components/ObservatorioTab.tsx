import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E2E2E2',
};

export default function ObservatorioTab() {
  const [filterMode, setFilterMode] = useState<'Todo' | 'En proyecto'>('Todo');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <View style={styles.container}>
      {/* Título y Selector de Filtro Expansible */}
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Observatorio</Text>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            activeOpacity={0.8}
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <Text style={styles.dropdownText}>{filterMode}</Text>
            <Ionicons
              name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.forest}
            />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  setFilterMode('Todo');
                  setIsDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    filterMode === 'Todo' && styles.dropdownOptionTextActive,
                  ]}
                >
                  Todo
                </Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  setFilterMode('En proyecto');
                  setIsDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    filterMode === 'En proyecto' && styles.dropdownOptionTextActive,
                  ]}
                >
                  En proyecto
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Estado Vacío de Publicaciones */}
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>sin publicaciones...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: C.forest,
    marginBottom: 20,
  },
  dropdownContainer: {
    width: '100%',
    zIndex: 100,
    position: 'relative',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  dropdownText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: C.forest,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D4D4D4',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dropdownOptionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.earth,
  },
  dropdownOptionTextActive: {
    fontFamily: 'Poppins_600SemiBold',
    color: C.forest,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
    color: C.gray,
    fontStyle: 'italic',
  },
});
