declare module 'country-city-multilanguage' {
  export interface City {
    label: string;
    latitude: number;
    longitude: number;
  }
  export function getCityByLabel(countryCode: string): City[] | null;
}