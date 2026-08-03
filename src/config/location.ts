export interface LocationDef {
  city: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

// No, this isn't my exact location, you cheeky rascal.
export const LOCATION: LocationDef = {
  city: 'Beauvais',
  latitude: 49.4295,
  longitude: 2.0807,
  timeZone: 'Europe/Paris',
};
