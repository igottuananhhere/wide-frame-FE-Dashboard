import type { EntityId } from "../../types/models";

/** Build a generic deep link for focusing any Twin entity in the future 3D module. */
export function focusTwinEntity(entityId: EntityId): string {
  const query = new URLSearchParams({ focus: entityId });
  return `/dashboard/digital-twin?${query.toString()}`;
}
