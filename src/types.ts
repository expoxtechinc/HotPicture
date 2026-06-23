import { Timestamp } from 'firebase/firestore';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string; // Optional embedded YouTube or video URL
  mediaType?: 'text' | 'image' | 'video'; // Decides rendering theater
  category: string; // e.g. 'News', 'Event', 'TVET', 'Admission', 'Gallery'
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

export interface StudentRecord {
  id: string;
  fullName: string;
  email: string;
  parentPhone: string;
  gradeOrTrack: string; // e.g. 'Nursery', 'S.S. Science', 'Tailoring', 'Computer Science'
  status: 'pending_requirements' | 'enrolled' | 'completed' | 'withdrawn';
  registrationFeesPaid: number;
  tuitionFeesTotal: number;
  academicTerm: string; // e.g. '2026/2027 Term A'
  createdAt: Timestamp | string | number | any;
}
