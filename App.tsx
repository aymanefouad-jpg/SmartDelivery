import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { Delivery } from './src/types';
import {
  processNewDeliveryFromPhoto,
  mockOptimizeRoute,
  mockGeocode,
} from './src/utils/ai';
import { openRouteInMapsApp } from './src/utils/hereWeGo';
import { DeliveryCard } from './src/components/DeliveryCard';
import { CameraScreen } from './src/screens/CameraScreen';
import { ManualInputScreen } from './src/screens/ManualInputScreen';
import { t, setLanguage } from './src/i18n';

const primaryDark = '#001F3F';
const accentOrange = '#FF6B00';
const langActiveBg = '#fff2e6';

export default function App() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [processing, setProcessing] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [language, setLanguageState] = useState<'ar' | 'en' | 'fr'>('ar');

  const handleLanguageChange = useCallback((lang: 'ar' | 'en' | 'fr') => {
    setLanguageState(lang);
    setLanguage(lang);
  }, []);

  const handleCapture = useCallback(
    async (photoUri: string) => {
      setCameraVisible(false);
      setProcessing(true);
      try {
        const newDelivery = await processNewDeliveryFromPhoto(photoUri);
        setDeliveries((prev) => [...prev, newDelivery]);
      } catch (error) {
        console.error('Error processing delivery:', error);
        Alert.alert(t('addDelivery'), 'فشل في معالجة الكولية. يرجى المحاولة مرة أخرى.');
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const handleOptimize = useCallback(async () => {
    if (deliveries.length === 0) {
      Alert.alert(t('optimize'), t('noDeliveries'));
      return;
    }
    setProcessing(true);
    try {
      const optimized = await mockOptimizeRoute(deliveries);
      setDeliveries(optimized);
    } catch (error) {
      console.error('Error optimizing route:', error);
      Alert.alert(t('optimize'), 'فشل في الترتيب. يرجى المحاولة مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  }, [deliveries]);

  const handleOpenRoute = useCallback(async () => {
    if (deliveries.length === 0) {
      Alert.alert(t('openRoute'), t('noDeliveries'));
      return;
    }
    await openRouteInMapsApp(deliveries);
  }, [deliveries]);

  const handleDeleteDelivery = useCallback((id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleCardPress = useCallback(async (delivery: Delivery) => {
    await openRouteInMapsApp([delivery]);
  }, []);

  const handleManualInputSave = useCallback(
    async (data: { name: string; address: string; phone: string }) => {
      setManualInputVisible(false);
      setProcessing(true);
      try {
        const coords = await mockGeocode(data.address);
        const newDelivery: Delivery = {
          id: `delivery_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: data.name,
          address: data.address,
          phone: data.phone,
          latitude: coords.lat,
          longitude: coords.lon,
          order: 0,
        };
        setDeliveries((prev) => [...prev, newDelivery]);
      } catch (error) {
        console.error('Error adding manual delivery:', error);
        Alert.alert('خطأ', 'فشل في إضافة الكولية. يرجى المحاولة مرة أخرى.');
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const renderDelivery = useCallback(
    ({ item }: { item: Delivery }) => (
      <DeliveryCard 
        delivery={item} 
        onDelete={handleDeleteDelivery}
        onPress={handleCardPress}
      />
    ),
    [handleDeleteDelivery, handleCardPress]
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={primaryDark} />
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
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setCameraVisible(true)} disabled={processing}>
          <Text style={styles.buttonText}>{t('addDelivery')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualInputVisible(true)} disabled={processing}>
          <Text style={styles.buttonText}>إدخال يدوي</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleOptimize} disabled={processing || deliveries.length === 0}>
          <Text style={styles.buttonText}>{t('optimize')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenRoute} disabled={deliveries.length === 0}>
          <Text style={styles.buttonText}>{t('openRoute')}</Text>
        </TouchableOpacity>
      </View>
      {processing && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={accentOrange} /></View>}
      <FlatList
        data={deliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noDeliveries')}</Text>
          </View>
        }
      />
      <Modal visible={cameraVisible} animationType="slide" transparent={true}>
        <CameraScreen onCapture={handleCapture} onCancel={() => setCameraVisible(false)} />
      </Modal>
      <Modal visible={manualInputVisible} animationType="slide" transparent={true} presentationStyle="pageSheet">
        <ManualInputScreen onSave={handleManualInputSave} onCancel={() => setManualInputVisible(false)} />
      </Modal>
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
});