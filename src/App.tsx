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
  signInWithPopup, 
  GoogleAuthProvider, 
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
  Heart, 
  Compass, 
  MapPin, 
  AlertCircle,
  Megaphone,
  Briefcase,
  Star,
  CheckCircle,
  LogIn,
  ChevronRight,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';

import { Announcement } from './types';
import { AcademicSelector } from './components/AcademicSelector';
import { TvetTracksGrid } from './components/TvetTracksGrid';
import { InquiryForm } from './components/InquiryForm';
import { AnnouncementForm } from './components/AnnouncementForm';
import { AdminInbox } from './components/AdminInbox';

// Seed stories so the application displays rich educational info even when database has no postings yet
const FALLBACK_BUZZ_STORIES: Announcement[] = [
  {
    id: 'seed-announcement-admissions',
    title: 'Admissions Open: 2026/2027 Academic Year Registration',
    content: 'Multee International School System is formally receiving registrations starting from nursery child care pathways through senior secondary science and humanities streams. We are dedicated to delivering affordable, top-quality instructions. High secondary standards are fully WAEC/WASSCE approved. Visit the admissions block today or submit a message below.',
    category: 'Admission',
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
    imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60',
    publisherName: 'Vocational Coordinator',
    publisherEmail: 'luckyglobalnews@gmail.com',
    createdAt: new Date('2026-06-18T10:30:00Z')
  },
  {
    id: 'seed-announcement-quizbowl',
    title: 'Multee Intelligence Team Wins Regional Academic Quiz Bowl!',
    content: 'Congratulations to our student representatives for their outstanding victory in the regional inter-school debate and quiz bowl championships! This represents the school’s persistent academic rigor and dedication to training future Liberian leaders who are analytical thinkers and proud representatives of the Johnsonville community.',
    category: 'News',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
    publisherName: 'Academic Council',
    publisherEmail: 'luckyglobalnews@gmail.com',
    createdAt: new Date('2026-06-15T09:15:00Z')
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab navigation system for sections
  const [activeTab, setActiveTab] = useState<'home' | 'academics' | 'tvet' | 'buzz' | 'contact' | 'admin'>('home');

  // School announcements lists
  const [dbAnnouncements, setDbAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  
  // Search parameters for Multee Buzz
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Inquiries count to show on admin tab badge
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

  const handleSignInWithGoogle = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Auth Login failed:', err);
      setLoginError('Could not establish connection to the auth server.');
    }
  };

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
      alert('Unauthorized removal.');
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
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#fcfcf9] text-slate-800 flex flex-col font-sans selection:bg-blue-900 selection:text-white" id="main-app-container">
      
      {/* Top micro-bar: quick contact and accreditation banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white text-xs py-2 px-4 shadow-sm relative z-30 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              Greenland Community, Johnsonville, Liberia
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              +231 77 782 9659
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold text-amber-400 bg-white/10 px-2 py-0.5 rounded-sm">
              Ministry Approved Code
            </span>
            <span className="text-slate-300 text-[11px]">Admission Cycle: 2026/2027</span>
          </div>
        </div>
      </div>

      {/* Main navigation Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 py-4 px-6 relative z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Crest logo and Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center text-amber-400 border border-slate-900 shadow-md">
              <School className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold font-serif tracking-tight text-slate-950 uppercase leading-none">
                  Multee International
                </h1>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
                  MISS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide mt-1">
                Registered &amp; Accredited Private Academic &amp; Vocational Center
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
            {[
              { id: 'home', label: 'School Home' },
              { id: 'academics', label: 'Academic Programs' },
              { id: 'tvet', label: 'T-VET Vocational' },
              { id: 'buzz', label: 'Multee Buzz (News)' },
              { id: 'contact', label: 'Send Inquiry' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Admin toggle session item */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`relative px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-amber-600 hover:bg-amber-50 hover:text-amber-800'
                }`}
              >
                <span>🛡️ Admin panel</span>
                {unreadInquiriesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-650 text-white font-extrabold text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center animate-bounce border border-white">
                    {unreadInquiriesCount}
                  </span>
                )}
              </button>
            )}

            {/* Login button indicator */}
            {authLoading ? (
              <div className="w-5 h-5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin shrink-0 ml-2" />
            ) : user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-150 shrink-0">
                <span className="text-[10px] font-mono text-slate-600 hidden sm:block">
                  {user.email === 'luckyglobalnews@gmail.com' ? 'Welcome Principal' : user.displayName}
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
                onClick={handleSignInWithGoogle}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-all border border-slate-200/60 cursor-pointer flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-900" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main portal stage container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-12">
        
        {/* Banner notifying if Google Admin view is active */}
        {isAdmin && activeTab !== 'admin' && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-3xs font-sans">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                <School className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Administrator Recognized</span>
                <p className="text-xs text-slate-700">
                  Logged in as principal office coordinator. You can publish new announcements or review parent inbox letters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('admin')}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-950 transition-colors cursor-pointer text-center shrink-0"
              >
                Go to Admin Inbox &amp; Post Form
              </button>
              <button
                onClick={handleSignOutSession}
                className="px-3.5 py-1.5 text-rose-700 hover:bg-rose-100/50 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
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
            <div className="relative rounded-3xl overflow-hidden academic-gradient text-white grid grid-cols-1 lg:grid-cols-12 gold-glow">
              
              {/* Left Column Information */}
              <div className="lg:col-span-7 p-8 md:p-12 lg:p-16 flex flex-col justify-center space-y-6 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full uppercase tracking-widest w-fit border border-amber-500/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  Empowering Liberian Youths
                </div>

                <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-black tracking-tight leading-tight">
                  Empowering Youths with <span className="text-amber-400">Quality</span> Education
                </h2>

                <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-xl">
                  Multee International School System (MISS) is a premier private educational institution located in the Greenland Community of Johnsonville, Montserrado County, Liberia. Operating both academic classes and professional T-VET tracks, we focus on unlocking student potentials starting at the nursery phase up to skilled high school passings!
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={() => setActiveTab('academics')}
                    className="px-6 py-3 bg-amber-500 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Explore Academics
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTab('contact')}
                    className="px-6 py-3 bg-white/10 text-white hover:bg-white/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer border border-white/10"
                  >
                    Send Registration inquiry
                  </button>
                </div>
              </div>

              {/* Right Column Visual Artwork */}
              <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full overflow-hidden flex items-center justify-center p-8 bg-slate-950/20 border-l lg:border-l border-white/10">
                <div className="absolute right-0 bottom-0 top-0 left-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-950 opacity-90 z-0"></div>
                
                {/* Stats Widget overlay */}
                <div className="relative z-10 w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Ministry Accredited
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Certified Portal</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5 text-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-2xl font-black text-amber-400 block font-serif">12 Yrs</span>
                      <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block">Full Grade Track</span>
                    </div>

                    <div className="space-y-0.5 text-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-2xl font-black text-amber-400 block font-serif">9 Mos</span>
                      <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block">TVET Certification</span>
                    </div>
                  </div>

                  <div className="bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-xl text-center">
                    <span className="text-[10.5px] font-medium text-amber-200 block">
                      Affordable Fees • Practical Learning Lab • WASSCE Approved
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Core School details segments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-xs transition-shadow hover:shadow-xs">
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl w-fit mb-4">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-serif font-bold text-slate-900">Academic Excellence</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  With verified triumphs in regional quiz bowl meets and county-wide debate championships, MISS is celebrated for robust English literacy, mathematics, civics, and humanities instruction.
                </p>
              </div>

              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-xs transition-shadow hover:shadow-xs">
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl w-fit mb-4">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-serif font-bold text-slate-900">6 Professional Tracks</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Our professional T-VET division structures prepare youths directly for employment. Students gain accredited competencies in Computer Science, Tailoring, Pastry, Journalism, Beauty, and Dressing.
                </p>
              </div>

              <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-xs transition-shadow hover:shadow-xs">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl w-fit mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-serif font-bold text-slate-900">Affordable Tuition Rates</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  We believe that financial constraints should never lock potential. MISS provides highly affordable school fee schedules, cheap registration, and dynamic tuition options for the Greenland community.
                </p>
              </div>

            </div>

            {/* Mission Statement and curriculum highlight segment */}
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-205/60 space-y-4">
              <div className="flex items-center gap-1 bg-amber-100/50 text-amber-800 w-fit px-2 ml-0 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-widest">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                Our Administrative Mandate
              </div>
              <h4 className="text-2xl font-serif font-bold text-slate-950">Curriculum Mission Statement</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Fostering affordable, high quality academic excellence and job-ready technical vocational fields. Multee International School System represents an outstanding training model in Montserrado County. Operating both Academic and Technical-Vocational divisions, we unlock student potentials starting at the nursery phase up to skilled high school qualifications.
              </p>
            </div>

            {/* Micro division navigation shortcuts in bottom of home */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h5 className="font-serif text-lg font-bold">Ready to enroll your child or apply for T-VET?</h5>
                <p className="text-xs text-slate-400 mt-1">Our registrars are currently receiving letters and setting entrance consultations.</p>
              </div>
              <button
                onClick={() => setActiveTab('contact')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Send Administrative Inquiry →
              </button>
            </div>

          </div>
        )}

        {/* PAGE SECTION: ACADEMICS TAB */}
        {activeTab === 'academics' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100 text-center max-w-xl mx-auto space-y-2">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-950">Kindergarten to High School Education</h3>
              <p className="text-xs text-slate-500">
                Operating high standards of core teaching structured around Liberian standards and international peer benchmarking.
              </p>
            </div>
            <AcademicSelector />
          </div>
        )}

        {/* PAGE SECTION: TVET VOCATIONAL TAB */}
        {activeTab === 'tvet' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100 text-center max-w-xl mx-auto space-y-2">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-950">Technical &amp; Vocational Training Track</h3>
              <p className="text-xs text-slate-500">
                Highly targeted 9-month professional certification tracks with Saturday labs preparing students for immediate employment.
              </p>
            </div>
            <TvetTracksGrid />
          </div>
        )}

        {/* PAGE SECTION: NEWS / BUZZ FEED TAB */}
        {activeTab === 'buzz' && (
          <div className="space-y-8" id="buzz-feed-section">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-100 pb-6 gap-4">
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100">
                  <Megaphone className="w-3.5 h-3.5" />
                  Multee Buzz Updates
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-950 mt-1">
                  News, Events &amp; Updates
                </h3>
                <p className="text-slate-500 text-sm mt-1 max-w-xl">
                  Stay updated with academic timelines, tuition schedules, admissions, vocational graduation cycles, and general campus news.
                </p>
              </div>

              {/* Feed Search control parameters */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search announcements..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-150">
                  {['All', 'News', 'Admission', 'TVET', 'Event'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-blue-900 border-blue-950 text-white'
                          : 'text-slate-505 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Buzz update feed grid */}
            {announcementsLoading ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-mono text-slate-400">Synchronizing update streams...</p>
              </div>
            ) : filteredBuzz.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-250 rounded-2xl">
                <Megaphone className="w-12 h-12 text-slate-350 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No updates found.</p>
                <p className="text-xs text-slate-500 mt-1">Please check back later or modify your search terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredBuzz.map((ann) => {
                  const formattedDate = ann.createdAt?.seconds 
                    ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : ann.createdAt instanceof Date 
                      ? ann.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recently';

                  return (
                    <div
                      key={ann.id}
                      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs flex flex-col card-shine"
                    >
                      {ann.imageUrl && (
                        <div className="h-48 w-full overflow-hidden relative">
                          <img
                            src={ann.imageUrl}
                            alt={ann.title}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-4 left-4 bg-blue-900 text-white font-bold text-[10px] py-1 px-2.5 rounded-full uppercase tracking-wider">
                            {ann.category}
                          </span>
                        </div>
                      )}

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          {!ann.imageUrl && (
                            <span className="inline-block bg-slate-100 text-slate-700 font-bold text-[9px] py-0.5 px-2 rounded-md uppercase tracking-wider">
                              {ann.category}
                            </span>
                          )}
                          <h4 className="text-lg font-bold text-slate-900 leading-snug">
                            {ann.title}
                          </h4>
                          <p className="text-xs text-slate-650 leading-relaxed line-clamp-4">
                            {ann.content}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="font-medium text-slate-500">
                              Published by {ann.publisherName || 'Admissions'}
                            </span>
                          </div>
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="bg-rose-50 px-6 py-2 flex justify-between items-center border-t border-rose-100">
                          <span className="text-[10px] text-rose-800 font-bold font-mono">Principal Controls</span>
                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-[10px] font-bold text-rose-700 border border-rose-200 rounded-md cursor-pointer transition-colors"
                          >
                            Remove announcement
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAGE SECTION: INQUIRY CONTACT FORM TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-100 text-center max-w-xl mx-auto space-y-2">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-950">Administrative Offices</h3>
              <p className="text-xs text-slate-500">
                Our helpful team stands ready to deliver registration requirements, admissions brochures, and tuition schedule details.
              </p>
            </div>
            <InquiryForm />
          </div>
        )}

        {/* PAGE SECTION: STAFF ADMINISTRATOR WORKSPACE */}
        {activeTab === 'admin' && (
          <div className="space-y-8" id="admin-workspace-view">
            
            {/* Authenticated Workspace Check */}
            {!user ? (
              <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-6 shadow-sm">
                <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <UserIcon className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-xl font-serif font-bold text-slate-950">Principal Identity Gate</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Access to this console requires secure credentials. Please sign in below using your authorized principal email.
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs flex items-center gap-1.5 justify-center">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  onClick={handleSignInWithGoogle}
                  className="w-full bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-amber-400 font-extrabold" />
                  <span>Authenticate Admin Account</span>
                </button>
              </div>
            ) : !isAdmin ? (
              <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-150 p-8 text-center space-y-5 shadow-xs">
                <div className="p-3.5 bg-rose-50 text-rose-700 rounded-full w-14 h-14 flex items-center justify-center mx-auto border border-rose-100">
                  <AlertCircle className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-serif font-bold text-slate-900">Unauthorized Email Address</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You have successfully signed in as <strong className="text-slate-800 font-mono">{user.email}</strong>. However, this email does not possess administrative access privileges.
                  </p>
                </div>

                <button
                  onClick={handleSignOutSession}
                  className="px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out and retry
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-300 pb-4 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 font-mono">
                      Security Level 2 • verified principal
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-950 mt-1">
                      Multee Systems Management Console
                    </h3>
                  </div>

                  <button
                    onClick={handleSignOutSession}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out Session</span>
                  </button>
                </div>

                {/* Sub-panels Grid: Form (Left) & Inbox Inquiries (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="bg-white border border-slate-100 p-6 rounded-2xl space-y-1 shadow-3xs">
                      <h4 className="font-bold text-slate-900 text-sm">Welcome back, Principal administrator!</h4>
                      <p className="text-xs text-slate-500">
                        Use the form below to post urgent news alerts, picture galleries, tvet updates, and entrance exam notices onto the community board in real-time.
                      </p>
                    </div>

                    <AnnouncementForm
                      publisherEmail={user.email || 'luckyglobalnews@gmail.com'}
                      onSuccess={(newAnn) => {
                        // Success handled inside component.
                        // Refresh or jump to buzz tab so admin can instantly view it!
                        setTimeout(() => setActiveTab('buzz'), 1500);
                      }}
                    />
                  </div>

                  <div className="lg:col-span-6">
                    <AdminInbox onInquiriesCount={(count) => setUnreadInquiriesCount(count)} />
                  </div>
                </div>
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
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-sm font-bold font-serif uppercase tracking-tight text-white">
                  Multee International School System (MISS)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Greenland Community, Johnsonville, Montserrado County, Liberia
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5">
                Affordable Fees
              </span>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5">
                Practical Learning Lab
              </span>
              <span className="px-3 py-1 bg-white/5 rounded-full border border-white/5">
                WAEC / WASSCE Approved
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-xs text-slate-400">
            <div className="md:col-span-5 space-y-3">
              <h5 className="text-white font-bold tracking-wider uppercase text-[10px]">About Our School</h5>
              <p className="leading-relaxed">
                Operating as both a distinguished academic division (from Nursery to 12th Grade) and a job-focused Technical &amp; Vocational Training program (T-VET tracks), we unlock student potentials starting at pre-childhood. We represent an outstanding academic training model in Montserrado County, Monrovia.
              </p>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h5 className="text-white font-bold tracking-wider uppercase text-[10px]">Contact Registrar</h5>
              <p className="leading-relaxed">
                Registrar Office: +231 77 782 9659<br />
                Admissions: multeeschoolsystem@gmail.com<br />
                Mon - Fri 7:30 AM - 4:00 PM | Sat Labs 9:00 AM - 2:00 PM
              </p>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h5 className="text-white font-bold tracking-wider uppercase text-[10px]">Accreditation</h5>
              <p className="leading-relaxed">
                Registered Private Academic &amp; Vocational Center under the official curriculum guidelines of the Ministry of Education, Liberia.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-center text-[11px] text-slate-500 font-mono">
            <p>© 2026 Multee International School System (MISS). All rights reserved.</p>
            <div className="flex gap-4">
              <span className="hover:text-amber-400 transition-colors pointer-events-none">Montserrado County, Liberia</span>
              <span className="text-slate-700">|</span>
              <span className="hover:text-amber-400 transition-colors pointer-events-none">WAEC Code: Approved</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
