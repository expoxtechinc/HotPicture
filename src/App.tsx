import { useEffect, useState } from 'react';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  GraduationCap, 
  LogOut, 
  UploadCloud, 
  LayoutGrid, 
  ShieldAlert, 
  BookOpen, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Cpu, 
  Sparkles, 
  Loader2, 
  Share2, 
  ExternalLink 
} from 'lucide-react';
import { Picture } from './types';
import AddPicForm from './components/AddPicForm';
import ModeratorQueue from './components/ModeratorQueue';
import PicCard from './components/PicCard';
import AuthModal from './components/AuthModal';
import ShareManifestModal from './components/ShareManifestModal';

// MISS School categories for interactive stream filter
const CATEGORIES = [
  'All', 
  'News / Update', 
  'Vocational TVET', 
  'Academic Pride', 
  'Debate & Quiz', 
  'Campus Life', 
  'Sports & Rec', 
  'Inquiries'
];

// High-quality local seed updates to display MISS content out-of-the-box
const LOCAL_SEED_POSTS: Picture[] = [
  {
    id: 'seed-debate-champs',
    title: 'MISS Debate Team Clinches Liberia Regional Championship!',
    description: 'Our elite quiz bowl and debate students represented the Greenland Community in Johnsonville with absolute class, taking home the grand regional cup. Special thanks to the faculty coaches!',
    imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop',
    uploaderId: 'staff-seed',
    uploaderName: 'Principal\'s Office',
    uploaderEmail: 'multeeschoolsystem@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782122458 },
    likes: 12,
    category: 'Debate & Quiz'
  },
  {
    id: 'seed-tvet-tailoring',
    title: 'Vocational TVET: Tailoring and Fashion Design Exhibition',
    description: 'Creative designs showcased by our talented TVET vocational students. Students learn hands-on cutting, designing, and professional sewing to graduate with industry-ready workforce skills.',
    imageUrl: 'https://images.unsplash.com/photo-1556905200-279565513a2d?w=800&auto=format&fit=crop',
    uploaderId: 'staff-seed',
    uploaderName: 'TVET Dept',
    uploaderEmail: 'multeeschoolsystem@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782112458 },
    likes: 8,
    category: 'Vocational TVET'
  },
  {
    id: 'seed-computer-lab',
    title: 'Computer Science and Journalism Lab Expansion',
    description: 'Equipped with brand-new computers! Senior high and vocational trainees enjoy direct access to digital research tools, programming courses, and media broadcast simulation practices.',
    imageUrl: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&auto=format&fit=crop',
    uploaderId: 'staff-seed',
    uploaderName: 'Computer Science Dept',
    uploaderEmail: 'multeeschoolsystem@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782102458 },
    likes: 14,
    category: 'Vocational TVET'
  },
  {
    id: 'seed-general-enrollment',
    title: 'Enrollment Ongoing: Nursery, Junior & Senior High!',
    description: 'Provide your child a stellar academic background in Greenland, Johnsonville. We offer structured STEM modules, humanities, and high-quality teachers. Visit us or reach out via +231 77 782 9659.',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop',
    uploaderId: 'staff-seed',
    uploaderName: 'Registrar Board',
    uploaderEmail: 'multeeschoolsystem@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782092458 },
    likes: 9,
    category: 'News / Update'
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Real-time mobile OS simulator clock
  const [currentTime, setCurrentTime] = useState('09:55 AM');
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const [connectionVerified, setConnectionVerified] = useState(false);

  // Monitor Progressive Web App install prompt triggers
  useEffect(() => {
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('Progressive Web App install eligibility detected.');
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA installation prompt user status response:', outcome);
    setDeferredPrompt(null);
  };

  // Switch between interactive school boards
  const [activeTab, setActiveTab] = useState<'gallery' | 'my-uploads' | 'admin-board' | 'upload'>('gallery');
  const [approvedPics, setApprovedPics] = useState<Picture[]>([]);
  const [myPics, setMyPics] = useState<Picture[]>([]);
  const [picsLoading, setPicsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Firebase connection validation
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setConnectionVerified(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. Client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  // Listen to Auth State Changed
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Evaluate the bootstrapped Admin condition
        const holdsAdminPrivileges = currentUser.email === 'luckyglobalnews@gmail.com';
        setIsAdmin(holdsAdminPrivileges);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Real-time listener for Approved Pictures/Posts (Feeds)
  useEffect(() => {
    setPicsLoading(true);

    const approvedQuery = query(
      collection(db, 'pictures'),
      where('status', '==', 'approved')
    );

    const unsubApproved = onSnapshot(
      approvedQuery,
      (snapshot) => {
        const list: Picture[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Picture);
        });

        // Client-side sorting
        list.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setApprovedPics(list);
        setPicsLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'pictures');
        setPicsLoading(false);
      }
    );

    return () => unsubApproved();
  }, []);

  // Real-time listener for "My Uploads/Drafts" (when signed in)
  useEffect(() => {
    if (!user) {
      setMyPics([]);
      return;
    }

    const myQuery = query(
      collection(db, 'pictures'),
      where('uploaderId', '==', user.uid)
    );

    const unsubMy = onSnapshot(
      myQuery,
      (snapshot) => {
        const list: Picture[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Picture);
        });

        list.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setMyPics(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'pictures');
      }
    );

    return () => unsubMy();
  }, [user]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Auth Failed:', err);
      alert('Authentication failed to resolve. Check browser permissions.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveTab('gallery');
    } catch (err) {
      console.error('Sign Out Failed:', err);
    }
  };

  // Merge Firestore-approved posts with our premium local seed updates
  // This guarantees an attractive and content-rich stream instantly
  const getAllUnifiedPosts = () => {
    const dbPosts = [...approvedPics];
    const seededList = [...LOCAL_SEED_POSTS];
    
    // Combine and remove seed duplicates if a real post exists with the same ID
    const merged = [...dbPosts];
    seededList.forEach(seed => {
      if (!merged.some(p => p.title.toLowerCase() === seed.title.toLowerCase())) {
        merged.push(seed);
      }
    });

    // Final sorting: newest first
    return merged.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  };

  const unifiedPosts = getAllUnifiedPosts();

  // Perform client-side filter of the approved posts list
  const filteredPics = unifiedPosts.filter((pic) => {
    const matchesSearch = 
      pic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pic.uploaderName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || pic.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#07080a] text-slate-100 flex flex-col lg:flex-row items-center justify-center font-sans relative overflow-hidden selection:bg-orange-500 selection:text-white">
      
      {/* Background radial glowing ambient light effects for desktop previewers */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-[140px] pointer-events-none hidden lg:block" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-[140px] pointer-events-none hidden lg:block" />

      {/* Hero Welcome Info Panel (Left side on widescreen viewports) */}
      <div className="hidden lg:flex fixed left-8 xl:left-16 top-1/2 -translate-y-1/2 max-w-sm flex-col space-y-4 text-left z-10 overflow-y-auto max-h-[90vh] pr-2 scrollbar-none">
        
        {/* Crest Shield Logo block */}
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 border-2 border-orange-500/40 rounded-2xl overflow-hidden p-0.5 shadow-xl bg-gray-950 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-slate-100 uppercase">
              Multee (MISS)
            </h1>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#f97316] font-bold block mt-1">
              International School System
            </span>
          </div>
        </div>

        {/* Academic Brief */}
        <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
          <p>
            An esteemed private institution in the <strong className="text-slate-200">Greenland Community of Johnsonville, Monrovia, Liberia</strong>, offering premium nursery to senior high school education.
          </p>
          <p>
            MISS is famous for deep integration of STEM modules, liberal arts, and national accolades including multiple regional quiz bowl wins and debate champion titles.
          </p>
        </div>

        {/* TVET programs list */}
        <div className="p-4 bg-gray-950/80 border border-gray-901 rounded-2xl space-y-2 outline outline-1 outline-gray-900 shadow-md">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu size={12} />
            <span>TVET Vocational Curriculum</span>
          </h2>
          <p className="text-[11px] text-gray-500 leading-snug">
            Equipping tomorrow's workforce with premium technical certificates:
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">✂️ Tailoring & Fashion</span>
            <span className="flex items-center gap-1">💇 Hair-Dressing</span>
            <span className="flex items-center gap-1">💅 Beauty Care</span>
            <span className="flex items-center gap-1">🎙️ Journalism</span>
            <span className="flex items-center gap-1">💻 Computer Science</span>
            <span className="flex items-center gap-1">🥐 Pastry & Culinary</span>
          </div>
        </div>

        {/* Quick school contact action metrics */}
        <div className="p-4 bg-gray-950/80 border border-gray-901 rounded-2xl space-y-2.5 outline outline-1 outline-gray-900">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Registrar Secretariat</h3>
          
          <div className="space-y-1.5 text-[11px] text-gray-400">
            <a href="tel:+231777829659" className="flex items-center space-x-2 hover:text-orange-400 transition">
              <Phone size={12} className="text-orange-500" />
              <span>+231 77 782 9659</span>
            </a>
            <a href="mailto:multeeschoolsystem@gmail.com" className="flex items-center space-x-2 hover:text-orange-400 transition">
              <Mail size={12} className="text-orange-500" />
              <span className="truncate">multeeschoolsystem@gmail.com</span>
            </a>
            <div className="flex items-center space-x-2">
              <MapPin size={12} className="text-orange-500" />
              <span>Greenland, Johnsonville, Liberia</span>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Security Gatekeeper Notice (Right side on ultra-widescreen viewports) */}
      <div className="hidden xl:flex fixed right-8 xl:right-16 top-1/2 -translate-y-1/2 max-w-xs flex-col space-y-4 text-left z-10">
        <div className="p-5 bg-gray-950/40 backdrop-blur-md border border-gray-900 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center space-x-1.5 text-[10px] font-black text-orange-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span>MISS Board Gatekeeper</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            All submitted school news, parent feedback notes, and project images must comply with our high academic standards. Administrators review submissions before they list.
          </p>
          <div className="pt-2.5 border-t border-gray-900 flex items-center justify-between text-[9px] text-gray-500 font-mono">
            <span>Secure Core:</span>
            <span className="text-emerald-400 font-bold">MISS Database Active</span>
          </div>
        </div>

        {/* Web app sharing options */}
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-[11px] font-bold rounded-xl transition duration-200 cursor-pointer text-orange-400 block text-center"
        >
          Share School App Client ➜
        </button>
      </div>

      {/* Main Handheld Smartphone Mock Container */}
      <div className="w-full h-screen lg:h-[840px] lg:max-h-[92vh] lg:w-[410px] bg-[#090b0e] border-0 lg:border-[10px] lg:border-slate-800/90 lg:rounded-[50px] lg:shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(249,115,22,0.08)] relative overflow-hidden flex flex-col z-20">
        
        {/* Physical Camera lens Notch indicator */}
        <div className="hidden lg:block absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-40 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#141416] border border-gray-900 absolute left-3.5" />
          <div className="w-1 h-1 rounded-full bg-slate-900 absolute right-7" />
        </div>

        {/* Simulated Native OS Status Bar */}
        <div className="bg-[#090b0e] h-10 px-6 shrink-0 flex items-center justify-between text-[10px] font-sans font-bold tracking-wide select-none z-30 border-b border-gray-950/60">
          <span className="text-slate-200">{currentTime}</span>
          
          {/* Simulated Notch spacer in desktop window */}
          <div className="hidden lg:block w-24" />

          {/* Connection Indicators */}
          <div className="flex items-center space-x-1.5 text-slate-300">
            <div className="flex items-end space-x-[1.5px]" title="MISS Network sync">
              <span className="w-[1.5px] h-1 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-1.5 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-2 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-2.5 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-3 bg-orange-500 rounded-px"></span>
            </div>
            <span className="text-[8px] font-mono tracking-tight text-orange-400 font-black">WiFi</span>
            
            <svg className="w-3.5 h-3.5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.251 14.228c2.073-2.073 5.425-2.073 7.498 0m-9.996-2.498c3.456-3.457 9.061-3.457 12.518 0M3.75 8.25c4.761-4.761 12.48-4.761 17.24 0M12 18.75h.008v.008H12v-.008z" />
            </svg>

            <div className="w-5 h-2.5 border border-slate-500 rounded-[3px] p-[1.5px] flex items-center relative">
              <div className="h-full w-4/5 bg-gradient-to-r from-emerald-500 to-green-400 rounded-[1px]" />
              <div className="w-[1px] h-1 bg-slate-500 rounded-r-xs absolute -right-[1.5px]" />
            </div>
            <span className="text-[8px] font-mono text-slate-400">92%</span>
          </div>
        </div>

        {/* Compact Mobile App Header Bar */}
        <header className="bg-[#0f1115]/90 backdrop-blur-md px-4 py-3 shrink-0 flex items-center justify-between border-b border-gray-900 z-30">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('gallery')}>
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center border border-orange-400/20 shadow">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-black bg-gradient-to-r from-slate-100 to-orange-400 bg-clip-text text-transparent">
                MISS Portal
              </span>
              <span className="text-[7.5px] text-orange-500 uppercase tracking-wider block leading-none font-bold">
                Monrovia, Liberia
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-1.5 rounded-lg bg-gray-950 hover:bg-gray-900 border border-gray-900 text-orange-400 transition cursor-pointer"
              title="Share app link"
            >
              <Share2 size={13} />
            </button>

            {/* Profile Drawer and Auth Indicators */}
            {authLoading ? (
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
            ) : user ? (
              <button 
                onClick={() => setIsProfileDrawerOpen(true)}
                className="relative p-0.5 rounded-full border border-orange-500/40 focus:outline-none transition active:scale-95"
                title="Your Dashboard"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                    {user.email?.substring(0, 1)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg text-[9px] font-bold text-white shadow-md cursor-pointer transition hover:scale-[1.02] active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Interactive Scrolling Container Area for Tabs Content */}
        <main className="flex-1 overflow-y-auto scrollbar-none pb-24 bg-[#090b0e] flex flex-col">
          
          {/* Guest restriction fallback except for the main gallery board */}
          {!user && activeTab !== 'gallery' && (
            <div className="px-5 py-12 text-center my-auto space-y-5">
              <div className="w-16 h-16 bg-gradient-to-b from-gray-900 to-transparent border border-gray-800 rounded-full flex items-center justify-center mx-auto text-2xl shadow-lg">
                🔒
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-100">Contribution Board Locked</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Sign in with any verification account to submit school activities, write suggestions, upvote announcements or view private logs in real-time.
                </p>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:scale-[1.01] active:scale-95 cursor-pointer transition"
              >
                Sign In / Verify Now
              </button>
            </div>
          )}

          {/* Active Tab Area: School News and Activity Stream */}
          {activeTab === 'gallery' && (
            <div className="p-4 space-y-4">
              
              {/* Informational Welcome Banner inside Phone mockup */}
              <div className="p-3.5 bg-[#0f1115] border border-gray-905 rounded-2xl relative overflow-hidden space-y-1 shadow-sm outline outline-1 outline-gray-900">
                <div className="flex items-center space-x-1 text-[10px] font-extrabold text-orange-400 uppercase tracking-widest leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>MISS Monrovia Stream Feed</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Welcome to the official Multee International School stream. Browse active academic news, debate wins, sports, and certified TVET Vocational showcase posts.
                </p>
                
                {/* Embedded Dial Link */}
                <div className="pt-2 flex items-center gap-2">
                  <a 
                    href="tel:+231777829659" 
                    className="px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/10 text-[9px] font-bold text-orange-400 rounded-lg flex items-center gap-1 shrink-0"
                  >
                    <Phone size={8} /> Call Secretariat
                  </a>
                  <a 
                    href="mailto:multeeschoolsystem@gmail.com" 
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-[9px] text-gray-400 hover:text-slate-200 border border-gray-800 rounded-lg flex items-center gap-1 shrink-0"
                  >
                    <Mail size={8} /> Email school
                  </a>
                </div>
              </div>

              {/* Filtering Controls: Compact School Channel Category Slider */}
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                          : 'bg-[#0f1115] border border-gray-900 text-gray-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Compact Search Bar */}
                <div className="relative w-full">
                  <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search MISS streams, categories, authors..."
                    className="w-full bg-gray-950/80 border border-gray-900 rounded-xl pl-9 pr-4 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-orange-500 placeholder:text-gray-600 transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Feed Content Grid */}
              {picsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 text-orange-500 animate-spin mb-3" />
                  <span className="text-[10px] font-mono text-gray-400">Syncing with MISS registrar boards...</span>
                </div>
              ) : filteredPics.length === 0 ? (
                <div className="text-center py-16 bg-[#0f1115] border border-dashed border-gray-900 rounded-2xl">
                  <span className="text-2xl block mb-2">🏜️</span>
                  <p className="text-[11px] font-bold text-slate-400">No Stream Posts Match</p>
                  <p className="text-[10px] text-gray-600 mt-1">Try selecting another channel or post custom material!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5">
                  {filteredPics.map((pic) => (
                    <PicCard
                      key={pic.id}
                      pic={pic}
                      currentUserUid={user ? user.uid : null}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Tab Area: User Submissions Tracker */}
          {user && activeTab === 'my-uploads' && (
            <div className="p-4 space-y-4">
              <div className="border-b border-gray-900 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Submissions & Suggestions Logs</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Track approved posts and draft publications currently being audited by staff.
                </p>
              </div>

              {myPics.length === 0 ? (
                <div className="text-center py-12 bg-[#0f1115] border border-gray-900 rounded-2xl space-y-3">
                  <p className="text-[11px] text-gray-500">You haven't posted any school updates yet.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-orange-400 px-4 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    Submit Post
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5">
                  {myPics.map((pic) => (
                    <PicCard
                      key={pic.id}
                      pic={pic}
                      currentUserUid={user.uid}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Tab Area: Image/Article Upload Panel */}
          {user && activeTab === 'upload' && (
            <div className="p-4 space-y-3">
              <div className="text-center pb-2 border-b border-gray-900">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Create MISS Stream Announcement</h3>
                <p className="text-[9.5px] text-gray-500 mt-0.5">
                  Add photos, vocational trainees achievements, academic victories, or submit inquiries!
                </p>
              </div>
              
              <div className="bg-[#090b0e] rounded-xl">
                <AddPicForm 
                  user={user} 
                  isAdmin={isAdmin} 
                  onSuccess={() => {
                    setTimeout(() => {
                      setActiveTab(isAdmin ? 'gallery' : 'my-uploads');
                    }, 1200);
                  }}
                />
              </div>
            </div>
          )}

          {/* Active Tab Area: Moderator Verification Queue Board */}
          {user && isAdmin && activeTab === 'admin-board' && (
            <div className="p-4 space-y-4">
              <div className="border-b border-red-500/20 pb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <h3 className="text-xs font-black uppercase text-red-400 tracking-wider">MISS Admin Control Board</h3>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Authorized access panel for luckyglobalnews@gmail.com. Review community and parent stream guidelines.
                </p>
              </div>
              <ModeratorQueue adminUid={user.uid} />
            </div>
          )}

        </main>

        {/* Tactical Bottom Mobile Navigation Bar inside Simulated Screen */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#0f1115]/95 backdrop-blur-md border-t border-gray-900 px-3 py-1.5 z-30 flex items-center justify-around select-none">
          
          {/* Gallery Button */}
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition duration-150 relative cursor-pointer ${
              activeTab === 'gallery' ? 'text-orange-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutGrid size={15} className="mb-0.5" />
            <span className="text-[8.5px] tracking-tight"> MISS Stream</span>
          </button>

          {/* Highlight Upload central Action Trigger */}
          <button
            onClick={() => {
              if (!user) {
                setIsAuthModalOpen(true);
              } else {
                setActiveTab('upload');
              }
            }}
            className={`flex flex-col items-center justify-center -translate-y-2 cursor-pointer w-11 h-11 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold transition shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 z-40 ${
              activeTab === 'upload' ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-[#0f1115]' : ''
            }`}
            title="Create Publication"
          >
            <UploadCloud size={16} />
          </button>

          {/* Tracker Button */}
          <button
            onClick={() => {
              if (!user) {
                setIsAuthModalOpen(true);
              } else {
                setActiveTab('my-uploads');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition duration-150 relative cursor-pointer ${
              activeTab === 'my-uploads' ? 'text-orange-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BookOpen size={15} className="mb-0.5" />
            <span className="text-[8.5px] tracking-tight">Your Activity</span>
            
            {user && myPics.length > 0 && (
              <span className="absolute top-0 right-2 bg-orange-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-950 scale-90">
                {myPics.length}
              </span>
            )}
          </button>

          {/* Optional Gatekeeper Board Trigger (Only visible to Admin) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin-board')}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition duration-150 relative cursor-pointer ${
                activeTab === 'admin-board' ? 'text-red-400 font-bold' : 'text-yellow-505/60 hover:text-yellow-400'
              }`}
            >
              <ShieldAlert size={15} className="mb-0.5" />
              <span className="text-[8.5px] tracking-tight">Audit Queue</span>
            </button>
          )}

        </nav>

        {/* Simulated iOS/Android Bottom Home Indicator Line Bar */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-800 rounded-full z-45 pointer-events-none hidden lg:block" />

        {/* Mobile Settings Drawer Sheet (Bottom Sheet Trigger when clicking user avatar) */}
        {isProfileDrawerOpen && user && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
            <div className="absolute inset-0 -z-10" onClick={() => setIsProfileDrawerOpen(false)} />
            
            <div className="w-full bg-[#0f1115] border-t border-gray-800 rounded-t-[32px] p-6 space-y-5 shadow-2xl relative">
              
              <div className="w-10 h-1 bg-gray-800 rounded-full mx-auto mb-1 pointer-events-none" />

              {/* Profile Overview */}
              <div className="flex items-center space-x-3.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-orange-500/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white flex items-center justify-center font-black text-sm uppercase">
                    {user.email?.substring(0, 1)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{user.displayName || 'MISS Community Member'}</h4>
                  <p className="text-[10px] text-gray-500">{user.email}</p>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-950 rounded-2xl text-center space-y-0.5 border border-gray-901">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold font-mono tracking-wider">Your Posts</span>
                  <span className="text-lg font-black text-orange-400">{myPics.length} logs</span>
                </div>
                <div className="p-3 bg-gray-950 rounded-2xl text-center space-y-0.5 border border-gray-901">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold font-mono tracking-wider">Board Privileges</span>
                  <span className="text-xs font-bold text-slate-300 block pt-1">
                    {isAdmin ? '🛡️ School Staff-Admin' : '✨ Parent/Student Contributor'}
                  </span>
                </div>
              </div>

              {/* Action Lists */}
              <div className="space-y-2 pt-2">
                
                <button
                  onClick={() => {
                    setIsProfileDrawerOpen(false);
                    setIsShareModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                >
                  <span>Share App Setup / Send link</span>
                  <span>➜</span>
                </button>

                <button
                  onClick={async () => {
                    setIsProfileDrawerOpen(false);
                    await handleSignOut();
                  }}
                  className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-900 border border-gray-900 text-gray-400 hover:text-rose-400 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Logout Board Session</span>
                </button>

                <button
                  onClick={() => setIsProfileDrawerOpen(false)}
                  className="w-full py-2 px-4 bg-gray-950 hover:bg-gray-900 text-slate-400 text-[10.5px] rounded-xl text-center font-bold tracking-wide transition cursor-pointer"
                >
                  Dismiss Controls
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Elegant overlay AuthModal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* PWA share and installation Modal */}
      <ShareManifestModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
      />
    </div>
  );
}
