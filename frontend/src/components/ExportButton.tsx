import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';
import { downloadAndShareExport } from '../utils/exportUtils';

const { height, width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E8E8E8',
  lightBg: '#F9F9F9',
  bg: '#F7F7F7',
};

export interface ExportButtonProps {
  mode: 'sighting' | 'project' | 'my_sightings';
  id?: string; // sightingId o investigationId
  label?: string;
  style?: any;
  buttonVariant?: 'pill' | 'button' | 'drawerItem' | 'icon';
}

type UserType = 'experto' | 'entusiasta';

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

  // Estado del Modal de Autenticación / Registro (para visitantes)
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [userType, setUserType] = useState<UserType>('experto');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const handleTriggerPress = async () => {
    const { token, user } = await authStore.getSession();
    if (!token || !user) {
      // Visitante no logueado: mostrar modal de registro con estética de tepui_hero
      setAuthModalVisible(true);
      return;
    }
    setModalVisible(true);
  };

  const handleAuthSubmit = async () => {
    if (!correo || !password || (!isLoginMode && !nombre)) {
      Alert.alert('Atención', 'Por favor completa todos los campos requeridos.');
      return;
    }
    setAuthLoading(true);
    try {
      const endpoint = isLoginMode ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const bodyPayload = isLoginMode
        ? { email: correo, password }
        : { nombre, email: correo, password, tipo: userType };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || (isLoginMode ? 'Error al iniciar sesión' : 'Error al registrarse'));
      }

      await authStore.setSession(data.token, data.user);
      setAuthModalVisible(false);
      // Tras registrarse o loguearse, abrimos de inmediato la selección de formato de exportación
      setModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo completar la operación.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx', onlyValidated: boolean = false) => {
    try {
      setExporting(true);
      const isXlsx = format === 'xlsx';
      setExportTypeLabel(isXlsx ? 'Generando archivo Excel (.xlsx)...' : 'Generando archivo CSV...');

      const { token } = await authStore.getSession();
      if (!token) {
        setModalVisible(false);
        setAuthModalVisible(true);
        return;
      }

      let endpointPath = '';
      let filenameBase = '';

      if (mode === 'sighting') {
        if (!id) return;
        endpointPath = `/api/v1/export/sighting/${id}?format=${format}`;
        filenameBase = `enu_avistamiento_${id.substring(0, 8)}`;
      } else if (mode === 'project') {
        if (!id) return;
        endpointPath = `/api/v1/export/project/${id}?format=${format}&only_validated=${onlyValidated}`;
        const suffix = onlyValidated ? '_validados' : '_todos';
        filenameBase = `enu_proyecto_${id.substring(0, 8)}${suffix}`;
      } else if (mode === 'my_sightings') {
        endpointPath = `/api/v1/export/my?format=${format}`;
        filenameBase = `enu_mis_avistamientos`;
      }

      await downloadAndShareExport(endpointPath, filenameBase, format, token);
      setModalVisible(false);
    } catch (e: any) {
      if (e?.message && (e.message.includes('401') || e.message.toLowerCase().includes('sesión') || e.message.toLowerCase().includes('autorizado'))) {
        setModalVisible(false);
        setAuthModalVisible(true);
      }
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
          onPress={handleTriggerPress}
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
          onPress={handleTriggerPress}
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
          onPress={handleTriggerPress}
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
        onPress={handleTriggerPress}
      >
        <Ionicons name="cloud-download-outline" size={18} color={C.forest} style={{ marginRight: 6 }} />
        <Text style={styles.pillText}>{label || 'Exportar'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {renderTriggerButton()}

      {/* ── Modal de Selección de Formato Darwin Core ── */}
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
                ? 'Exportar Dataset de Proyecto (ENÚ)'
                : mode === 'sighting'
                ? 'Exportar Avistamiento (ENÚ Darwin Core)'
                : 'Exportar Mis Avistamientos (ENÚ)'}
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

      {/* ── Modal de Registro/Autenticación para Visitantes (Estética tepui_hero) ── */}
      <Modal
        visible={authModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAuthModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.authModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.authSheet}>
            {/* Botón de cierre en esquina */}
            <TouchableOpacity
              style={styles.authCloseBtn}
              onPress={() => setAuthModalVisible(false)}
            >
              <Ionicons name="close-circle" size={28} color={C.forest} />
            </TouchableOpacity>

            <ScrollView
              contentContainerStyle={styles.authScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.authHeroWrapper}>
                <Image
                  source={require('@/assets/images/tepui_hero.png')}
                  style={styles.authHeroImage}
                  contentFit="cover"
                />
              </View>

              <View style={styles.authFormArea}>
                <Text style={styles.authTitle}>
                  {isLoginMode ? 'Inicia Sesión en ENÚ' : 'Únete a ENÚ'}
                </Text>
                <Text style={styles.authDesc}>
                  {isLoginMode
                    ? 'Inicia sesión para descargar datasets científicos de biodiversidad.'
                    : 'Para exportar datos científicos y sumarte al observatorio de la Región Guayana necesitas una cuenta en ENÚ.'}
                </Text>

                {!isLoginMode && (
                  <View style={styles.toggleWrapper}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, userType === 'experto' && styles.toggleBtnActive]}
                      onPress={() => setUserType('experto')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.toggleText}>Experto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.toggleBtn, userType === 'entusiasta' && styles.toggleBtnActive]}
                      onPress={() => setUserType('entusiasta')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.toggleText}>Entusiasta</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.inputsContainer}>
                  {!isLoginMode && (
                    <View style={styles.inputGroup}>
                      <TextInput
                        style={styles.input}
                        placeholder="Nombre completo / usuario"
                        placeholderTextColor={C.gray}
                        value={nombre}
                        onChangeText={setNombre}
                        autoCapitalize="words"
                        selectionColor={C.sage}
                      />
                      <View style={styles.inputLine} />
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Correo electrónico"
                      placeholderTextColor={C.gray}
                      value={correo}
                      onChangeText={setCorreo}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      selectionColor={C.sage}
                    />
                    <View style={styles.inputLine} />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Contraseña"
                        placeholderTextColor={C.gray}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        selectionColor={C.sage}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={C.gray}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputLine} />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleAuthSubmit}
                  disabled={authLoading}
                  activeOpacity={0.8}
                >
                  {authLoading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {isLoginMode ? 'Continuar y Exportar' : 'Regístrate y Exportar'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeBtn}
                  onPress={() => setIsLoginMode(!isLoginMode)}
                >
                  <Text style={styles.switchModeText}>
                    {isLoginMode
                      ? '¿Aún no tienes cuenta? Regístrate gratis'
                      : '¿Ya tienes una cuenta en ENÚ? Inicia sesión'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  // ── Estilos del Modal de Registro/Auth ──
  authModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  authSheet: {
    backgroundColor: C.bg,
    marginHorizontal: 16,
    borderRadius: 24,
    maxHeight: height * 0.85,
    overflow: 'hidden',
    position: 'relative',
  },
  authCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
  },
  authScroll: {
    paddingBottom: 30,
  },
  authHeroWrapper: {
    width: '100%',
    height: 160,
  },
  authHeroImage: {
    width: '100%',
    height: '100%',
  },
  authFormArea: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.forest,
    textAlign: 'center',
    marginBottom: 6,
  },
  authDesc: {
    fontSize: 13,
    color: C.gray,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#E9E9E9',
    borderRadius: 25,
    padding: 3,
    marginBottom: 18,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 22,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: C.forest,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.forest,
  },
  inputsContainer: {
    gap: 16,
    marginBottom: 22,
  },
  inputGroup: {
    width: '100%',
  },
  input: {
    fontSize: 15,
    color: C.forest,
    paddingVertical: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLine: {
    height: 1,
    backgroundColor: '#D1D1D1',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: C.forest,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  switchModeBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchModeText: {
    fontSize: 13,
    color: C.forest,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
