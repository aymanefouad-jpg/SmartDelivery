import { Delivery } from '../types';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

export const openRouteInMapsApp = async (deliveries: Delivery[]): Promise<void> => {
  if (!deliveries || deliveries.length === 0) {
    Alert.alert('تنبيه', 'لا توجد كوليات لفتحها.');
    return;
  }

  const delivery = deliveries[0];
  const address = delivery.arabicAddress || delivery.address || '';
  const name = delivery.name || '';

  if (address.trim().length < 2) {
    Alert.alert('تنبيه', 'لا يوجد عنوان صالح لفتحه.');
    return;
  }

  const query = `${address}, ${name}, Morocco`.replace(/\s+/g, ' ').trim();
  const encodedQuery = encodeURIComponent(query);

  console.log('Opening maps with query:', query);

  // Try native URLs first
  const nativeApps = [
    { name: 'Google Maps', url: `geo:0,0?q=${encodedQuery}` },
    { name: 'Waze', url: `waze://?q=${encodedQuery}&navigate=yes` },
    { name: 'Petal Maps', url: `petalmaps://search?q=${encodedQuery}` },
  ];

  for (const app of nativeApps) {
    try {
      const canOpen = await Linking.canOpenURL(app.url);
      if (canOpen) {
        console.log('Opening:', app.name);
        await Linking.openURL(app.url);
        return;
      }
    } catch (e) {
      console.log(app.name, 'failed:', e);
    }
  }

  // Fallback: web URLs
  const webApps = [
    { name: 'Google Maps Web', url: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}` },
    { name: 'Waze Web', url: `https://waze.com/ul?q=${encodedQuery}&navigate=yes` },
  ];

  for (const app of webApps) {
    try {
      const canOpen = await Linking.canOpenURL(app.url);
      if (canOpen) {
        console.log('Opening web:', app.name);
        await Linking.openURL(app.url);
        return;
      }
    } catch (e) {
      console.log(app.name, 'web failed:', e);
    }
  }

  Alert.alert('خطأ', 'لا يوجد تطبيق خرائط مثبت. يرجى تثبيت Google Maps أو Waze.');
};

// Aliases for backward compatibility
export const openHereWeGoRoute = openRouteInMapsApp;
export const buildHereWeGoUrl = (_deliveries: Delivery[]): string => '';
