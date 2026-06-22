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
  Flame, 
  LogOut, 
  UploadCloud, 
  LayoutGrid, 
  ShieldAlert, 
  Sparkles, 
  Search, 
  Download, 
  Plus, 
  Globe, 
  Compass, 
  Heart, 
  Loader2, 
  Share2, 
  ExternalLink,
  Laptop,
  Image as ImageIcon
} from 'lucide-react';
import { Picture } from './types';
import AddPicForm from './components/AddPicForm';
import ModeratorQueue from './components/ModeratorQueue';
import PicCard from './components/PicCard';
import AuthModal from './components/AuthModal';
import ShareManifestModal from './components/ShareManifestModal';

// Categories matching standard aesthetic visual curation
const CATEGORIES = [
  'All', 
  'Aesthetic', 
  'Cyberpunk', 
  'Minimalist', 
  'Nature', 
  'Street Art', 
  'Abstract', 
  'Retro'
];

// Beautiful high-resolution premium initial default visual assets
const LOCAL_SEED_POSTS: Picture[] = [
  {
    id: 'seed-neon-tokyo',
    title: 'Rainy Sidewalks in Neo-Tokyo Shinjuku District',
    description: 'Electric cyan and violet glare reflecting effortlessly off the glistening asphalt. Shot with a vintage 50mm f/1.4 lens to emphasize local neon depth.',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=800&auto=format&fit=crop',
    uploaderId: 'curator-seed',
    uploaderName: 'CyberCurator',
    uploaderEmail: 'luckyglobalnews@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782122458 },
    likes: 42,
    category: 'Cyberpunk'
  },
  {
    id: 'seed-minimalist',
    title: 'Sunlight Pathing Through Scandinavian Minimalist Lounge',
    description: 'An study in natural geometry, neutral colors, wood grain, and warm organic negative space. Perfect inspiration for visual simplicity.',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop',
    uploaderId: 'curator-seed',
    uploaderName: 'SpaceAesthetic',
    uploaderEmail: 'luckyglobalnews@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782112458 },
    likes: 28,
    category: 'Minimalist'
  },
  {
    id: 'seed-nature-glow',
    title: 'Warm Alpenglow Coating Alpine Mountain Horizon',
    description: 'Breathtaking light refraction across granite cliffs right at the turn of twilight. Taken during gold hour at high altitude.',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop',
    uploaderId: 'curator-seed',
    uploaderName: 'ApexVision',
    uploaderEmail: 'luckyglobalnews@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782102458 },
    likes: 56,
    category: 'Nature'
  },
  {
    id: 'seed-abstract-fluid',
    title: 'Pastel Fluid Dynamics and Swirling Paints',
    description: 'Liquid acrylic exploration focusing on contrast gradients. Perfect aesthetic texture for desktop and mobile screen backgrounds.',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop',
    uploaderId: 'curator-seed',
    uploaderName: 'Chromatica',
    uploaderEmail: 'luckyglobalnews@gmail.com',
    uploaderRole: 'admin',
    status: 'approved',
    createdAt: { seconds: 1782092458 },
    likes: 39,
    category: 'Abstract'
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Real-time phone clock
  const [currentTime, setCurrentTime] = useState('12:00 PM');
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

  // Handle Progressive Web App installation triggers
  useEffect(() => {
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA launch installer criteria fulfilled.');
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
    console.log('User response to app installer popup:', outcome);
    setDeferredPrompt(null);
  };

  // Switch between smartphone simulator tabs
  const [activeTab, setActiveTab] = useState<'gallery' | 'my-uploads' | 'admin-board' | 'upload'>('gallery');
  const [approvedPics, setApprovedPics] = useState<Picture[]>([]);
  const [myPics, setMyPics] = useState<Picture[]>([]);
  const [picsLoading, setPicsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Core Firebase Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setConnectionVerified(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase response: App is working but client state is local.");
        }
      }
    }
    testConnection();
  }, []);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Administrator designated email
        const holdsAdminPrivileges = currentUser.email === 'luckyglobalnews@gmail.com';
        setIsAdmin(holdsAdminPrivileges);
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Sync approved uploads reactively
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

        // Soft internal sort
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

  // Sync current user's uploads reactively
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
      alert('Authentication popup canceled or failed to load.');
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

  // Merge database items with premium seed uploads for an out-of-the-box breath-taking look
  const getAllUnifiedPosts = () => {
    const dbPosts = [...approvedPics];
    const seededList = [...LOCAL_SEED_POSTS];
    
    const merged = [...dbPosts];
    seededList.forEach(seed => {
      if (!merged.some(p => p.title.toLowerCase() === seed.title.toLowerCase())) {
        merged.push(seed);
      }
    });

    return merged.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  };

  const unifiedPosts = getAllUnifiedPosts();

  // Perform multi-match client filter
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
      
      {/* Decorative ambient blurred orb flares */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none hidden lg:block" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-[140px] pointer-events-none hidden lg:block" />

      {/* Hero Curated Info Column (Left side of widescreen viewports) */}
      <div className="hidden lg:flex fixed left-8 xl:left-16 top-1/2 -translate-y-1/2 max-w-sm flex-col space-y-4 text-left z-10 overflow-y-auto max-h-[90vh] pr-2 scrollbar-none">
        
        {/* HotPic Primary Brand Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 border-2 border-orange-500/40 rounded-2xl overflow-hidden p-0.5 shadow-xl bg-gray-950 flex items-center justify-center animate-pulse">
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-slate-100 uppercase">
              HotPic
            </h1>
            <span className="text-[10px] uppercase font-mono tracking-widest text-orange-400 font-black block mt-1">
              Curated Art Collection
            </span>
          </div>
        </div>

        {/* Narrative introduction description */}
        <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
          <p>
            Welcome to the ultimate community wallpaper collection dashboard. We gather and showcase <strong className="text-slate-200">cyberpunk neon scenery, minimalist aesthetic structures, fluid digital paint arts</strong>, and high-resolution captures.
          </p>
          <p>
            Authentic visual items are processed through our multi-signature verification gateway. Sign in to contribute your unique captures, upload custom wallpapers, and upvote files.
          </p>
        </div>

        {/* Curation checklist */}
        <div className="p-4 bg-gray-950/80 border border-gray-901 rounded-2xl space-y-2 outline outline-1 outline-gray-900 shadow-md">
          <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Compass size={12} className="text-orange-500" />
            <span>Curatorial Guidelines</span>
          </h2>
          <p className="text-[11px] text-gray-500 leading-snug">
            We actively seek high-contrast, beautiful art directions including:
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] text-gray-400 font-mono">
            <span className="flex items-center gap-1">🌃 Cyberpunk Streets</span>
            <span className="flex items-center gap-1">🪵 Minimalist Rooms</span>
            <span className="flex items-center gap-1">🏜️ Golden Hour Glow</span>
            <span className="flex items-center gap-1">🎨 Fluid Gradients</span>
            <span className="flex items-center gap-1">📸 Analogue Vintage</span>
            <span className="flex items-center gap-1">🌾 Quiet Nature Scenic</span>
          </div>
        </div>

        {/* Community stats */}
        <div className="p-4 bg-gray-950/80 border border-gray-901 rounded-2xl space-y-2.5 outline outline-1 outline-gray-900">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Total Curators:</span>
            <span className="text-slate-100 font-bold font-mono">Active Community</span>
          </div>
          <div className="flex justify-between items-center text-[11px] border-t border-gray-900 pt-2">
            <span className="text-gray-400">Audit Response:</span>
            <span className="text-emerald-400 font-bold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Server Sync
            </span>
          </div>
        </div>

      </div>

      {/* Moderation Safety Gate Statement (Right side of widescreen viewports) */}
      <div className="hidden xl:flex fixed right-8 xl:right-16 top-1/2 -translate-y-1/2 max-w-xs flex-col space-y-4 text-left z-10">
        <div className="p-5 bg-gray-950/40 backdrop-blur-md border border-gray-900 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center space-x-1.5 text-[10px] font-black text-orange-400 uppercase tracking-widest font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span>Secure Gatekeeper</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            All submitted images, captions, and links undergo automated review by our administrative curators. Submissions bypass queues once approved by registered moderators.
          </p>
          <div className="pt-2.5 border-t border-gray-900 flex items-center justify-between text-[9px] text-gray-500 font-mono">
            <span>Server Version:</span>
            <span className="text-orange-400 font-bold font-mono">HotPic v2.4</span>
          </div>
        </div>

        {/* Install / Share prompt drawer trigger */}
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-[11px] font-bold rounded-xl transition duration-200 cursor-pointer text-orange-400 block text-center uppercase tracking-wider font-mono"
        >
          Add to Home Screen ➜
        </button>
      </div>

      {/* Main Handheld Smartphone Mock Wrapper */}
      <div className="w-full h-screen lg:h-[840px] lg:max-h-[92vh] lg:w-[410px] bg-[#090b0e] border-0 lg:border-[10px] lg:border-slate-800/90 lg:rounded-[50px] lg:shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(249,115,22,0.08)] relative overflow-hidden flex flex-col z-20">
        
        {/* Widescreen Camera lens physical notch indicator */}
        <div className="hidden lg:block absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-40 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#141416] border border-gray-900 absolute left-3.5" />
          <div className="w-1 h-1 rounded-full bg-slate-900 absolute right-7" />
        </div>

        {/* Native OS Simulator Top Bar */}
        <div className="bg-[#090b0e] h-10 px-6 shrink-0 flex items-center justify-between text-[10px] font-sans font-bold tracking-wide select-none z-30 border-b border-gray-950/60">
          <span className="text-slate-200">{currentTime}</span>
          
          {/* Simulated space reserve for notch */}
          <div className="hidden lg:block w-24" />

          {/* Connection metrics */}
          <div className="flex items-center space-x-1.5 text-slate-300">
            <div className="flex items-end space-x-[1.5px]" title="WiFi Status">
              <span className="w-[1.5px] h-1 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-1.5 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-2 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-2.5 bg-orange-500 rounded-px"></span>
              <span className="w-[1.5px] h-3 bg-orange-500 rounded-px"></span>
            </div>
            <span className="text-[8px] font-mono tracking-tight text-orange-400 font-black">5G</span>
            
            <svg className="w-3.5 h-3.5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.251 14.228c2.073-2.073 5.425-2.073 7.498 0m-9.996-2.498c3.456-3.457 9.061-3.457 12.518 0M3.75 8.25c4.761-4.761 12.48-4.761 17.24 0M12 18.75h.008v.008H12v-.008z" />
            </svg>

            <div className="w-5 h-2.5 border border-slate-500 rounded-[3px] p-[1.5px] flex items-center relative">
              <div className="h-full w-4/5 bg-gradient-to-r from-emerald-500 to-green-400 rounded-[1px]" />
              <div className="w-[1px] h-1 bg-slate-500 rounded-r-xs absolute -right-[1.5px]" />
            </div>
          </div>
        </div>

        {/* Compact Mobile App Header Bar */}
        <header className="bg-[#0f1115]/90 backdrop-blur-md px-4 py-3 shrink-0 flex items-center justify-between border-b border-gray-900 z-30">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('gallery')}>
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center border border-orange-400/20 shadow">
              <Flame className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-black bg-gradient-to-r from-slate-100 to-orange-400 bg-clip-text text-transparent uppercase tracking-tight">
                HotPic
              </span>
              <span className="text-[7.5px] text-orange-500 uppercase tracking-wider block leading-none font-bold">
                Aesthetic Curation
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Share action */}
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-1.5 rounded-lg bg-gray-950 hover:bg-gray-900 border border-gray-900 text-orange-400 transition cursor-pointer"
              title="Share Art App"
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
                title="Creator Workspace"
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

        {/* Scrollable Main Container Area for Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-none pb-24 bg-[#090b0e] flex flex-col">
          
          {/* Guest lock indicator */}
          {!user && activeTab !== 'gallery' && (
            <div className="px-5 py-12 text-center my-auto space-y-5">
              <div className="w-16 h-16 bg-gradient-to-b from-gray-900 to-transparent border border-gray-800 rounded-full flex items-center justify-center mx-auto text-2xl shadow-lg">
                🔒
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-100">Creation Workspace Locked</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Aesthetes and photographers sign in to add visual layouts, save curated wallpapers, upvote uploads, or track private contributions.
                </p>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:scale-[1.01] active:scale-95 cursor-pointer transition"
              >
                Sign In / Sign Up
              </button>
            </div>
          )}

          {/* Active Tab Area: Shared Art Stream */}
          {activeTab === 'gallery' && (
            <div className="p-4 space-y-4">
              
              {/* HotPic Greeting Banner */}
              <div className="p-3.5 bg-[#0f1115] border border-gray-905 rounded-2xl relative overflow-hidden space-y-1 shadow-sm outline outline-1 outline-gray-900">
                <div className="flex items-center space-x-1 text-[10px] font-extrabold text-orange-400 uppercase tracking-widest leading-none font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Curators feed dashboard</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Browse high-contrast cyberpunk neon scenery, minimalist spacing, fluid pastel colors, and high-resolution vintage analog photographs.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/10 text-[9px] font-bold text-orange-400 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus size={8} /> Add to Home Screen
                  </button>
                  <button
                    onClick={() => {
                      if (!user) setIsAuthModalOpen(true);
                      else setActiveTab('upload');
                    }}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-[9px] text-gray-400 hover:text-slate-200 border border-gray-800 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <UploadCloud size={8} /> Share Photo
                  </button>
                </div>
              </div>

              {/* Slider for Categories */}
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

                {/* Aesthetic Search Bar */}
                <div className="relative w-full">
                  <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search aesthetic focuses, artists, colors..."
                    className="w-full bg-gray-950/80 border border-gray-900 rounded-xl pl-9 pr-4 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-orange-500 placeholder:text-gray-600 transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Feed Grid representation */}
              {picsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 text-orange-500 animate-spin mb-3" />
                  <span className="text-[10px] font-mono text-gray-400">Syncing aesthetic boards...</span>
                </div>
              ) : filteredPics.length === 0 ? (
                <div className="text-center py-16 bg-[#0f1115] border border-dashed border-gray-900 rounded-2xl">
                  <span className="text-2xl block mb-2">🏜️</span>
                  <p className="text-[11px] font-bold text-slate-400">No Captures Match Grid</p>
                  <p className="text-[10px] text-gray-600 mt-1">Try choosing another tag or upload your own visuals!</p>
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

          {/* Active Tab Area: User Submissions Tracking */}
          {user && activeTab === 'my-uploads' && (
            <div className="p-4 space-y-4">
              <div className="border-b border-gray-900 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Your Aesthetic Submissions</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Track approved posts and designs currently being audited by active moderators.
                </p>
              </div>

              {myPics.length === 0 ? (
                <div className="text-center py-12 bg-[#0f1115] border border-gray-900 rounded-2xl space-y-3">
                  <p className="text-[11px] text-gray-500">You haven't uploaded any aesthetic pictures yet.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-orange-400 px-4 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    Submit First Post
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

          {/* Active Tab Area: Upload Panel */}
          {user && activeTab === 'upload' && (
            <div className="p-4 space-y-3">
              <div className="text-center pb-2 border-b border-gray-900">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Publish New Art Capture</h3>
                <p className="text-[9.5px] text-gray-500 mt-0.5">
                  Add custom photos, wallpapers, digital artwork configurations, or analog camera shots!
                </p>
              </div>
              
              <div className="bg-[#090b0e] rounded-xl font-sans">
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

          {/* Active Tab Area: Moderator Review Board */}
          {user && isAdmin && activeTab === 'admin-board' && (
            <div className="p-4 space-y-4">
              <div className="border-b border-red-500/20 pb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <h3 className="text-xs font-black uppercase text-red-500 tracking-wider">HotPic Audit Control panel</h3>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Moderator tools block. Confirm or deny public listings.
                </p>
              </div>
              <ModeratorQueue adminUid={user.uid} />
            </div>
          )}

        </main>

        {/* Bottom Smartphone Sticky Navigation Bar */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#0f1115]/95 backdrop-blur-md border-t border-gray-900 px-3 py-1.5 z-30 flex items-center justify-around select-none">
          
          {/* Gallery Trigger */}
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition duration-150 relative cursor-pointer ${
              activeTab === 'gallery' ? 'text-orange-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutGrid size={15} className="mb-0.5" />
            <span className="text-[8.5px] tracking-tight">Gallery Feed</span>
          </button>

          {/* Upload central accent key */}
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
            title="Upload Photo"
          >
            <UploadCloud size={16} />
          </button>

          {/* My Submissions Trigger */}
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
            <ImageIcon size={15} className="mb-0.5" />
            <span className="text-[8.5px] tracking-tight">My Captures</span>
            
            {user && myPics.length > 0 && (
              <span className="absolute top-0 right-2 bg-orange-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-950 scale-90 animate-pulse">
                {myPics.length}
              </span>
            )}
          </button>

          {/* Moderator Queue button (staff/admin) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin-board')}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-xl transition duration-150 relative cursor-pointer ${
                activeTab === 'admin-board' ? 'text-red-400 font-bold' : 'text-slate-500 hover:text-red-400'
              }`}
            >
              <ShieldAlert size={15} className="mb-0.5" />
              <span className="text-[8.5px] tracking-tight">Mod Queue</span>
            </button>
          )}

        </nav>

        {/* Physical Home bar indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-800 rounded-full z-45 pointer-events-none hidden lg:block" />

        {/* Bottom Profile Settings drawer panel */}
        {isProfileDrawerOpen && user && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
            <div className="absolute inset-0 -z-10" onClick={() => setIsProfileDrawerOpen(false)} />
            
            <div className="w-full bg-[#0f1115] border-t border-gray-800 rounded-t-[32px] p-6 space-y-5 shadow-2xl relative">
              
              <div className="w-10 h-1 bg-gray-800 rounded-full mx-auto mb-1 pointer-events-none" />

              {/* Profile card details */}
              <div className="flex items-center space-x-3.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-orange-500/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white flex items-center justify-center font-black text-sm uppercase font-mono">
                    {user.email?.substring(0, 1)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{user.displayName || 'Contributor'}</h4>
                  <p className="text-[10px] text-gray-500">{user.email}</p>
                </div>
              </div>

              {/* Quick stats items */}
              <div className="grid grid-cols-2 gap-3 font-mono text-center">
                <div className="p-3 bg-gray-950 rounded-2xl space-y-0.5 border border-gray-901">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold tracking-wider">Posts</span>
                  <span className="text-lg font-black text-orange-400">{myPics.length} logs</span>
                </div>
                <div className="p-3 bg-gray-950 rounded-2xl space-y-0.5 border border-gray-901">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold tracking-wider">Role</span>
                  <span className="text-xs font-bold text-slate-300 block pt-1 uppercase">
                    {isAdmin ? '🛡️ Admin' : '✨ Creator'}
                  </span>
                </div>
              </div>

              {/* General Control triggers */}
              <div className="space-y-2 pt-2">
                
                <button
                  onClick={() => {
                    setIsProfileDrawerOpen(false);
                    setIsShareModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer font-mono uppercase"
                >
                  <span>App Install Links</span>
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
                  <span>Logout Curator Session</span>
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

      {/* Authentication and setup Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* PWA asset share and setup Modal */}
      <ShareManifestModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
      />
    </div>
  );
}
