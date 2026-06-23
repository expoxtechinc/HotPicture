import { Timestamp } from 'firebase/firestore';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  category: string; // e.g. 'News', 'Event', 'TVET', 'Admission'
  publisherName?: string;
  publisherEmail: string;
  createdAt: Timestamp | string | number | any;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'replied' | 'dismissed';
  createdAt: Timestamp | string | number | any;
}
