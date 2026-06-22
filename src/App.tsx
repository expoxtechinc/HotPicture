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
  BookHeart, 
  Search, 
  Filter, 
  Loader2, 
  Layers,
  Share2
} from 'lucide-react';
import { Picture } from './types';
import AddPicForm from './components/AddPicForm';
import ModeratorQueue from './components/ModeratorQueue';
import PicCard from './components/PicCard';
import AuthModal from './components/AuthModal';
import ShareManifestModal from './components/ShareManifestModal';

const CATEGORIES = ['All', 'Cyberpunk', 'Scenic', 'Abstract', 'City', 'Animals', 'Cosmos', 'Minimalist', 'Other'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Mobile app simulator status states
  const [currentTime, setCurrentTime] = useState('02:40 PM');
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

  // Connection validation
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

  // State for pictures tabs & records
  const [activeTab, setActiveTab] = useState<'gallery' | 'my-uploads' | 'admin-board' | 'upload'>('gallery');
  const [approvedPics, setApprovedPics] = useState<Picture[]>([]);
  const [myPics, setMyPics] = useState<Picture[]>([]);
  const [picsLoading, setPicsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Firebase connection validation as mandated in the Integration Skill guidelines
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

  // Real-time listener for Approved Pictures (Feeds)
  useEffect(() => {
    setPicsLoading(true);

    // Fetch approved pictures (Standard User Feed)
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

        // Client-side sorting to bypass composite indexing constraints
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

  // Real-time listener for "My Uploads" drafts (when signed in)
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

        // Client-side sorting
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

  // Perform client-side filter of the approved pictures list
  const filteredPics = approvedPics.filter((pic) => {
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
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none hidden lg:block" />

      {/* Hero Welcome Info Panel (Left side on widescreen viewports) */}
      <div className="hidden lg:flex fixed left-10 xl:left-24 top-1/2 -translate-y-1/2 max-w-sm flex-col space-y-5 text-left z-10">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 border-2 border-orange-500/40 rounded-2xl overflow-hidden p-0.5 shadow-xl bg-gray-950">
            <img 
              src="https://www.image2url.com/r2/default/images/1782122458339-80716311-65c7-48fb-91f5-2ba699bea415.jpg" 
              alt="HotPic App Logo" 
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-rose-400 to-red-500 bg-clip-text text-transparent">
              HotPic Elite
            </h1>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#f97316] font-bold block -mt-1">
              Mobile App Experience
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
          Welcome to the native mobile interface. All features — including tactile categories, photo curation feeds, real-time secure submission trackers, and gatekeeper controls — are optimized for a native touch grid.
        </p>

        {/* Offline & share checklist specs inside desktop viewer */}
        <div className="p-4 bg-gray-950/80 border border-gray-800/80 rounded-2xl space-y-3 shadow-lg">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <span className="text-orange-400">⚡</span>
            <span>Progressive Installation</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-normal">
            To view this app on your physical device, scan the layout on your phone or launch the Sharing Center to distribute via WhatsApp, Telegram, or Xender hotspot setups!
          </p>
          
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="w-full py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 text-[11px] font-bold rounded-xl transition duration-200 cursor-pointer text-orange-400"
          >
            Open Distribution Center
          </button>
        </div>
      </div>

      {/* Mobile Security Gatekeeper Notice (Right side on ultra-widescreen viewports) */}
      <div className="hidden xl:flex fixed right-10 xl:right-24 top-1/2 -translate-y-1/2 max-w-xs flex-col space-y-4 text-left z-10">
        <div className="p-5 bg-gray-950/40 backdrop-blur-md border border-gray-900 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center space-x-1.5 text-[10px] font-black text-rose-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
            <span>Gatekeeper System Active</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            All submitted captured feeds are stored securely in cloud-backed databases. System moderation holds standard safety constraints instantly managed by designated administrators.
          </p>
          <div className="pt-2 border-t border-gray-900 flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>Server Ingress:</span>
            <span className="text-emerald-400">Port 3000 (Protected)</span>
          </div>
        </div>
      </div>

      {/* Main Handheld Smartphone Mock Container */}
      {/* Resizes perfectly: Full screen natively on true mobile viewports (< lg), styled iPhone chassis on wider desktop displays (lg) */}
      <div className="w-full h-screen lg:h-[840px] lg:max-h-[92vh] lg:w-[410px] bg-[#090b0e] border-0 lg:border-[10px] lg:border-slate-800/90 lg:rounded-[50px] lg:shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(249,115,22,0.08)] relative overflow-hidden flex flex-col z-20">
        
        {/* Physical Camera lens Notch indicator (Only visible on Simulated Desktop Screen Frame) */}
        <div className="hidden lg:block absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-40 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#141416] border border-gray-900 absolute left-3.5" />
          <div className="w-1 h-1 rounded-full bg-blue-950 absolute right-7" />
        </div>

        {/* Simulated Native OS Status Bar */}
        <div className="bg-[#090b0e] h-10 px-6 shrink-0 flex items-center justify-between text-[10px] font-sans font-bold tracking-wide select-none z-30 border-b border-gray-950/60">
          {/* Hardware Clock */}
          <span className="text-slate-200">{currentTime}</span>
          
          {/* Simulated Notch spacer in desktop window */}
          <div className="hidden lg:block w-24" />

          {/* Network Connection Indicators */}
          <div className="flex items-center space-x-1.5 text-slate-300">
            {/* 5-Bar Signal Level indicator */}
            <div className="flex items-end space-x-[1.5px]" title="5G Secure Handshake verified">
              <span className="w-[1.5px] h-1 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-1.5 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-2 bg-orange-400 rounded-px"></span>
              <span className="w-[1.5px] h-2.5 bg-orange-500 rounded-px"></span>
              <span className="w-[1.5px] h-3 bg-red-500 rounded-px"></span>
            </div>
            <span className="text-[8px] font-mono tracking-tight text-orange-400 font-black">5G</span>
            
            {/* Wi-Fi Wave Icon */}
            <svg className="w-3.5 h-3.5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.251 14.228c2.073-2.073 5.425-2.073 7.498 0m-9.996-2.498c3.456-3.457 9.061-3.457 12.518 0M3.75 8.25c4.761-4.761 12.48-4.761 17.24 0M12 18.75h.008v.008H12v-.008z" />
            </svg>

            {/* Battery Cell outline */}
            <div className="w-5 h-2.5 border border-slate-500 rounded-[3px] p-[1.5px] flex items-center relative">
              <div className="h-full w-4/5 bg-gradient-to-r from-emerald-500 to-green-400 rounded-[1px]" />
              <div className="w-[1px] h-1 bg-slate-500 rounded-r-xs absolute -right-[1.5px]" />
            </div>
            <span className="text-[8px] font-mono text-slate-400">81%</span>
          </div>
        </div>

        {/* Compact Mobile App Header Bar */}
        <header className="bg-[#0f1115]/90 backdrop-blur-md px-4 py-3 shrink-0 flex items-center justify-between border-b border-gray-900 z-30">
          <div className="flex items-center space-x-2" onClick={() => setActiveTab('gallery')}>
            <img 
              src="https://www.image2url.com/r2/default/images/1782122458339-80716311-65c7-48fb-91f5-2ba699bea415.jpg" 
              alt="Logo" 
              className="w-7 h-7 object-cover rounded-lg border border-orange-500/20 shadow"
            />
            <div>
              <span className="text-sm font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                HotPic
              </span>
              <span className="text-[7.5px] text-orange-500 uppercase tracking-wider block leading-none font-bold">
                Elite Gallery
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Share app icon trigger */}
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-1.5 rounded-lg bg-gray-950 hover:bg-gray-900 border border-gray-900 text-orange-400 transition cursor-pointer"
              title="Share app"
            >
              <Share2 size={13} />
            </button>

            {/* User Profile Avatar / Sign In indicator */}
            {authLoading ? (
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
            ) : user ? (
              <button 
                onClick={() => setIsProfileDrawerOpen(true)}
                className="relative p-0.5 rounded-full border border-orange-500/40 focus:outline-none transition active:scale-95"
                title="View user profile"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                    {user.email?.substring(0, 1)}
                  </div>
                )}
                {/* Active contributor dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-[9px] font-bold text-white shadow-md cursor-pointer transition hover:scale-[1.02] active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Interactive Scrolling Container Area for Tabs Content */}
        <main className="flex-1 overflow-y-auto scrollbar-none pb-24 bg-[#090b0e] flex flex-col">
          
          {/* Guest lock message details if unauthorized to view tracker/upload */}
          {!user && activeTab !== 'gallery' && (
            <div className="px-5 py-12 text-center my-auto space-y-5">
              <div className="w-16 h-16 bg-gradient-to-b from-gray-900 to-transparent border border-gray-800 rounded-full flex items-center justify-center mx-auto text-2xl shadow-lg">
                🔒
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-100">Contribution Center Locked</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Sign in with your verification account to post beautiful captures, vote on categories, use seed presets, and monitor submission pipelines in real-time.
                </p>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:scale-[1.01] active:scale-95 cursor-pointer transition"
              >
                Sign In / Authenticate Now
              </button>
            </div>
          )}

          {/* Active Tab Area: Gallery Feeds */}
          {activeTab === 'gallery' && (
            <div className="p-4 space-y-4">
              
              {/* Interactive Small Welcome Banner Inside the Phone Device */}
              <div className="p-3.5 bg-[#0f1115] border border-gray-900 rounded-2xl relative overflow-hidden space-y-1 shadow-sm">
                <div className="flex items-center space-x-1 text-[10px] font-extrabold text-orange-400 uppercase tracking-widest leading-none">
                  <span>★ Community Curation Board</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Posting raw captures, aesthetic cyberpunk frames, and scrolling unique premium artwork. Direct installation supported!
                </p>
              </div>

              {/* Filtering Controls: Compact Category Slider */}
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
                    placeholder="Search captures, tag, or author..."
                    className="w-full bg-gray-950/80 border border-gray-900 rounded-xl pl-9 pr-4 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-orange-500 placeholder:text-gray-600 transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Feed Content */}
              {picsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-7 h-7 text-orange-500 animate-spin mb-3" />
                  <span className="text-[10px] font-mono text-gray-500">Loading curation boards...</span>
                </div>
              ) : filteredPics.length === 0 ? (
                <div className="text-center py-16 bg-[#0f1115] border border-dashed border-gray-900 rounded-2xl">
                  <span className="text-2xl block mb-2">🏜️</span>
                  <p className="text-[11px] font-bold text-slate-400">No Captures Match</p>
                  <p className="text-[10px] text-gray-600 mt-1">Try searching a different tag or submit your own shot!</p>
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
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">My Submissions Tracker</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Track approved photos and draft files in queue moderation.
                </p>
              </div>

              {myPics.length === 0 ? (
                <div className="text-center py-12 bg-[#0f1115] border border-gray-900 rounded-2xl space-y-3">
                  <p className="text-[11px] text-gray-500">You haven't submitted any Captures yet.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-orange-400 px-4 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer"
                  >
                    Submit Custom Pic
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

          {/* Active Tab Area: Image Upload Panel */}
          {user && activeTab === 'upload' && (
            <div className="p-4 space-y-3">
              <div className="text-center pb-2 border-b border-gray-900">
                <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Submit Capture</h3>
                <p className="text-[9.5px] text-gray-500 mt-0.5">
                  Publish high-definition presets or generate customized content seeds!
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
                  <h3 className="text-xs font-black uppercase text-red-400 tracking-wider">Audit Queue Command</h3>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Immediate security validation access for luckyglobalnews@gmail.com
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
            <span className="text-[8.5px] tracking-tight">Gallery</span>
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
            className={`flex flex-col items-center justify-center -translate-y-2 cursor-pointer w-11 h-11 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold transition shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 z-40 ${
              activeTab === 'upload' ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-[#0f1115]' : ''
            }`}
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
            <BookHeart size={15} className="mb-0.5" />
            <span className="text-[8.5px] tracking-tight">My Submissions</span>
            
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
                activeTab === 'admin-board' ? 'text-red-400 font-bold' : 'text-yellow-500/60 hover:text-yellow-400'
              }`}
            >
              <ShieldAlert size={15} className="mb-0.5" />
              <span className="text-[8.5px] tracking-tight">Audit</span>
            </button>
          )}

        </nav>

        {/* Simulated iOS/Android Bottom Home Indicator Line Bar */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-800 rounded-full z-45 pointer-events-none hidden lg:block" />

        {/* Mobile Settings Drawer Sheet (Bottom Sheet Trigger when clicking user avatar) */}
        {isProfileDrawerOpen && user && (
          <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
            {/* Click-away backdrop dismiss container */}
            <div className="absolute inset-0 -z-10" onClick={() => setIsProfileDrawerOpen(false)} />
            
            {/* Physical Drawer Sheet Content */}
            <div className="w-full bg-[#0f1115] border-t border-gray-800 rounded-t-[32px] p-6 space-y-5 shadow-2xl relative">
              
              {/* Bezel Pull line accent */}
              <div className="w-10 h-1 bg-gray-800 rounded-full mx-auto mb-1 pointer-events-none" />

              {/* Profile Overview */}
              <div className="flex items-center space-x-3.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-orange-500/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-white flex items-center justify-center font-black text-sm uppercase">
                    {user.email?.substring(0, 1)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{user.displayName || 'Contributor Account'}</h4>
                  <p className="text-[10px] text-gray-500">{user.email}</p>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-950 rounded-2xl text-center space-y-0.5 border border-gray-900">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold font-mono tracking-wider">Aesthetic Uploads</span>
                  <span className="text-lg font-black text-orange-400">{myPics.length} posts</span>
                </div>
                <div className="p-3 bg-gray-950 rounded-2xl text-center space-y-0.5 border border-gray-900">
                  <span className="text-[10px] text-gray-500 uppercase block font-bold font-mono tracking-wider">Account Role</span>
                  <span className="text-xs font-bold text-slate-300 block pt-1">
                    {isAdmin ? '🛡️ Administrator' : '✨ Contributor'}
                  </span>
                </div>
              </div>

              {/* Action Lists */}
              <div className="space-y-2 pt-2">
                
                {/* Instant share launcher */}
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

                {/* Secure Sign Out Button */}
                <button
                  onClick={async () => {
                    setIsProfileDrawerOpen(false);
                    await handleSignOut();
                  }}
                  className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-900 border border-gray-900 text-gray-400 hover:text-rose-400 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Logout Contributor Session</span>
                </button>

                <button
                  onClick={() => setIsProfileDrawerOpen(false)}
                  className="w-full py-2 px-4 bg-gray-950 hover:bg-gray-900 text-slate-400 text-[10.5px] rounded-xl text-center font-bold tracking-wide transition cursor-pointer"
                >
                  Close Settings Panel
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
