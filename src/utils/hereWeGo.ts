import { Delivery } from '../types';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

/**
 * Opens Google Maps with ALL delivery addresses as waypoints.
 * Google Maps will use the user's current location as origin and calculate the best route.
 */
export const openRouteInMapsApp = async (deliveries: Delivery[]): Promise<void> => {
  if (!deliveries || deliveries.length === 0) {
    Alert.alert('تنبيه', 'لا توجد كوليات لفتحها.');
    return;
  }

  // Filter out DELIVERED and FAILED
  const pending = deliveries.filter(
    (d) => d.status !== 'DELIVERED' && d.status !== 'FAILED'
  );

  if (pending.length === 0) {
    Alert.alert('تم!', 'كل الكوليات تم تسليمها أو فشلت.');
    return;
  }

  // Use the app's current order (as displayed in the list)
  const sorted = [...pending].sort((a, b) => a.order - b.order);

  // Take up to 10 stops (Google Maps limit)
  const batch = sorted.slice(0, 10);

  // Build addresses (prefer Arabic address)
  const addresses = batch
    .map((d) => (d.arabicAddress || d.address || '').trim())
    .filter((a) => a.length > 1);

  if (addresses.length === 0) {
    Alert.alert('تنبيه', 'لا توجد عناوين صالحة.');
    return;
  }

  console.log(`Opening Google Maps with ${addresses.length} stops`);

  // Single delivery: simple search
  if (addresses.length === 1) {
    const query = encodeURIComponent(`${addresses[0]}, Morocco`);
    try {
      await Linking.openURL(`geo:0,0?q=${query}`);
    } catch (e) {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
    return;
  }

  // Multiple stops: open in Google Maps Directions
  // ORIGIN = empty → Google Maps uses the user's current location
  // DESTINATION = last address
  // WAYPOINTS = all other addresses (in the order shown in the app)
  const destination = encodeURIComponent(`${addresses[addresses.length - 1]}, Morocco`);
  const waypoints = addresses
    .slice(0, -1)
    .map((a) => encodeURIComponent(`${a}, Morocco`))
    .join('|');

  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }

  console.log('Google Maps URL:', url);

  try {
    await Linking.openURL(url);
  } catch (e) {
    console.error('Failed to open Google Maps:', e);
    Alert.alert('خطأ', 'فشل في فتح Google Maps.');
  }
};

// Aliases for backward compatibility
export const openHereWeGoRoute = openRouteInMapsApp;
export const buildHereWeGoUrl = (_deliveries: Delivery[]): string => '';
