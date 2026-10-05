export interface Profile {
  id: string;
  firebaseUid: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  language: 'en' | 'hi';
  createdAt: string;
  updatedAt: string;
}

export interface ProfileRow {
  id: string;
  firebase_uid: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  language: 'en' | 'hi';
  created_at: string;
  updated_at: string;
}

export function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    language: row.language,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
