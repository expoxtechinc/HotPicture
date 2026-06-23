import { useEffect, useState } from 'react';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  School,
  BookOpen, 
  Award, 
  Clock, 
  Phone, 
  Mail, 
  Search, 
  User as UserIcon, 
  LogOut, 
  Sparkles, 
  MapPin, 
  AlertCircle,
  Megaphone,
  Briefcase,
  Star,
  CheckCircle,
  LogIn,
  ChevronRight,
  ShieldCheck,
  Video,
  Image as ImageIcon,
  LayoutDashboard,
  Inbox,
  PenTool,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

import { Announcement, Inquiry } from './types';
import { AcademicSelector } from './components/AcademicSelector';
import { TvetTracksGrid } from './components/TvetTracksGrid';
import { InquiryForm } from './components/InquiryForm';
import { AnnouncementForm } from './components/AnnouncementForm';
import { AdminInbox } from './components/AdminInbox';
import { AuthModal } from './components/AuthModal';
import { AdminAnalytics } from './components/AdminAnalytics';
import { MediaGallery } from './components/MediaGallery';

// Seed stories so the application displays rich educational info even when database has no postings yet
const FALLBACK_BUZZ_STORIES: Announcement[] = [
  {
    id: 'seed-announcement-admissions',
    title: 'Admissions Open: 2026/2027 Academic Year Registration',
    content: 'Multee International School System is formally receiving registrations starting from nursery child care pathways through senior secondary science and humanities streams. We are dedicated to delivering affordable, top-quality instructions. High secondary standards are fully WAEC/WASSCE approved. Visit the admissions block today or submit a message below.',
    category: 'Admission',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60',
    publisherName: 'Office of the Registrar',
    publisherEmail: 'luckyglobalnews@gmail.com',
    createdAt: new Date('2026-06-20T08:00:00Z')
  },
  {
    id: 'seed-announcement-tvet',
    title: 'Saturday Practical Labs Added to 9 mos. T-VET Tracks',
    content: 'In our commitment to workforce readiness, we are thrilled to announce that our 6 professional tracks (Tailoring, Hair Dressing, Beauty Care, Journalism, Computer Science, and Pastry Arts) have received state-of-the-art laboratory upgrades. This Saturday practical lab structure allows students to gain high-intensity hands-on experience before graduation and regional certifications.',
    category: 'TVET',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60',
    publisherName: 'Vocational Coordinator',
    publisherEmail: 'luckyglobalnews@gmail.com',
    createdAt: new Date('2026-06-18T10:30:00Z')
  },
  {
    id: 'seed-announcement-youtube-tour',
    title: 'Campus Virtual Tour & Principal Welcome Message',
    content: 'Take a virtual walkthrough of we classrooms, tailoring laboratories, computer labs, and cooking studios located in Greenland Community, Johnsonville. View our current quizbowl trophies and listen to the principal share academic objectives for this coming term.',
    category: 'Video',
    mediaType: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Standard fallback link parsed nicely
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
    publisherName: 'Admissions Office',
    publisherEmail: 'luckyglobalnews@gmail.com',
    createdAt: new Date('2026-06-16T12:00:00Z')
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active Tab navigation system for sections
  const [activeTab, setActiveTab] = useState<'home' | 'academics' | 'tvet' | 'buzz' | 'contact' | 'admin'>('home');

  // Sub Tab selections for specific dashboard and news hubs
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'publish' | 'inbound'>('dashboard');
  const [buzzSubTab, setBuzzSubTab] = useState<'news' | 'gallery'>('news');

  // School announcements lists
  const [dbAnnouncements, setDbAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  
  // Search parameters for Multee Buzz
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Parent queries tracking
  const [rawInquiries, setRawInquiries] = useState<Inquiry[]>([]);
  const [unreadInquiriesCount, setUnreadInquiriesCount] = useState(0);

  // Monitor Auth State Changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Authenticate authorized school email as master principal
        const holdsAdminPrivileges = currentUser.email === 'luckyglobalnews@gmail.com';
        setIsAdmin(holdsAdminPrivileges);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Sync inquiries array for local counters
  useEffect(() => {
    if (!isAdmin) return;
    const qInq = query(collection(db, 'inquiries'));
    const unsub = onSnapshot(qInq, (snapshot) => {
      const list: Inquiry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          email: data.email || '',
          subject: data.subject || '',
          message: data.message || '',
          status: data.status || 'unread',
          createdAt: data.createdAt
        });
      });
      setRawInquiries(list);
      setUnreadInquiriesCount(list.filter(i => i.status === 'unread').length);
    });
    return () => unsub();
  }, [isAdmin]);

  // Sync announcements collection from Firestore reactively
  useEffect(() => {
    setAnnouncementsLoading(true);
    const annQuery = query(collection(db, 'announcements'));
    const unsub = onSnapshot(
      annQuery,
      (snapshot) => {
        const list: Announcement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || '',
            content: data.content || '',
            category: data.category || 'News',
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            mediaType: data.mediaType || 'text',
            publisherName: data.publisherName || 'Admissions',
            publisherEmail: data.publisherEmail || '',
            createdAt: data.createdAt,
          });
        });

        // Date sorting descending
        list.sort((a, b) => {
          const aTime = a.createdAt?.seconds 
            ? a.createdAt.seconds 
            : a.createdAt instanceof Date 
              ? a.createdAt.getTime() / 1000 
              : 0;
          const bTime = b.createdAt?.seconds 
            ? b.createdAt.seconds 
            : b.createdAt instanceof Date 
              ? b.createdAt.getTime() / 1000 
              : 0;
          return bTime - aTime;
        });

        setDbAnnouncements(list);
        setAnnouncementsLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'announcements');
        setAnnouncementsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleSignOutSession = async () => {
    try {
      await signOut(auth);
      setActiveTab('home');
    } catch (err) {
      console.error('Sign Out Failed:', err);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Delete this announcement from the live school feed?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setDbAnnouncements(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      alert('Unresolved permissions lock.');
      try {
        handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
      } catch (log) {}
    }
  };

  // Combine live database news updates with seed fallbacks so there is rich preset styling
  const getUnifiedAnnouncements = () => {
    const list = [...dbAnnouncements];
    FALLBACK_BUZZ_STORIES.forEach((fallback) => {
      // Avoid duplicating the seeds if there are identically titled entries
      if (!list.some(item => item.title.toLowerCase() === fallback.title.toLowerCase())) {
        list.push(fallback);
      }
    });

    // Final sorting matching academic timing
    return list.sort((a, b) => {
      const getVal = (x: any) => {
        if (x?.seconds) return x.seconds * 1000;
        if (x instanceof Date) return x.getTime();
        if (typeof x === 'string') return new Date(x).getTime();
        return 0;
      };
      return getVal(b.createdAt) - getVal(a.createdAt);
    });
  };

  const unifiedNewsFeed = getUnifiedAnnouncements();

  // Perform search criteria match
  const filteredBuzz = unifiedNewsFeed.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.publisherName && item.publisherName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // We categorize media formats as separate components in the gallery view tab
    const isStandardDisplay = item.category !== 'Gallery' && item.category !== 'Video';
    const matchesCategory = selectedCategory === 'All' ? isStandardDisplay : item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans selection:bg-blue-900 selection:text-white" id="main-app-container">
      
      {/* Top micro-bar: quick contact and accreditation banner */}
      <div className="bg-gradient-to-r from-slate-950 to-blue-950 text-white text-[11px] py-2 px-4 shadow-sm relative z-30 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              Greenland Community, Johnsonville, Liberia
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              +231 77 782 9659
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              multeeschoolsystem@gmail.com
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[9.5px] uppercase font-bold text-amber-400 bg-white/10 px-2 py-0.5 rounded-sm">
              Approved WAEC/WASSCE Code
            </span>
            <span className="text-slate-300 text-[10.5px]">Admission Year: 2026/2027</span>
          </div>
        </div>
      </div>

      {/* Main navigation Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/60 py-4 px-6 relative z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Crest logo and Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveTab('home'); setBuzzSubTab('news'); }}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center text-amber-400 border border-slate-900 shadow-md">
              <School className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black font-serif tracking-tight text-slate-950 uppercase leading-none">
                  Multee International
                </h1>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-105 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  MISS
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium tracking-wide mt-1.5">
                Private School System &amp; T-VET Vocational Center
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
            {[
              { id: 'home', label: 'Overview' },
              { id: 'academics', label: 'Academics (K-12)' },
              { id: 'tvet', label: 'T-VET Tracks' },
              { id: 'buzz', label: 'School Buzz & Media' },
              { id: 'contact', label: 'Submit Inquiry' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'buzz') {
                    setBuzzSubTab('news');
                  }
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Admin entry point badge */}
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setAdminSubTab('dashboard');
                }}
                className={`relative px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-amber-600 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                <span>🛡️ Admin Portal</span>
                {unreadInquiriesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-650 text-white font-extrabold text-[8.5px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce border border-white">
                    {unreadInquiriesCount}
                  </span>
                )}
              </button>
            )}

            {/* User Session login block */}
            {authLoading ? (
              <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin shrink-0 ml-2" />
            ) : user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-100 shrink-0">
                <span className="text-[10px] font-mono text-slate-650 hidden sm:block bg-slate-50 border border-slate-205/60 px-2 py-1 rounded">
                  {user.email === 'luckyglobalnews@gmail.com' ? 'Verified Principal' : user.displayName || user.email?.split('@')[0]}
                </span>
                
                <button
                  onClick={handleSignOutSession}
                  title="Sign Out Session"
                  className="p-1.5 hover:bg-rose-50 text-slate-650 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Family Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main portal stage container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-12">
        
        {/* Banner notifying if Google Admin view is active */}
        {isAdmin && activeTab !== 'admin' && (
          <div className="bg-amber-50/80 backdrop-blur-3xs border border-amber-200 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-3xs font-sans">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-150 text-amber-900 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Administrator Authenticated</span>
                <p className="text-xs text-slate-700 font-medium">
                  Signed in as master of school systems. Access active pupil ledger, manage TVET balances, or publish video assets.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setAdminSubTab('dashboard');
                }}
                className="px-4.5 py-2 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-black transition-all cursor-pointer text-center text-xs shrink-0"
              >
                Open Admin Dashboard
              </button>
              <button
                onClick={handleSignOutSession}
                className="px-3 py-2 text-rose-700 hover:bg-rose-100/50 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center text-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* PAGE SECTION: HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-12">
            
            {/* Academic Hero block */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white grid grid-cols-1 lg:grid-cols-12 shadow-md">
              
              {/* Left Column Information */}
              <div className="lg:col-span-7 p-8 md:p-12 lg:p-16 flex flex-col justify-center space-y-6 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 text-xs font-semibold rounded-full uppercase tracking-widest w-fit border border-amber-400/10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Educating Tomorrow&apos;s Workforce Today
                </div>

                <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-black tracking-tight leading-tight uppercase">
                  Unlocking Potential Through <span className="text-amber-400 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Quality</span> Instruction.
                </h2>

                <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-xl">
                  Multee International School System (MISS) is Liberia&apos;s premier private academic and vocational training landmark based in Johnsonville. Operating comprehensive Early Childhood through Senior High tiers alongside accredited 9-month professional TVET tracks, we craft a pathway to immediate employment and higher learning.
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('academics')}
                    className="px-6 py-3 bg-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Explore Academic Divisions
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTab('tvet')}
                    className="px-6 py-3 bg-white/10 text-white hover:bg-white/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/15"
                  >
                    View T-VET Skill Tracks
                  </button>
                </div>
              </div>

              {/* Right Column Visual Artwork overlay */}
              <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full overflow-hidden flex items-center justify-center p-8 bg-slate-950/40 border-l lg:border-l border-white/10">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-slate-950 to-slate-950 opacity-95 z-0"></div>
                
                {/* Stats Widget overlay */}
                <div className="relative z-10 w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-[10.5px] font-semibold text-slate-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Ministry Registered
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase py-0.5 px-2 bg-amber-500/10 rounded">Grade A Rating</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5 text-center p-3.5 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-2xl font-black text-amber-400 block font-serif">K-12</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Comprehensive Tiers</span>
                    </div>

                    <div className="space-y-0.5 text-center p-3.5 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-2xl font-black text-amber-400 block font-serif">6 tracks</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Vocational TVET</span>
                    </div>
                  </div>

                  <div className="bg-amber-400/10 border border-amber-400/20 p-3 rounded-2xl text-center">
                    <span className="text-xs font-semibold text-amber-200 block">
                      Affordable Fees • High Quality • Practical Labs
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Core School details segments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 bg-white border border-slate-200/60 rounded-3xl shadow-xs transition-shadow hover:shadow-sm">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl w-fit mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-serif font-bold text-slate-900">Academic Honors &amp; Quizzes</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Multee is highly recognized for strong educational standards, with verified winning histories in regional math debate contests, science assemblies, and district quiz bowl tournaments.
                </p>
              </div>

              <div className="p-6 bg-white border border-slate-200/60 rounded-3xl shadow-xs transition-shadow hover:shadow-sm">
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl w-fit mb-4">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-serif font-bold text-slate-900">Direct Workplace Readiness</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Our professional T-VET tracks provide immediate career certifications. Students gain verified proficiency in Tailoring, Computer Science, Journalism, Beauty care, and Pastry baking.
                </p>
              </div>

              <div className="p-6 bg-white border border-slate-200/60 rounded-3xl shadow-xs transition-shadow hover:shadow-sm">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl w-fit mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-serif font-bold text-slate-900">Highly Affordable tuition structures</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  We believe cost should never block young Liberian dreams. MISS features cheap student uniform registration, affordable installments, and special community discounts.
                </p>
              </div>

            </div>

            {/* Direct Image/Video Showcase highlight (Quick preview to engage users on Home) */}
            <div className="bg-white border border-slate-200/60 p-6 md:p-8 rounded-3xl shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-105 pb-4">
                <div>
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Catalog Preview</span>
                  <h4 className="text-lg font-bold font-serif text-slate-950 mt-1">Live from Greenland Community Campus</h4>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('buzz');
                    setBuzzSubTab('gallery');
                  }}
                  className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Complete Gallery Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Renders dynamic top assets with fallback */}
              <MediaGallery 
                announcements={unifiedNewsFeed.slice(0, 3)} 
                isAdmin={false} 
              />
            </div>

            {/* Mission Statement and curriculum highlight segment */}
            <div className="p-8 bg-slate-100/70 rounded-3xl border border-slate-200 text-slate-800 space-y-4 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 text-slate-200/30">
                <School className="w-56 h-56 stroke-[1]" />
              </div>
              <div className="relative z-10 space-y-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-900 border border-amber-200 text-[10px] font-bold uppercase tracking-widest rounded-md">
                  <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  Accreditation Mandate
                </span>
                <h4 className="text-2xl font-serif font-black text-slate-950">Curriculum Mission Statement</h4>
                <p className="text-xs sm:text-sm text-slate-650 leading-relaxed max-w-4xl">
                  To provide an inclusive, affordable, and high-impact educational center in Montserrado County. Through rigorous STEM and humanities modules combined with trade-specific hands-on vocational labs, Multee International School System equips Liberian youths to confidently step into global employment, state-level examinations (WASSCE), or independent entrepreneurship pathways.
                </p>
              </div>
            </div>

            {/* Micro division navigation shortcuts in bottom of home */}
            <div className="bg-slate-950 text-white rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-amber-400 opacity-5 blur-3xl rounded-full"></div>
              <div className="space-y-1.5 relative z-10">
                <h5 className="font-serif text-lg font-bold uppercase tracking-tight">Ready to enroll your child or register for trade?</h5>
                <p className="text-xs text-slate-300">Submit an inquiry in 60 seconds and our admissions office helper will reach you via telephone.</p>
              </div>
              <button
                onClick={() => setActiveTab('contact')}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0 relative z-10 shadow-md"
              >
                Send Admission Inquiry
              </button>
            </div>

          </div>
        )}

        {/* PAGE SECTION: ACADEMICS TAB */}
        {activeTab === 'academics' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-slate-200 text-center max-w-xl mx-auto space-y-2">
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">K-12 Streams</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-950">Academic Division Curriculum</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nursery through high secondary classrooms formatted in correspondence with the Ministry of Education guidelines and regional WASSCE assessment modules.
              </p>
            </div>
            <AcademicSelector />
          </div>
        )}

        {/* PAGE SECTION: TVET VOCATIONAL TAB */}
        {activeTab === 'tvet' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-slate-200 text-center max-w-xl mx-auto space-y-2">
              <span className="text-[10px] text-blue-800 font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-105">9-Mo Certifications</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-950">Technical &amp; Vocational Tracks</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Designed to bridge employment requirements. Six specialized career disciplines featuring intensive training modules and Saturday practical laboratories.
              </p>
            </div>
            <TvetTracksGrid />
          </div>
        )}

        {/* PAGE SECTION: NEWS / BUZZ FEED TAB */}
        {activeTab === 'buzz' && (
          <div className="space-y-8 animate-fade-in" id="buzz-feed-section">
            
            {/* Nav Switch for News Alerts vs Photos/Videos galleries */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 max-w-md mx-auto">
              {[
                { id: 'news', label: 'School Announcements', icon: Megaphone },
                { id: 'gallery', label: 'Media Hub & Academy TV', icon: ImageIcon },
              ].map((subItem) => {
                const IconComponent = subItem.icon;
                return (
                  <button
                    key={subItem.id}
                    onClick={() => setBuzzSubTab(subItem.id as any)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      buzzSubTab === subItem.id
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-505 text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{subItem.label}</span>
                  </button>
                );
              })}
            </div>

            {/* NESTED RENDER: STANDARD NEWS SECTION */}
            {buzzSubTab === 'news' ? (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700">Official Feed</span>
                    <h3 className="text-2xl md:text-3xl font-serif font-black text-slate-950 mt-1 uppercase">
                      MISS Board Publications
                    </h3>
                    <p className="text-slate-500 text-xs mt-1 max-w-xl leading-relaxed">
                      Urgent information regarding grading, calendar changes, graduation attire fees, extra-curriculum quizbowls, and laboratory updates.
                    </p>
                  </div>

                  {/* Feed Search options */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search publications..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      {['All', 'News', 'Admission', 'TVET', 'Event'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-blue-900 text-white'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Buzz updates lists */}
                {announcementsLoading ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400">Loading catalog streams...</p>
                  </div>
                ) : filteredBuzz.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed rounded-3xl border-slate-200">
                    <Megaphone className="w-10 h-10 text-slate-350 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No updates matched criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">Refine your search tags or view campus media photos instead.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in text-xs">
                    {filteredBuzz.map((ann) => {
                      const formattedDate = ann.createdAt?.seconds 
                        ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : ann.createdAt instanceof Date 
                          ? ann.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Recently';

                      return (
                        <div
                          key={ann.id}
                          className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-3xs flex flex-col justify-between"
                        >
                          {ann.imageUrl && (
                            <div className="h-48 w-full overflow-hidden relative">
                              <img
                                src={ann.imageUrl}
                                alt={ann.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute top-4 left-4 bg-slate-900 text-amber-400 font-bold text-[9.5px] py-0.5 px-2.5 rounded-full border border-slate-900">
                                {ann.category}
                              </span>
                            </div>
                          )}

                          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1.5">
                              {!ann.imageUrl && (
                                <span className="inline-block bg-slate-100 text-slate-600 font-bold text-[9px] py-0.5 px-2 rounded uppercase">
                                  {ann.category}
                                </span>
                              )}
                              <h4 className="text-base font-bold text-slate-950 tracking-tight leading-snug">
                                {ann.title}
                              </h4>
                              <p className="text-slate-600 leading-relaxed line-clamp-4">
                                {ann.content}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-slate-400">
                              <span className="font-semibold text-slate-550">By {ann.publisherName || 'MISS Registrar'}</span>
                              <span className="font-mono text-[11px]">{formattedDate}</span>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="bg-rose-50 px-6 py-2 flex justify-between items-center border-t border-rose-100">
                              <span className="text-[10px] text-rose-800 font-bold font-mono">Principal Controls</span>
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="px-2.5 py-1 bg-white hover:bg-rose-100 text-[10px] font-bold text-rose-700 border border-rose-200 rounded-md cursor-pointer transition-colors animate-pulse"
                              >
                                Delete alert
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // NESTED RENDER: COMPLETE MEDIA & ACADEMY VIDEO PLAYER PORTAL
              <div className="animate-fade-in">
                <MediaGallery 
                  announcements={unifiedNewsFeed} 
                  isAdmin={isAdmin}
                  onRemove={handleDeleteAnnouncement}
                />
              </div>
            )}
          </div>
        )}

        {/* PAGE SECTION: INQUIRY CONTACT FORM TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-4 border-b border-slate-200 text-center max-w-xl mx-auto space-y-2">
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Contact Board</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-950">Administrative Registrars</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Submit academic consultations, registration enquiries, or trade-track interview schedules directly.
              </p>
            </div>
            <InquiryForm />
          </div>
        )}

        {/* PAGE SECTION: STAFF ADMINISTRATOR WORKSPACE */}
        {activeTab === 'admin' && (
          <div className="space-y-8 animate-fade-in animate-fade-in" id="admin-workspace-view">
            
            {/* Authenticated Workspace Check */}
            {!user ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/50 p-8 text-center space-y-6 shadow-xl">
                <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <UserIcon className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-xl font-serif font-bold text-slate-955">Principal Credentials Required</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Access to this register dashboard requires specific administrator clearances. Please sign in below using your authorized credentials.
                  </p>
                </div>

                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2 border-none"
                >
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Log In to Systems</span>
                </button>
              </div>
            ) : !isAdmin ? (
              <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-205 p-8 text-center space-y-5 shadow-xl">
                <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto border border-rose-100">
                  <AlertCircle className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-lg font-serif font-bold text-slate-900">Unauthorized User Account</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You have authenticated as <strong className="text-slate-855 font-mono">{user.email}</strong>. This parent profile is active, but lacks administrator clearances to write roster tracks.
                  </p>
                </div>

                <button
                  onClick={handleSignOutSession}
                  className="px-5 py-2.5 bg-rose-650 text-white hover:bg-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Disconnect Session
                </button>
              </div>
            ) : (
              // RENDER MASTER COMPLEMENTARY WORKSPACE TABS (Dashboard, Post Form, Parent Inbox)
              <div className="space-y-8 animate-fade-in">
                
                {/* Visual sub-tab navigation items */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-400 pb-4 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100/60 font-mono">
                      MISS Ledger Management Portal
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-950 mt-1 uppercase">
                      Admin Command Desk
                    </h3>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
                    {[
                      { id: 'dashboard', label: 'Roster & Ledger', icon: LayoutDashboard },
                      { id: 'publish', label: 'Publish Media', icon: PenTool },
                      { id: 'inbound', label: 'Visitor Inbox', icon: Inbox },
                    ].map((stb) => {
                      const IconField = stb.icon;
                      return (
                        <button
                          key={stb.id}
                          onClick={() => setAdminSubTab(stb.id as any)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                            adminSubTab === stb.id
                              ? 'bg-blue-900 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-950'
                          }`}
                        >
                          <IconField className="w-3.5 h-3.5 shrink-0" />
                          <span>{stb.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* WORKSPACE SUB-ROUTER TARGETS */}
                {adminSubTab === 'dashboard' && (
                  <div className="animate-fade-in">
                    <AdminAnalytics 
                      inquiries={rawInquiries} 
                      announcementsCount={unifiedNewsFeed.length}
                    />
                  </div>
                )}

                {adminSubTab === 'publish' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                    <div className="lg:col-span-8">
                      <AnnouncementForm 
                        publisherEmail={user.email || 'luckyglobalnews@gmail.com'}
                        onSuccess={() => {
                          setTimeout(() => {
                            setAdminSubTab('dashboard');
                          }, 1500);
                        }}
                      />
                    </div>
                    <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 space-y-4 shadow-3xs self-start">
                      <span className="p-2 bg-amber-50 text-amber-800 rounded-xl w-fit block font-bold text-xs uppercase">Posting Instructions</span>
                      <h5 className="font-serif font-bold text-slate-950 text-sm">Rich Media Guidance</h5>
                      <p className="text-xs text-slate-550 leading-relaxed">
                        To publish photo galleries or YouTube lesson items, select the Post Format selector at the top of the form:
                      </p>
                      <ul className="text-xs space-y-2 text-slate-600 list-disc pl-4 leading-relaxed font-medium">
                        <li><strong>Standard Format</strong> compiles text updates shown in News feed.</li>
                        <li><strong>Photo Format</strong> requires displaying direct image URLs and targets photo streams.</li>
                        <li><strong>YouTube Format</strong> takes direct video link structures and formats cinema theater blocks.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {adminSubTab === 'inbound' && (
                  <div className="animate-fade-in max-w-4xl mx-auto">
                    <AdminInbox onInquiriesCount={(count) => setUnreadInquiriesCount(count)} />
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </main>

      {/* Unified institutional footer block */}
      <footer className="bg-slate-950 text-white pt-12 pb-8 px-6 mt-16 border-t border-white/5 relative z-10 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 rounded-full h-2 bg-amber-400"></span>
                <span className="text-xs uppercase font-bold tracking-widest text-white block">
                  Multee International School System (MISS)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Greenland Community, Johnsonville, Montserrado County, Liberia
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10.5px]">
                Affordable Rates
              </span>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10.5px]">
                Practical TVET Labs
              </span>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10.5px]">
                WAEC/WASSCE Compliant
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-xs text-slate-400">
            <div className="md:col-span-5 space-y-3">
              <h5 className="text-white font-bold tracking-wider uppercase text-[10px]">About Our Academy</h5>
              <p className="leading-relaxed">
                Providing comprehensive academic instruction from early kindergarten up to senior secondary graduations, alongside professional 9-month job readiness courses. MISS operates under official government curricula to unlock the technical and intellectual potential of Liberia&apos;s youth.
              </p>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h5 className="text-white font-bold tracking-wider uppercase text-[10px]">Registrar &amp; Inquiries</h5>
              <p className="leading-relaxed font-medium">
                Office: +231 77 782 9659<br />
                Email: multeeschoolsystem@gmail.com<br />
                Daily Session Timing: 7:30 AM - 4:00 PM | Sat Labs 9:00 AM - 2:00 PM
              </p>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h5 className="text-white font-bold tracking-wider uppercase text-[10px]">Registry Status</h5>
              <p className="leading-relaxed">
                Duly validated private institution operating with authorized permits issued by the Ministry of Education of the Republic of Liberia.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-center text-[11px] text-slate-500 font-mono">
            <p>© 2026 Multee International School System (MISS). All rights reserved.</p>
            <div className="flex gap-4">
              <span className="hover:text-amber-400 transition-colors pointer-events-none">Johnsonville, Monrovia</span>
              <span className="text-slate-800">|</span>
              <span className="hover:text-amber-400 transition-colors pointer-events-none">WAEC Code Valid</span>
            </div>
          </div>

        </div>
      </footer>

      {/* CORE MODAL INJECTIONS */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

    </div>
  );
}
