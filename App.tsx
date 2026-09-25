import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  TextInput,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Delivery } from './src/types';
import type { DeliveryStatus } from './src/types';
import {
  processNewDeliveryFromPhoto,
  mockGeocode,
  findCityInAddress,
} from './src/utils/ai';
import { openRouteInMapsApp } from './src/utils/hereWeGo';
import { DeliveryCardMemo } from './src/components/DeliveryCard';
import { CameraScreen } from './src/screens/CameraScreen';
import { ManualInputScreen } from './src/screens/ManualInputScreen';
import { t, setLanguage } from './src/i18n';
import { saveDelivery, getAllDeliveries, deleteDelivery, updateDeliveryOrder, updateDeliveryArabicAddress, updateDeliveryStatus } from './src/database/db';

const primaryDark = '#001F3F';
const accentOrange = '#FF6B00';
const langActiveBg = '#fff2e6';

export default function App() {
  // OPT4: Limit state size — store ONLY small Delivery objects (text fields).
  // Never store full image URIs / bitmaps / OCR strings in state.
  // Images are compressed to URI, passed to OCR, then discarded immediately.
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  // OPT7: Single simple loading flag (no separate isLoading complexity)
  const [processing, setProcessing] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [editingArabicAddress, setEditingArabicAddress] = useState<Delivery | null>(null);
  const [arabicAddressInput, setArabicAddressInput] = useState('');
  const [editingOrder, setEditingOrder] = useState<Delivery | null>(null);
  const [orderInput, setOrderInput] = useState('');
  const [justReturnedFromMaps, setJustReturnedFromMaps] = useState(false);
  const [language, setLanguageState] = useState<'ar' | 'en' | 'fr'>('ar');

  // OPT5: Every useEffect has a cleanup function (isMounted guard)
  useEffect(() => {
    let mounted = true;
    const loadDeliveries = async () => {
      try {
        const stored = await getAllDeliveries();
        if (mounted) {
          setDeliveries(stored);
        }
      } catch {
        // Silent on low-end devices
      }
    };
    loadDeliveries();
    return () => {
      mounted = false;
    };
  }, []);

  // Detect return from Google Maps: remind the user to mirror any
  // in-Maps reorder with the ▲▼ arrows (Maps can't push order back).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && justReturnedFromMaps) {
        // The user returned to the app
        Alert.alert(
          'هل غيّرت ترتيب المحطات في Google Maps؟',
          'إذا نعم، يمكنك تعديل الترتيب يدوياً في التطبيق باستخدام الأسهم ▲▼',
          [
            { text: 'لا', style: 'cancel', onPress: () => setJustReturnedFromMaps(false) },
            {
              text: 'نعم، سأعدل يدوياً',
              onPress: () => {
                setJustReturnedFromMaps(false);
                Alert.alert(
                  'ترتيب يدوي',
                  'استخدم الأسهم ▲▼ على كل كولية لترتيبها كما في Google Maps.'
                );
              }
            },
          ]
        );
      }
    });

    return () => subscription.remove();
  }, [justReturnedFromMaps]);

  const handleLanguageChange = useCallback((lang: 'ar' | 'en' | 'fr') => {
    setLanguageState(lang);
    setLanguage(lang);
  }, []);

  const handleCapture = useCallback(
    async (photoUri: string) => {
      setCameraVisible(false);
      setProcessing(true);
      let uri: string | null = photoUri;
      try {
        const newDelivery = await processNewDeliveryFromPhoto(uri);
        await saveDelivery(newDelivery);
        setDeliveries((prev) => [newDelivery, ...prev]);
      } catch {
        Alert.alert(t('addDelivery'), 'فشل في معالجة الكولية. يرجى المحاولة مرة أخرى.');
      } finally {
        // OPT4: Free image URI reference immediately after OCR — don't keep it
        uri = null;
        photoUri = null as unknown as string;
        setProcessing(false);
      }
    },
    []
  );

  const handleOpenRoute = useCallback(async () => {
    if (deliveries.length === 0) {
      Alert.alert(t('openRoute'), t('noDeliveries'));
      return;
    }
    setJustReturnedFromMaps(true);
    await openRouteInMapsApp(deliveries);
  }, [deliveries]);

  const handleDeleteDelivery = useCallback(async (id: string) => {
    try {
      await deleteDelivery(id);
      setDeliveries((prev) => prev.filter((d) => d.id !== id));
    } catch {
      Alert.alert('خطأ', 'فشل في حذف الكولية.');
    }
  }, []);

  const handleOrderPress = useCallback((delivery: Delivery) => {
    setEditingOrder(delivery);
    setOrderInput(String(delivery.order));
  }, []);

  const handleSaveOrder = useCallback(async () => {
    if (!editingOrder) return;

    const newOrder = parseInt(orderInput, 10);
    const maxOrder = deliveries.length;

    if (isNaN(newOrder) || newOrder < 1 || newOrder > maxOrder) {
      Alert.alert('خطأ', `الرقم يجب أن يكون بين 1 و ${maxOrder}`);
      return;
    }

    try {
      // Sort current deliveries
      const sorted = [...deliveries].sort((a, b) => a.order - b.order);

      // Remove the editing delivery
      const withoutCurrent = sorted.filter((d) => d.id !== editingOrder.id);

      // Insert at new position (index = newOrder - 1)
      withoutCurrent.splice(newOrder - 1, 0, editingOrder);

      // Reassign order numbers
      const reordered = withoutCurrent.map((d, i) => ({ ...d, order: i + 1 }));

      // Save to SQLite
      await updateDeliveryOrder(reordered);
      setDeliveries(reordered);

      // Close modal
      setEditingOrder(null);
      setOrderInput('');
    } catch (error) {
      console.error('Failed to reorder:', error);
      Alert.alert('خطأ', 'فشل في تغيير الترتيب.');
    }
  }, [editingOrder, orderInput, deliveries]);

  const handleCardPress = useCallback(async (delivery: Delivery) => {
    setJustReturnedFromMaps(true);
    await openRouteInMapsApp([delivery]);
  }, []);

  const handleEditDelivery = useCallback((delivery: Delivery) => {
    setEditingDelivery(delivery);
  }, []);

  const handleStatusChange = useCallback(async (id: string, status: DeliveryStatus) => {
    try {
      await updateDeliveryStatus(id, status);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status } : d))
      );

      // If a delivery was marked as DELIVERED or FAILED, and the user taps "فتح المسار",
      // the route will automatically include the next pending delivery.
      // No action needed here, but we log for debugging:
      if (status === 'DELIVERED' || status === 'FAILED') {
        console.log(`Delivery ${id} marked as ${status}. Next route opening will include the next pending delivery.`);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('خطأ', 'فشل في حفظ حالة التسليم.');
    }
  }, []);

  const handleEditArabicAddress = useCallback((delivery: Delivery) => {
    setEditingArabicAddress(delivery);
    setArabicAddressInput(delivery.arabicAddress || '');
  }, []);

  const handleSaveArabicAddress = useCallback(() => {
    if (editingArabicAddress) {
      const id = editingArabicAddress.id;
      const value = arabicAddressInput;
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, arabicAddress: value }
            : d
        )
      );
      // Persist to SQLite so it survives app reload (fire-and-forget)
      updateDeliveryArabicAddress(id, value).catch(() => {});
      setEditingArabicAddress(null);
      setArabicAddressInput('');
    }
  }, [editingArabicAddress, arabicAddressInput]);

  const handleEditSave = useCallback(
    async (data: { name: string; address: string; phone: string }) => {
      if (!editingDelivery) return;
      setEditingDelivery(null);
      setProcessing(true);
      try {
        const cityResult = findCityInAddress(data.address);
        let coords: { lat: number; lon: number };
        if (cityResult.city !== 'Unknown') {
          coords = { lat: cityResult.lat, lon: cityResult.lon };
        } else {
          coords = await mockGeocode(data.address);
        }
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === editingDelivery.id
              ? { ...d, name: data.name, address: data.address, phone: data.phone, latitude: coords.lat, longitude: coords.lon }
              : d
          )
        );
      } catch {
        Alert.alert('خطأ', 'فشل في تعديل الكولية. يرجى المحاولة مرة أخرى.');
      } finally {
        setProcessing(false);
      }
    },
    [editingDelivery]
  );

  const handleManualInputSave = useCallback(
    async (data: { name: string; address: string; phone: string }) => {
      try {
        const detected = findCityInAddress(data.address);
        const newDelivery: Delivery = {
          id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: data.name || 'غير معروف',
          address: data.address || 'غير معروف',
          phone: data.phone || 'غير معروف',
          latitude: detected.lat,
          longitude: detected.lon,
          order: 0,
        };
        await saveDelivery(newDelivery);
        setDeliveries((prev) => [newDelivery, ...prev]);
        setManualInputVisible(false);
      } catch {
        Alert.alert('خطأ', 'فشل في حفظ البيانات.');
      }
    },
    []
  );

  const renderDelivery = useCallback(
    ({ item }: { item: Delivery }) => (
      <DeliveryCardMemo 
        delivery={item} 
        onDelete={handleDeleteDelivery}
        onPress={handleCardPress}
        onEdit={handleEditDelivery}
        onEditArabicAddress={handleEditArabicAddress}
        onStatusChange={handleStatusChange}
        onOrderPress={handleOrderPress}
      />
    ),
    [handleDeleteDelivery, handleCardPress, handleEditDelivery, handleEditArabicAddress, handleStatusChange, handleOrderPress]
  );

  const langButton = (lang: 'ar' | 'en' | 'fr', label: string) => (
    <TouchableOpacity
      style={[
        styles.langButton,
        language === lang && styles.langButtonActive,
      ]}
      onPress={() => handleLanguageChange(lang)}
    >
      <Text style={[styles.langButtonText, language === lang && styles.langButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const pendingCount = deliveries.filter(
    (d) => d.status !== 'DELIVERED' && d.status !== 'FAILED'
  ).length;
  const deliveredCount = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const failedCount = deliveries.filter((d) => d.status === 'FAILED').length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>AFD Delivery</Text>
        <View style={styles.langContainer}>
          {langButton('ar', 'AR')}
          {langButton('en', 'EN')}
          {langButton('fr', 'FR')}
        </View>
      </View>
      <Text style={styles.subtitle}>{t('subtitle')}</Text>
      <Text style={styles.countText}>{deliveries.length} {t('deliveries')}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Text style={styles.statText}>⏳ {pendingCount} قيد التسليم</Text>
        </View>
        <View style={[styles.statBadge, styles.statDelivered]}>
          <Text style={styles.statText}>✓ {deliveredCount} تم</Text>
        </View>
        <View style={[styles.statBadge, styles.statFailed]}>
          <Text style={styles.statText}>✗ {failedCount} فشل</Text>
        </View>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setCameraVisible(true)} disabled={processing}>
          <Text style={styles.buttonText}>{t('addDelivery')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualInputVisible(true)} disabled={processing}>
          <Text style={styles.buttonText}>إدخال يدوي</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenRoute} disabled={deliveries.length === 0}>
          <Text style={styles.buttonText}>{t('openRoute')}</Text>
        </TouchableOpacity>
      </View>
      {processing && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={accentOrange} /></View>}
      <FlatList
        data={[...deliveries].sort((a, b) => a.order - b.order)}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noDeliveries')}</Text>
          </View>
        }
      />
      {/* OPT3: Unmount screens when not in use — conditional rendering destroys
          the camera when closed, freeing memory on 2GB devices */}
      {cameraVisible && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setCameraVisible(false)}>
          <CameraScreen onCapture={handleCapture} onCancel={() => setCameraVisible(false)} processing={processing} />
        </Modal>
      )}
      {manualInputVisible && (
        <Modal visible={true} animationType="slide" transparent={true} presentationStyle="pageSheet" onRequestClose={() => setManualInputVisible(false)}>
          <ManualInputScreen onSave={handleManualInputSave} onCancel={() => setManualInputVisible(false)} />
        </Modal>
      )}
      {editingDelivery !== null && (
        <Modal visible={true} animationType="slide" transparent={true} presentationStyle="pageSheet" onRequestClose={() => setEditingDelivery(null)}>
          <ManualInputScreen
            initialData={editingDelivery}
            onSave={handleEditSave}
            onCancel={() => setEditingDelivery(null)}
          />
        </Modal>
      )}
      {/* Arabic address input — conditionally mounted like the other modals (OPT3) */}
      {editingArabicAddress !== null && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditingArabicAddress(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>إضافة عنوان عربي</Text>
              <TextInput
                style={styles.modalInput}
                value={arabicAddressInput}
                onChangeText={setArabicAddressInput}
                placeholder="مثال: فرساي كزناية طنجة"
                placeholderTextColor="#999"
                multiline
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditingArabicAddress(null)}
                >
                  <Text style={styles.modalButtonText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveArabicAddress}
                >
                  <Text style={styles.modalButtonText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* Order change modal — conditionally mounted like the other modals (OPT3) */}
      {editingOrder !== null && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditingOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>تغيير ترتيب الكولية</Text>
              <Text style={styles.modalSubtitle}>
                {editingOrder?.name} - {editingOrder?.address}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={orderInput}
                onChangeText={setOrderInput}
                keyboardType="number-pad"
                placeholder="أدخل الرقم الجديد (1، 2، 3...)"
                placeholderTextColor="#999"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditingOrder(null)}
                >
                  <Text style={styles.modalButtonText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveOrder}
                >
                  <Text style={styles.modalButtonText}>حفظ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: primaryDark,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  langContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  langButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  langButtonActive: {
    backgroundColor: accentOrange,
    borderColor: accentOrange,
  },
  langButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  langButtonTextActive: {
    color: primaryDark,
  },
  subtitle: {
    fontSize: 16,
    color: '#546e7a',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  countText: {
    fontSize: 14,
    color: '#78909c',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: accentOrange,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: accentOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e7ef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 100,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#90a4ae',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 15,
    textAlign: 'right',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    textAlign: 'right',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
    minHeight: 60,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  saveButton: {
    backgroundColor: '#FF6B00',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statDelivered: { backgroundColor: '#E8F5E9' },
  statFailed: { backgroundColor: '#FFEBEE' },
  statText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
});