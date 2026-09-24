import { Delivery } from '../types';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

const ROUTE_BATCH_SIZE = 5; // Only open 5 deliveries at a time

export const openRouteInMapsApp = async (deliveries: Delivery[]): Promise<void> => {
  if (!deliveries || deliveries.length === 0) {
    Alert.alert('تنبيه', 'لا توجد كوليات لفتحها.');
    return;
  }

  // Filter out DELIVERED and FAILED deliveries
  const pendingDeliveries = deliveries.filter(
    (d) => d.status !== 'DELIVERED' && d.status !== 'FAILED'
  );

  if (pendingDeliveries.length === 0) {
    Alert.alert('تم!', 'كل الكوليات تم تسليمها أو فشلت.');
    return;
  }

  // Sort by order
  const sorted = [...pendingDeliveries].sort((a, b) => a.order - b.order);

  // Take the first N deliveries only
  const batch = sorted.slice(0, ROUTE_BATCH_SIZE);

  // Build addresses list
  const addresses = batch
    .map((d) => (d.arabicAddress || d.address || '').trim())
    .filter((a) => a.length > 1);

  if (addresses.length === 0) {
    Alert.alert('تنبيه', 'لا توجد عناوين صالحة.');
    return;
  }

  console.log(`Opening route for ${addresses.length} deliveries (of ${pendingDeliveries.length} pending)`);

  // Single delivery
  if (addresses.length === 1) {
    const query = encodeURIComponent(`${addresses[0]}, Morocco`);
    try {
      await Linking.openURL(`geo:0,0?q=${query}`);
    } catch (e) {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
    return;
  }

  // Multi-stop route (up to ROUTE_BATCH_SIZE)
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
    await Linking.openURL(url);
  }
};

const openSingleRoute = async (addresses: string[]) => {
  if (addresses.length === 1) {
    const query = encodeURIComponent(`${addresses[0]}, Morocco`);
    try {
      await Linking.openURL(`geo:0,0?q=${query}`);
    } catch (e) {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
    return;
  }
  const destination = encodeURIComponent(`${addresses[addresses.length - 1]}, Morocco`);
  const waypoints = addresses
    .slice(0, -1)
    .map((a) => encodeURIComponent(`${a}, Morocco`))
    .join('|');
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  try {
    await Linking.openURL(url);
  } catch (e) {
    await Linking.openURL(url);
  }
};

export const openHereWeGoRoute = openRouteInMapsApp;
export const buildHereWeGoUrl = (_deliveries: Delivery[]): string => '';
