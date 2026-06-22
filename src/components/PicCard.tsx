import { useEffect, useState } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Picture } from '../types';
import { Heart, Trash2, Calendar, User, UserCheck } from 'lucide-react';

interface PicCardProps {
  pic: Picture;
  currentUserUid: string | null;
  isAdmin: boolean;
  key?: string | number;
}

export default function PicCard({ pic, currentUserUid, isAdmin }: PicCardProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);

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
        // Prepare Unlike Batch Operations
        batch.delete(likeDocRef);
        batch.update(picDocRef, {
          likes: Math.max(0, pic.likes - 1),
        });
        await batch.commit();
      } else {
        // Prepare Like Batch Operations
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
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `pictures/${pic.id}`);
    }
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
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-lg group hover:border-gray-700/80 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Aspect Wrapper */}
        <div className="relative group aspect-[4/3] bg-black overflow-hidden">
          <img
            src={pic.imageUrl}
            alt={pic.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          {/* Tag Top Left */}
          <span className="absolute top-3 left-3 bg-gray-950/85 backdrop-blur-md text-orange-400 border border-gray-800 rounded-full px-2.5 py-0.5 text-[10px] font-mono tracking-wider uppercase">
            {pic.category}
          </span>

          {/* Show pending badge if uploader is looking at their own pending */}
          {pic.status === 'pending' && (
            <span className="absolute top-3 right-3 bg-yellow-500/10 backdrop-blur-md text-yellow-400 border border-yellow-500/30 rounded px-2.5 py-0.5 text-[10px] font-sans font-semibold">
              Pending Approval
            </span>
          )}
          {pic.status === 'rejected' && (
            <span className="absolute top-3 right-3 bg-red-500/10 backdrop-blur-md text-red-400 border border-red-500/30 rounded px-2.5 py-0.5 text-[10px] font-sans font-semibold">
              Rejected
            </span>
          )}
        </div>

        {/* Contents */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-100 text-sm md:text-base leading-tight tracking-tight group-hover:text-orange-400 transition-colors">
              {pic.title}
            </h3>
            {showDelete && (
              <button
                onClick={handleDelete}
                className="text-gray-500 hover:text-rose-500 p-1 rounded-md hover:bg-gray-950 transition cursor-pointer"
                title="Delete Post"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed font-sans line-clamp-3">
            {pic.description || 'No caption available.'}
          </p>
        </div>
      </div>

      {/* Footer Meta info */}
      <div className="px-5 pb-5 pt-3 border-t border-gray-800/80 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] text-gray-500 font-sans">
            <User size={10} className="text-gray-600" />
            <span className="truncate max-w-[100px] text-gray-400 font-medium">
              {pic.uploaderName}
            </span>
            {pic.uploaderRole === 'admin' && (
              <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-mono rounded px-1 scale-90">
                Staff
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-gray-600 font-mono">
            <Calendar size={10} />
            <span>{getFormattedDate()}</span>
          </div>
        </div>

        {/* Like trigger button */}
        <button
          onClick={handleLikeToggle}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition ${
            hasLiked
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/15'
              : 'bg-gray-800 hover:bg-gray-700 text-slate-300 border border-gray-700/50'
          }`}
        >
          <Heart size={12} className={hasLiked ? 'fill-current' : ''} />
          <span>{pic.likes}</span>
        </button>
      </div>
    </div>
  );
}
