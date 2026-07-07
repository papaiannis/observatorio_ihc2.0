import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  border: '#D4D4D4',
  gray: '#A09D9A',
};

type FilterType = 'Todas' | 'Validadas' | 'No validadas' | 'En proceso' | 'En proyectos';

export default function ComunidadTab() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterType[]>(['Todas']);
  const [appliedFilters, setAppliedFilters] = useState<FilterType[]>(['Todas']);

  const toggleFilter = (filter: FilterType) => {
    if (filter === 'Todas') {
      setTempFilters(['Todas']);
      return;
    }

    let next = tempFilters.filter((f) => f !== 'Todas');
    if (next.includes(filter)) {
      next = next.filter((f) => f !== filter);
      if (next.length === 0) {
        next = ['Todas'];
      }
    } else {
      next.push(filter);
    }
    setTempFilters(next);
  };

  const handleApply = () => {
    setAppliedFilters(tempFilters);
    setIsDropdownOpen(false);
  };

  // Texto resumido para el botón del dropdown
  const getDropdownLabel = () => {
    if (appliedFilters.includes('Todas')) return 'Todas';
    return appliedFilters.join(', ');
  };

  return (
    <View style={styles.container}>
      {/* Título y Filtros Multi-Select */}
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Comunidad</Text>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            activeOpacity={0.8}
            onPress={() => {
              setIsDropdownOpen(!isDropdownOpen);
              if (!isDropdownOpen) {
                setTempFilters(appliedFilters);
              }
            }}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {getDropdownLabel()}
            </Text>
            <Ionicons
              name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={C.forest}
            />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {(['Todas', 'Validadas', 'No validadas', 'En proceso', 'En proyectos'] as FilterType[]).map((filter, index) => {
                const isSelected = tempFilters.includes(filter);
                return (
                  <View key={filter}>
                    {index > 0 && <View style={styles.dropdownDivider} />}
                    <TouchableOpacity
                      style={styles.dropdownOption}
                      activeOpacity={0.7}
                      onPress={() => toggleFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          isSelected && styles.dropdownOptionTextActive,
                        ]}
                      >
                        {filter}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={C.forest} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Botón Aplicar */}
              <TouchableOpacity
                style={styles.applyBtn}
                activeOpacity={0.85}
                onPress={handleApply}
              >
                <Text style={styles.applyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Grid vacío que siempre muestra el texto requerido */}
      <FlatList
        data={[]}
        keyExtractor={(_, index) => index.toString()}
        renderItem={null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aún nada que mostrar aquí...</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
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
    borderColor: C.border,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  dropdownText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: C.forest,
    flex: 1,
    marginRight: 10,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
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
  dropdownDivider: {
    height: 1,
    backgroundColor: C.bg,
  },
  applyBtn: {
    backgroundColor: C.forest,
    borderRadius: 20,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.white,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 110,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
    color: C.gray,
    fontStyle: 'italic',
  },
});
