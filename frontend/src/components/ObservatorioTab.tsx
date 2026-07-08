import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
};

export default function ObservatorioTab() {
  const [filterMode, setFilterMode] = useState<'Todo' | 'En proyecto'>('Todo');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <View style={styles.container}>
      {/* Título y Selector de Filtro Expansible */}
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Observatorio</Text>

        {/* Dropdown unificado: pill + panel son un solo elemento */}
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={[
              styles.dropdownPill,
              isDropdownOpen && styles.dropdownPillOpen,
            ]}
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
            <View style={styles.dropdownPanel}>
              {/* 5px de aire entre el pill y el inicio de opciones */}
              <View style={{ height: 5 }} />

              {(['Todo', 'En proyecto'] as const).map((option) => {
                const selected = filterMode === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownOption}
                    activeOpacity={0.7}
                    onPress={() => {
                      setFilterMode(option);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        selected && styles.dropdownOptionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={16} color={C.sage} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Estado Vacío */}
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aún no hay avistamientos</Text>
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
    zIndex: 100,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: C.forest,
    marginBottom: 20,
  },

  // ── Dropdown unificado ─────────────────────────────────────
  dropdownWrapper: {
    width: '100%',
    position: 'relative',
    zIndex: 100,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    // Sombra elevada – sin borde gris
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  dropdownPillOpen: {
    // Mantiene el mismo radio redondeado aun con el panel abierto
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  dropdownText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: C.forest,
  },
  dropdownPanel: {
    position: 'absolute',
    top: 50, // 48px del pill + 2px de margen visual
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderRadius: 18,
    paddingBottom: 6,
    // Misma sombra de elevación
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
    zIndex: 150,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // ── Estado vacío ─────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: C.gray,
    fontStyle: 'italic',
  },
});
