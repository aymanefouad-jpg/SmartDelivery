import { Delivery } from '../types';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

export const openRouteInMapsApp = async (deliveries: Delivery[]): Promise<void> => {
  if (!deliveries || deliveries.length === 0) {
    Alert.alert('تنبيه', 'لا توجد كوليات لفتحها.');
    return;
  }

  const sorted = [...deliveries].sort((a, b) => a.order - b.order);
  const addresses = sorted
    .map((d) => (d.arabicAddress || d.address || '').trim())
    .filter((a) => a.length > 1);

  if (addresses.length === 0) {
    Alert.alert('تنبيه', 'لا توجد عناوين صالحة.');
    return;
  }

  console.log('Opening maps with', addresses.length, 'deliveries');
  const MAX_WAYPOINTS = 9;

  if (addresses.length === 1) {
    const query = encodeURIComponent(`${addresses[0]}, Morocco`);
    try {
      await Linking.openURL(`geo:0,0?q=${query}`);
    } catch (e) {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    }
    return;
  }

  if (addresses.length <= MAX_WAYPOINTS + 1) {
    // origin is EMPTY → Google Maps uses the user's current location
    const destination = encodeURIComponent(`${addresses[addresses.length - 1]}, Morocco`);
    const waypoints = addresses
      .slice(0, -1)
      .map((a) => encodeURIComponent(`${a}, Morocco`))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    console.log('Multi-stop URL (from current location):', url);
    try {
      await Linking.openURL(url);
      return;
    } catch (e) {
      console.error('Failed to open Google Maps:', e);
    }
  } else {
    const groups: string[][] = [];
    for (let i = 0; i < addresses.length; i += MAX_WAYPOINTS + 1) {
      groups.push(addresses.slice(i, i + MAX_WAYPOINTS + 1));
    }
    Alert.alert(
      'تنبيه',
      `لديك ${addresses.length} كولية. سيتم تقسيمها إلى ${groups.length} مسارات.`,
      [
        { text: 'فتح المسار الأول', onPress: async () => { await openSingleRoute(groups[0]); } },
        { text: 'إلغاء', style: 'cancel' },
      ]
    );
    return;
  }

  await openSingleRoute([addresses[0]]);
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
