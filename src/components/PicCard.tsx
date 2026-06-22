import { useEffect, useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, deleteDoc, writeBatch, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Picture } from '../types';
import { Heart, Trash2, Calendar, User, X, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';

interface PicCardProps {
  pic: Picture;
  currentUserUid: string | null;
  isAdmin: boolean;
  key?: string | number;
}

export default function PicCard({ pic, currentUserUid, isAdmin }: PicCardProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Subscribe to this picture's specific user like doc to reactively display liked state
  useEffect(() => {
    if (!currentUserUid) {
      setHasLiked(false);
      return;
    }

    const likeRef = doc(db, 'pictures', pic.id, 'likes', currentUserUid);
    const unsub = onSnapshot(
      likeRef,
      (docSnap) => {
        setHasLiked(docSnap.exists());
      },
      (err) => {
        console.error('Failed to subscribe to like state:', err);
      }
    );

    return () => unsub();
  }, [pic.id, currentUserUid]);

  // Prevent background scrolling when lightbox is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleLikeToggle = async () => {
    if (!currentUserUid) {
      alert('Sign in to interact/like pictures!');
      return;
    }
    if (loadingLike) return;

    setLoadingLike(true);
    const batch = writeBatch(db);
    const picDocRef = doc(db, 'pictures', pic.id);
    const likeDocRef = doc(db, 'pictures', pic.id, 'likes', currentUserUid);

    try {
      if (hasLiked) {
        // Prepare Unlike operations
        batch.delete(likeDocRef);
        batch.update(picDocRef, {
          likes: Math.max(0, pic.likes - 1),
        });
        await batch.commit();
      } else {
        // Prepare Like operations
        batch.set(likeDocRef, {
          id: currentUserUid,
          userId: currentUserUid,
          pictureId: pic.id,
          createdAt: serverTimestamp(),
        });
        batch.update(picDocRef, {
          likes: pic.likes + 1,
        });
        await batch.commit();
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `pictures/${pic.id}`);
    } finally {
      setLoadingLike(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this picture post permanently?')) {
      return;
    }

    const picRef = doc(db, 'pictures', pic.id);
    try {
      await deleteDoc(picRef);
      if (isFullscreen) {
        setIsFullscreen(false);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `pictures/${pic.id}`);
    }
  };

  const handleShareUrl = () => {
    const rawUrl = pic.imageUrl;
    navigator.clipboard.writeText(rawUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const isOwner = currentUserUid === pic.uploaderId;
  const showDelete = isOwner || isAdmin;

  // Format creation date beautifully
  const getFormattedDate = () => {
    if (!pic.createdAt) return 'Recent';
    const dateObj = pic.createdAt.toDate ? pic.createdAt.toDate() : new Date(pic.createdAt);
    return dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="bg-[#0f1115] border border-gray-900 rounded-2xl overflow-hidden shadow-lg group hover:border-gray-800 transition-all duration-300 flex flex-col justify-between">
        <div>
          {/* Aspect Wrapper */}
          <div 
            onClick={() => setIsFullscreen(true)}
            className="relative group aspect-[4/3] bg-black overflow-hidden cursor-zoom-in"
          >
            <img
              src={pic.imageUrl}
              alt={pic.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            {/* Tag Top Left */}
            <span className="absolute top-3 left-3 bg-gray-950/85 backdrop-blur-md text-orange-400 border border-gray-900 rounded-full px-2.5 py-0.5 text-[9px] font-mono tracking-wider uppercase font-bold">
              {pic.category}
            </span>

            {/* Tap zoom indicator overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <span className="px-3 py-1.5 bg-black/80 rounded-xl text-[9px] font-bold text-slate-200 border border-gray-900 select-none">
                🔍 Double-click or Tap to View
              </span>
            </div>

            {/* Show pending badge */}
            {pic.status === 'pending' && (
              <span className="absolute top-3 right-3 bg-yellow-500/10 backdrop-blur-md text-yellow-400 border border-yellow-500/35 rounded px-2 py-0.5 text-[8.5px] font-sans font-black uppercase tracking-wider">
                Pending
              </span>
            )}
            {pic.status === 'rejected' && (
              <span className="absolute top-3 right-3 bg-red-500/10 backdrop-blur-md text-red-400 border border-red-500/35 rounded px-2 py-0.5 text-[8.5px] font-sans font-black uppercase tracking-wider">
                Rejected
              </span>
            )}
          </div>

          {/* Contents */}
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 
                onClick={() => setIsFullscreen(true)}
                className="font-bold text-slate-100 text-xs md:text-sm leading-tight tracking-tight hover:text-orange-400 transition-colors cursor-zoom-in line-clamp-1"
                title={pic.title}
              >
                {pic.title}
              </h3>
              {showDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="text-gray-500 hover:text-rose-500 p-1 rounded-md hover:bg-gray-950 transition cursor-pointer"
                  title="Delete Post"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <p className="text-[10.5px] text-gray-500 leading-relaxed font-sans line-clamp-2">
              {pic.description || 'No custom description provided for this raw capture.'}
            </p>
          </div>
        </div>

        {/* Footer Meta info */}
        <div className="px-4 pb-4 pt-2.5 border-t border-gray-950 flex items-center justify-between bg-[#0b0c10]/40">
          <div className="space-y-0.5 min-w-0 flex-1 mr-2">
            <div className="flex items-center space-x-1 text-[9.5px] text-gray-400 font-sans">
              <User size={9} className="text-gray-600 shrink-0" />
              <span className="truncate text-gray-400 font-medium">
                {pic.uploaderName}
              </span>
              {pic.uploaderRole === 'admin' && (
                <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[7px] font-mono rounded px-1 shrink-0">
                  Staff
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 text-[8.5px] text-gray-600 font-mono">
              <Calendar size={9} className="shrink-0" />
              <span>{getFormattedDate()}</span>
            </div>
          </div>

          {/* Like trigger button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLikeToggle();
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition shrink-0 ${
              hasLiked
                ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/15'
                : 'bg-gray-950 hover:bg-gray-900 text-slate-400 border border-gray-900'
            }`}
          >
            <Heart size={10} className={hasLiked ? 'fill-current' : ''} />
            <span>{pic.likes}</span>
          </button>
        </div>
      </div>

      {/* Fullscale Lightbox Image Modal Presentation */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/98 backdrop-blur-md flex flex-col justify-between overflow-y-auto"
          id="photo-lightbox-modal"
          onClick={() => {
            setIsFullscreen(false);
            setIsZoomed(false);
          }}
        >
          {/* Top Control Bar Area */}
          <div 
            className="w-full bg-gradient-to-b from-black/95 to-transparent p-4 md:p-6 flex items-center justify-between z-10 shrink-0 gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 max-w-[65%]">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-950 flex items-center justify-center text-[10px] font-mono font-black text-orange-400 border border-orange-500/30 shrink-0 select-none">
                {pic.category.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-slate-100 font-black text-xs md:text-sm tracking-tight truncate leading-tight">
                  {pic.title}
                </h4>
                <span className="text-[9px] text-gray-400 block mt-0.5 truncate uppercase tracking-wider font-mono">
                  Curated Capture • #{pic.category}
                </span>
              </div>
            </div>

            {/* Quick Actions (Close, Zoom, Share, Download) */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {/* Zoom control toggle */}
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-1.5 bg-gray-900 border border-gray-800 text-slate-300 hover:text-orange-400 rounded-lg transition shrink-0 cursor-pointer"
                title="Toggle Digital Zoom"
              >
                {isZoomed ? <ZoomOut size={13} /> : <ZoomIn size={13} />}
              </button>

              {/* Share Image URL */}
              <button
                onClick={handleShareUrl}
                className={`p-1.5 border rounded-lg transition shrink-0 cursor-pointer ${
                  copiedShare 
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400' 
                    : 'bg-gray-900 border-gray-800 text-slate-300 hover:text-orange-400'
                }`}
                title="Copy secure link to share"
              >
                <Share2 size={13} />
              </button>

              {/* Download original image */}
              <a
                href={pic.imageUrl}
                target="_blank"
                rel="noreferrer"
                download={pic.title || "hotpic"}
                className="p-1.5 bg-gray-900 hover:bg-orange-500 text-slate-300 hover:text-white border border-gray-800 hover:border-orange-500 rounded-lg transition shrink-0"
                title="Download file"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={13} />
              </a>

              {/* Master Close Toggle */}
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  setIsZoomed(false);
                }}
                className="p-1.5 bg-red-500/10 hover:bg-red-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-red-500 rounded-lg transition shrink-0 cursor-pointer"
                title="Exit view"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Interactive Image Container Area */}
          <div className="flex-1 w-full max-w-lg mx-auto flex items-center justify-center p-4 relative select-none">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[8px] text-gray-400 font-mono tracking-widest uppercase z-20 pointer-events-none">
              {isZoomed ? 'ZOOMED MODE' : 'TAP PICTURE TO ZOOM'}
            </div>

            <div 
              className="w-full h-full flex items-center justify-center transition-all duration-300 overflow-auto scrollbar-none"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(!isZoomed);
              }}
            >
              <img
                src={pic.imageUrl}
                alt={pic.title}
                referrerPolicy="no-referrer"
                className={`max-w-full max-h-[64vh] object-contain transition-transform duration-300 rounded-2xl ${
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                }`}
              />
            </div>
          </div>

          {/* Bottom Metabar caption details area */}
          <div 
            className="w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent p-5 shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-gray-900 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-red-500 text-white flex items-center justify-center font-black text-[11px] uppercase">
                    {pic.uploaderName.substring(0, 1)}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-100 font-black block leading-none">
                      {pic.uploaderName}
                    </span>
                    <span className="text-[8px] text-gray-500 block mt-0.5 font-mono">
                      Published {getFormattedDate()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleLikeToggle}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-[10px] font-black transition duration-200 cursor-pointer ${
                      hasLiked
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-900 border border-gray-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Heart size={11} className={hasLiked ? 'fill-current' : ''} />
                    <span>{pic.likes} LIKES</span>
                  </button>
                </div>
              </div>

              {/* Caption Description text body */}
              <div className="space-y-1">
                <p className="text-[11px] text-gray-300 leading-relaxed font-sans select-text">
                  {pic.description || 'No custom description was submitted with this capture.'}
                </p>
                
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[8px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/10 font-bold font-mono uppercase">
                    #{pic.category}
                  </span>
                  <span className="text-[8px] bg-gray-950 text-gray-500 px-2 py-0.5 rounded border border-gray-900 font-mono">
                    #AESTHETIC
                  </span>
                  <span className="text-[8px] bg-gray-950 text-gray-500 px-2 py-0.5 rounded border border-gray-900 font-mono">
                    #RAW_CAPTURE
                  </span>
                </div>
              </div>

              {copiedShare ? (
                <div className="text-center text-[9px] text-emerald-400 font-bold font-mono py-1.5 bg-emerald-500/10 rounded-lg animate-pulse border border-emerald-500/20">
                  ✓ Original Image URL copied with secure Referrer policy wrapper!
                </div>
              ) : (
                <div className="text-center text-[8.5px] text-gray-600 font-mono">
                  Secure Cloud Storage ID: {pic.id} • Verified Gatekeeper Active
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
