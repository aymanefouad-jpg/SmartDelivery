import { Delivery } from '../types';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

export const openRouteInMapsApp = async (deliveries: Delivery[]): Promise<void> => {
  if (!deliveries || deliveries.length === 0) {
    Alert.alert('تنبيه', 'لا توجد كوليات لفتحها.');
    return;
  }

  // Sort by order
  const sorted = [...deliveries].sort((a, b) => a.order - b.order);

  // Build addresses list (prefer arabicAddress)
  const addresses = sorted
    .map((d) => (d.arabicAddress || d.address || '').trim())
    .filter((a) => a.length > 1);

  if (addresses.length === 0) {
    Alert.alert('تنبيه', 'لا توجد عناوين صالحة.');
    return;
  }

  console.log('Opening maps with', addresses.length, 'deliveries');

  // If only ONE delivery → simple search
  if (addresses.length === 1) {
    const query = encodeURIComponent(`${addresses[0]}, Morocco`);
    try {
      await Linking.openURL(`geo:0,0?q=${query}`);
      return;
    } catch (e) {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      return;
    }
  }

  // If MULTIPLE deliveries → use Google Maps Directions with waypoints
  // Google Maps URL format:
  // https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...|...
  // Note: Google Maps supports up to 9 waypoints in the URL (10 stops total)

  const MAX_WAYPOINTS = 9;

  if (addresses.length <= MAX_WAYPOINTS + 1) {
    // All deliveries fit in one route
    const origin = encodeURIComponent(`${addresses[0]}, Morocco`);
    const destination = encodeURIComponent(
      `${addresses[addresses.length - 1]}, Morocco`
    );
    const middle = addresses.slice(1, -1).map((a) => `${a}, Morocco`);
    const waypoints =
      middle.length > 0 ? `&waypoints=${encodeURIComponent(middle.join('|'))}` : '';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}`;
    console.log('Opening multi-stop route:', url);
    await Linking.openURL(url);
    return;
  }

  // Too many stops for one URL → open in chunks of MAX_WAYPOINTS + 1
  const chunkSize = MAX_WAYPOINTS + 1;
  for (let i = 0; i < addresses.length; i += chunkSize) {
    const chunk = addresses.slice(i, i + chunkSize);
    if (chunk.length === 1) {
      const query = encodeURIComponent(`${chunk[0]}, Morocco`);
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    } else {
      const origin = encodeURIComponent(`${chunk[0]}, Morocco`);
      const destination = encodeURIComponent(`${chunk[chunk.length - 1]}, Morocco`);
      const middle = chunk.slice(1, -1).map((a) => `${a}, Morocco`);
      const waypoints =
        middle.length > 0 ? `&waypoints=${encodeURIComponent(middle.join('|'))}` : '';
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}`
      );
    }
    if (i + chunkSize < addresses.length) {
      Alert.alert(
        'تنبيه',
        `تم فتح ${Math.min(i + chunkSize, addresses.length)} من ${addresses.length} — افتح الباقي من القائمة.`
      );
      break;
    }
  }
};

// Aliases for backward compatibility
export const openHereWeGoRoute = openRouteInMapsApp;
export const buildHereWeGoUrl = (_deliveries: Delivery[]): string => '';
