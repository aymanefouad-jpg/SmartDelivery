import { Delivery } from '../types';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

export function buildHereWeGoUrl(deliveries: Delivery[]): string {
  const validDeliveries = deliveries.filter(
    (d) => d.latitude !== 0 && d.longitude !== 0 && !isNaN(d.latitude) && !isNaN(d.longitude)
  );

  if (validDeliveries.length === 0) {
    return '';
  }

  const sortedDeliveries = [...validDeliveries].sort((a, b) => a.order - b.order);
  const coordinates = sortedDeliveries
    .map((d) => `${d.latitude},${d.longitude}`)
    .join('/');

  return `https://wego.here.com/r/${coordinates}`;
}

function buildGoogleMapsUrl(deliveries: Delivery[]): string {
  const validDeliveries = deliveries.filter(
    (d) => d.latitude !== 0 && d.longitude !== 0 && !isNaN(d.latitude) && !isNaN(d.longitude)
  );
  if (validDeliveries.length === 0) return '';

  const sorted = [...validDeliveries].sort((a, b) => a.order - b.order);
  const destination = `${sorted[0].latitude},${sorted[0].longitude}`;
  const waypoints = sorted.slice(1).map(d => `${d.latitude},${d.longitude}`).join('|');
  
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }
  return url;
}

function buildWazeUrl(deliveries: Delivery[]): string {
  const validDeliveries = deliveries.filter(
    (d) => d.latitude !== 0 && d.longitude !== 0 && !isNaN(d.latitude) && !isNaN(d.longitude)
  );
  if (validDeliveries.length === 0) return '';

  const sorted = [...validDeliveries].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  return `https://waze.com/ul?ll=${first.latitude},${first.longitude}&navigate=yes`;
}

function buildHereWeGoUrlNew(deliveries: Delivery[]): string {
  return buildHereWeGoUrl(deliveries);
}

function buildPetalMapsUrl(deliveries: Delivery[]): string {
  const validDeliveries = deliveries.filter(
    (d) => d.latitude !== 0 && d.longitude !== 0 && !isNaN(d.latitude) && !isNaN(d.longitude)
  );
  if (validDeliveries.length === 0) return '';

  const sorted = [...validDeliveries].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  return `petalmaps://navigation?destination=${first.latitude},${first.longitude}`;
}

function buildGenericGeoUrl(deliveries: Delivery[]): string {
  const validDeliveries = deliveries.filter(
    (d) => d.latitude !== 0 && d.longitude !== 0 && !isNaN(d.latitude) && !isNaN(d.longitude)
  );
  if (validDeliveries.length === 0) return '';

  const sorted = [...validDeliveries].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  return `geo:${first.latitude},${first.longitude}?q=${first.latitude},${first.longitude}`;
}

async function checkAndOpen(url: string, scheme: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(scheme);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
  } catch (error) {
    console.log(`Cannot open ${scheme}:`, error);
  }
  return false;
}

export async function openRouteInMapsApp(deliveries: Delivery[]): Promise<void> {
  const validDeliveries = deliveries.filter(
    (d) => d.latitude !== 0 && d.longitude !== 0 && !isNaN(d.latitude) && !isNaN(d.longitude)
  );

  if (validDeliveries.length === 0) {
    Alert.alert(
      'خطأ',
      'لا توجد كوليات بصيغة صحيحة لفتح المسار. يرجى إضافة كوليات أولاً.',
      [{ text: 'موافق' }]
    );
    return;
  }

  const apps = [
    { name: 'Google Maps', url: buildGoogleMapsUrl(deliveries), scheme: 'comgooglemaps://' },
    { name: 'Waze', url: buildWazeUrl(deliveries), scheme: 'waze://' },
    { name: 'HERE WeGo', url: buildHereWeGoUrlNew(deliveries), scheme: 'here-location://' },
    { name: 'Petal Maps', url: buildPetalMapsUrl(deliveries), scheme: 'petalmaps://' },
    { name: 'Default Maps', url: buildGenericGeoUrl(deliveries), scheme: 'geo://' },
  ];

  for (const app of apps) {
    if (!app.url) continue;
    const opened = await checkAndOpen(app.url, app.scheme);
    if (opened) return;
  }

  Alert.alert(
    'No maps app found',
    'Please install Google Maps or another navigation app.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Play Store',
        onPress: () => Linking.openURL('market://search?q=maps+navigation'),
      },
    ]
  );
}

export async function openHereWeGoRoute(deliveries: Delivery[]): Promise<void> {
  return openRouteInMapsApp(deliveries);
}