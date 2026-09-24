import * as Location from 'expo-location';

/**
 * Gets the user's current GPS location.
 * Returns null if permission denied or error.
 */
export const getCurrentLocation = async (): Promise<{ lat: number; lon: number } | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
    };
  } catch (error) {
    console.error('Failed to get location:', error);
    return null;
  }
};
