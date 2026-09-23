export interface Delivery {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  order: number;
  /** Local file URI of the captured (compressed) label photo. Optional for old rows. */
  imagePath?: string;
}