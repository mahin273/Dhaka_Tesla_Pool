export enum DropoffOrder {
  DROP_A_THEN_B = 'DROP_A_THEN_B',
  DROP_B_THEN_A = 'DROP_B_THEN_A',
}

export interface CompatibilityResult {
  compatible: boolean;
  pickupDistanceKm: number;
  bestOrder?: DropoffOrder;
  detourKm?: number;
  directDistanceAKm?: number;
  directDistanceBKm?: number;
  reason: string;
}
