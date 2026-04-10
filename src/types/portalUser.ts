export type PortalUserStatus = 'pending' | 'active' | 'suspended';

export interface PortalUser {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  role: string;
  status: PortalUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
