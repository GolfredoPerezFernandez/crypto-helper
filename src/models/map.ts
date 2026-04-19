import type { LocationsProps } from "./location";
import { type Signal } from "@builder.io/qwik";

export interface MarkersProps {
  name: string;
  label: string;
  lat: string;
  lon: string;
}

export interface MapProps {
  location: Signal<LocationsProps | null>;
  markers?: MarkersProps[];
  group?: Signal<string>;
}
