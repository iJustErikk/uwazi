/* eslint-disable */
/**AUTO-GENERATED. RUN yarn emit-types to update.*/

import { ObjectIdType } from 'api/common.v2/database/schemas/commonTypes';

export interface EntityPermissionsDBOType {
  _id?: ObjectIdType;
  sharedId: string;
  permissions: PermissionType[];
}

export type PermissionType = RestrictedPermissionType | PublicPermissionType;

export interface PublicPermissionType {
  refId: 'public';
  type: 'public';
  level: 'public';
}

export interface RestrictedPermissionType {
  refId: ObjectIdType;
  type: 'user' | 'group';
  level: 'read' | 'write';
}
