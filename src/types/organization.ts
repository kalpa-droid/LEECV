import { CVData } from './cv';

export type OrgRole = 'owner' | 'admin' | 'editor';
export type OrgMemberStatus = 'pending' | 'active' | 'rejected';

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  max_members: number;
  storage_limit_mb: number;
  created_at?: string;
  isOwner?: boolean;
  memberRole?: OrgRole;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id?: string | null;
  invited_email: string;
  role: OrgRole;
  status: OrgMemberStatus;
  invitation_token?: string;
  created_at?: string;
  joined_at?: string | null;
}

export interface OrgCandidate {
  id: string;
  owner_id: string;
  org_id?: string | null;
  full_name: string;
  title?: string | null;
  vacant?: string | null;
  status: string;
  cv_data?: CVData | null;
  created_at?: string;
  updated_at?: string;
}
