import { Timestamp } from 'firebase/firestore';

export interface Picture {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  uploaderId: string;
  uploaderName: string;
  uploaderEmail: string;
  uploaderRole: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp | string | number | any;
  approvedBy?: string;
  approvedAt?: Timestamp | string | number | any;
  likes: number;
  category: string;
}

export interface Like {
  id: string;
  userId: string;
  pictureId: string;
  createdAt: Timestamp | string | number | any;
}
