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
  Layers 
} from 'lucide-react';
import { Picture } from './types';
import AddPicForm from './components/AddPicForm';
import ModeratorQueue from './components/ModeratorQueue';
import PicCard from './components/PicCard';
import AuthModal from './components/AuthModal';

const CATEGORIES = ['All', 'Cyberpunk', 'Scenic', 'Abstract', 'City', 'Animals', 'Cosmos', 'Minimalist', 'Other'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Connection validation
  const [connectionVerified, setConnectionVerified] = useState(false);

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
    <div className="min-h-screen bg-[#090b0e] text-slate-100 flex flex-col font-sans transition-colors duration-300 selection:bg-orange-500 selection:text-white">
      {/* Upper Brand strip / Header */}
      <header className="sticky top-0 z-30 bg-[#0f1115]/95 backdrop-blur-md border-b border-gray-800/80 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('gallery')}>
            <div className="relative w-9 h-9 border border-orange-500/30 rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
              <img 
                src="https://www.image2url.com/r2/default/images/1782122458339-80716311-65c7-48fb-91f5-2ba699bea415.jpg" 
                alt="HotPic Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent font-sans">
                HotPic
              </span>
              <span className="hidden sm:inline text-[9px] uppercase tracking-widest text-slate-500 font-mono block -mt-1 font-bold">
                Elite Gallery
              </span>
            </div>
          </div>

          {/* Controller and Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === 'gallery' 
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                  : 'text-gray-400 hover:text-slate-100'
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Gallery</span>
            </button>

            {user && (
              <>
                <button
                  onClick={() => setActiveTab('my-uploads')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    activeTab === 'my-uploads' 
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                      : 'text-gray-400 hover:text-slate-100'
                  }`}
                >
                  <BookHeart size={13} />
                  <span className="hidden sm:inline">My Uploads</span>
                  {myPics.length > 0 && (
                    <span className="ml-1 bg-gray-800 text-slate-300 text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {myPics.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    activeTab === 'upload' 
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                      : 'text-gray-400 hover:text-slate-100'
                  }`}
                >
                  <UploadCloud size={13} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </>
            )}

            {/* Moderation board only visible to luckyglobalnews@gmail.com */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin-board')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  activeTab === 'admin-board' 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                    : 'text-yellow-500 hover:text-yellow-400 font-bold bg-yellow-500/5'
                }`}
              >
                <ShieldAlert size={13} />
                <span>Audit</span>
              </button>
            )}
          </nav>

          {/* User Profile Auth action */}
          <div className="flex items-center space-x-3">
            {authLoading ? (
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            ) : user ? (
              <div className="flex items-center space-x-2.5">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                    {user.displayName}
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono flex items-center justify-end space-x-1">
                    {isAdmin ? (
                      <span className="text-red-400 font-semibold uppercase">Administrator</span>
                    ) : (
                      <span className="text-gray-400">Contributor</span>
                    )}
                  </div>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || ''}
                    className="w-8 h-8 rounded-full border border-gray-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user.email?.substring(0, 1)}
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="bg-transparent hover:bg-gray-800 text-gray-400 hover:text-slate-100 p-1.5 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md shadow-orange-500/10"
              >
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Hero Accent Strip */}
      <div className="bg-gradient-to-b from-[#111319] to-transparent py-8 px-4 md:px-8 border-b border-gray-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center space-x-2">
              <span>Aesthetic Captures</span>
              <span className="text-lg">✨</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              An elegant board of community curated photography. Join us by signing in, posting your best raw captures, and interacting with works of others. Uploader status takes effect instantly once approved!
            </p>
          </div>
          
          {/* Admin Announcement Banner */}
          {user && isAdmin && (
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl flex items-center space-x-3 font-sans">
              <span className="text-rose-400 text-xs font-bold font-mono">🔧 AUDITING PRIVILEGES ENFORCED</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">

        {/* Auth prompt if logged out and looking at non-gallery tabs */}
        {!user && activeTab !== 'gallery' && (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl space-y-4">
            <div className="text-4xl text-orange-400">🔒</div>
            <h2 className="text-lg font-semibold text-slate-100">Secure Space Locked</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              You must sign in with your account to upload photos, track your submissions, and unlock interaction points.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-2.5 px-6 rounded-xl text-xs font-semibold cursor-pointer transition hover:scale-102"
            >
              Sign In / Register now
            </button>
          </div>
        )}

        {/* Tab 1: Approved Gallery */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            
            {/* Search & Categories filtering block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f1115] border border-gray-800/80 p-4 rounded-xl">
              
              {/* Category select list */}
              <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none scroll-smooth">
                <Filter size={14} className="text-gray-500 shrink-0" />
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-gray-800 text-gray-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search titles, authors..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-orange-500 font-sans"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

            </div>

            {/* Picture Grid list */}
            {picsLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <span className="text-sm font-mono text-gray-400">Loading gallery boards...</span>
              </div>
            ) : filteredPics.length === 0 ? (
              <div className="text-center py-20 bg-gray-900 border border-dashed border-gray-800 rounded-2xl">
                <span className="text-3xl">🏜️</span>
                <p className="text-sm font-semibold text-slate-300 mt-2">No Approved Pics Found</p>
                <p className="text-xs text-gray-500 mt-1">Be the first to upload an aesthetic shot!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

        {/* Tab 2: User drafts/uploads tracking */}
        {user && activeTab === 'my-uploads' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-slate-100">My Submissions Tracker</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Review your uploaded photos and monitor their status within the moderator queue.
              </p>
            </div>

            {myPics.length === 0 ? (
              <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl space-y-3">
                <p className="text-sm text-gray-400">You haven't posted any photos yet.</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="bg-gray-800 hover:bg-gray-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Create First Upload
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

        {/* Tab 3: Upload panel form */}
        {user && activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-gray-800 text-center max-w-xl mx-auto">
              <h2 className="text-lg font-semibold text-slate-100">Submit Capture</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Select from our curated high-definition stock presets or roll custom seed generations!
              </p>
            </div>
            <AddPicForm 
              user={user} 
              isAdmin={isAdmin} 
              onSuccess={() => {
                // Return to gallery or my-uploads so they see their capture
                setTimeout(() => {
                  setActiveTab(isAdmin ? 'gallery' : 'my-uploads');
                }, 1500);
              }}
            />
          </div>
        )}

        {/* Tab 4: Mod Board */}
        {user && isAdmin && activeTab === 'admin-board' && (
          <ModeratorQueue adminUid={user.uid} />
        )}

      </main>

      {/* Humble styling Footer */}
      <footer className="bg-[#0b0c10] border-t border-gray-900 py-6 text-center text-xs text-gray-600 font-mono tracking-tight mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <span>🛡️ HotPic Secure Gatekeeper moderated. Powered by Google Cloud Run.</span>
          <span>© 2026 HotPic. Developed for secure client environments.</span>
        </div>
      </footer>

      {/* Elegant overlay AuthModal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
