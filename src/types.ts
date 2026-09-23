export type DeliveryStatus = 'NEW' | 'DELIVERED' | 'FAILED';

export interface Delivery {
  id: string;
  name: string;
  address: string;
  arabicAddress?: string;
  phone: string;
  latitude: number;
  longitude: number;
  order: number;
  status?: DeliveryStatus;
  /** Local file URI of the captured (compressed) label photo. Optional for old rows. */
  imagePath?: string;
}