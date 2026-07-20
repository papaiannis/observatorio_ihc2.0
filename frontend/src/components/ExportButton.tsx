import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';
import { downloadAndShareExport } from '../utils/exportUtils';

const { height } = Dimensions.get('window');

const C = {
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E8E8E8',
  lightBg: '#F9F9F9',
};

export interface ExportButtonProps {
  mode: 'sighting' | 'project' | 'my_sightings';
  id?: string; // sightingId o investigationId
  label?: string;
  style?: any;
  buttonVariant?: 'pill' | 'button' | 'drawerItem' | 'icon';
}

export default function ExportButton({
  mode,
  id,
  label,
  style,
  buttonVariant = 'pill',
}: ExportButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportTypeLabel, setExportTypeLabel] = useState('');

  const handleExport = async (format: 'csv' | 'xlsx', onlyValidated: boolean = false) => {
    try {
      setExporting(true);
      const isXlsx = format === 'xlsx';
      setExportTypeLabel(isXlsx ? 'Generando archivo Excel (.xlsx)...' : 'Generando archivo CSV...');

      const { token } = await authStore.getSession();

      let endpointPath = '';
      let filenameBase = '';

      if (mode === 'sighting') {
        if (!id) return;
        endpointPath = `/api/v1/export/sighting/${id}?format=${format}`;
        filenameBase = `gaia_avistamiento_${id.substring(0, 8)}`;
      } else if (mode === 'project') {
        if (!id) return;
        endpointPath = `/api/v1/export/project/${id}?format=${format}&only_validated=${onlyValidated}`;
        const suffix = onlyValidated ? '_validados' : '_todos';
        filenameBase = `gaia_proyecto_${id.substring(0, 8)}${suffix}`;
      } else if (mode === 'my_sightings') {
        endpointPath = `/api/v1/export/my?format=${format}`;
        filenameBase = `gaia_mis_avistamientos`;
      }

      await downloadAndShareExport(endpointPath, filenameBase, format, token || undefined);
      setModalVisible(false);
    } catch (e) {
      // El error ya fue reportado por Alert en downloadAndShareExport
    } finally {
      setExporting(false);
      setExportTypeLabel('');
    }
  };

  const renderTriggerButton = () => {
    if (buttonVariant === 'drawerItem') {
      return (
        <TouchableOpacity
          style={[styles.drawerItem, style]}
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="cloud-download-outline" size={24} color={C.sage} />
          <Text style={styles.drawerLabel}>{label || 'Exportar mis datos (CSV/Excel)'}</Text>
          <Ionicons name="chevron-forward" size={18} color={C.gray} />
        </TouchableOpacity>
      );
    }

    if (buttonVariant === 'icon') {
      return (
        <TouchableOpacity
          style={[styles.iconButton, style]}
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="cloud-download-outline" size={22} color={C.forest} />
        </TouchableOpacity>
      );
    }

    if (buttonVariant === 'button') {
      return (
        <TouchableOpacity
          style={[styles.fullButton, style]}
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.fullButtonText}>{label || 'Exportar Dataset'}</Text>
        </TouchableOpacity>
      );
    }

    // Default 'pill'
    return (
      <TouchableOpacity
        style={[styles.pillButton, style]}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="cloud-download-outline" size={18} color={C.forest} style={{ marginRight: 6 }} />
        <Text style={styles.pillText}>{label || 'Exportar'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {renderTriggerButton()}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !exporting && setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !exporting && setModalVisible(false)}
        >
          <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>
              {mode === 'project'
                ? 'Exportar Dataset de Proyecto'
                : mode === 'sighting'
                ? 'Exportar Avistamiento (Darwin Core)'
                : 'Exportar Mis Avistamientos'}
            </Text>
            <Text style={styles.sheetSubtitle}>
              Selecciona el formato y alcance de los datos que deseas exportar:
            </Text>

            {exporting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={C.sage} />
                <Text style={styles.loadingText}>{exportTypeLabel}</Text>
              </View>
            ) : (
              <View style={styles.optionsList}>
                {mode === 'project' ? (
                  <>
                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => handleExport('csv', false)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="document-text" size={22} color="#2E7D32" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>Todos los avistamientos (CSV)</Text>
                        <Text style={styles.optionDesc}>Incluye validados y pendientes en formato Darwin Core</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => handleExport('xlsx', false)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="grid" size={22} color="#1565C0" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>Todos los avistamientos (Excel .xlsx)</Text>
                        <Text style={styles.optionDesc}>Hoja de cálculo con todos los registros del proyecto</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => handleExport('csv', true)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                        <Ionicons name="checkmark-circle" size={22} color="#EF6C00" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>Solo Validados (CSV)</Text>
                        <Text style={styles.optionDesc}>Dataset científico curado y aprobado</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => handleExport('xlsx', true)}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                        <Ionicons name="ribbon" size={22} color="#7B1FA2" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>Solo Validados (Excel .xlsx)</Text>
                        <Text style={styles.optionDesc}>Hoja de cálculo con observaciones certificadas</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => handleExport('csv')}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Ionicons name="document-text" size={22} color="#2E7D32" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>Formato CSV (Darwin Core)</Text>
                        <Text style={styles.optionDesc}>Estándar universal para análisis de datos o Python/R</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.7}
                      onPress={() => handleExport('xlsx')}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="grid" size={22} color="#1565C0" />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionTitle}>Formato Excel (.xlsx)</Text>
                        <Text style={styles.optionDesc}>Listo para abrir en Microsoft Excel o Google Sheets</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0D8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C5D8A4',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.forest,
  },
  fullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.forest,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fullButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F0D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  drawerLabel: {
    flex: 1,
    fontSize: 15,
    color: C.forest,
    marginLeft: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
    maxHeight: height * 0.75,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#DDDBD8',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.forest,
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: C.gray,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: C.forest,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.forest,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: C.gray,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 4,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },
});
