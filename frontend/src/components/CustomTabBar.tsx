import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mapea el nombre de cada ruta (archivo dentro de main/) con su ícono.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'document-text-outline',
  add: 'add',
  community: 'people',
  settings: 'settings-sharp',
};

// Tipo mínimo local para no depender de @react-navigation/bottom-tabs.
type TabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

export default function CustomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {/* Botón circular flotante de marca (por ahora decorativo, sin funcionalidad) */}
        <View style={styles.floatingButton}>
          <Ionicons name="leaf" size={26} color="#3A4522" />
        </View>

        <View style={styles.iconsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const iconName = ICONS[route.name] ?? 'ellipse';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.7}
                style={[styles.iconButton, isFocused && styles.iconButtonActive]}
              >
                <Ionicons
                  name={iconName}
                  size={26}
                  color={isFocused ? '#1F2611' : '#6F7F4A'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#A5C56D',
    // Espacio arriba para que el botón flotante no se recorte
    paddingTop: 26,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A5C56D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: 62,
    paddingLeft: 98, // deja hueco para el botón flotante + separa el grupo de la hoja
    paddingRight: 26,
  },
  floatingButton: {
    position: 'absolute',
    left: 12,
    top: -22,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#EAF2DC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  iconsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 22,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});
