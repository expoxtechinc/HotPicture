import { useEffect, useState } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Picture } from '../types';
import { ShieldCheck, Check, X, AlertOctagon, Archive, RotateCcw } from 'lucide-react';

interface ModeratorQueueProps {
  adminUid: string;
}

export default function ModeratorQueue({ adminUid }: ModeratorQueueProps) {
  const [pendingPics, setPendingPics] = useState<Picture[]>([]);
  const [rejectedPics, setRejectedPics] = useState<Picture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Listen to pending queue
    const pendingQuery = query(
      collection(db, 'pictures'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubPending = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const pics: Picture[] = [];
        snapshot.forEach((doc) => {
          pics.push({ id: doc.id, ...doc.data() } as Picture);
        });
        setPendingPics(pics);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'pictures');
        setError(`Failed to fetch pending uploads: ${err.message}`);
        setLoading(false);
      }
    );

    // 2. Listen to rejected queue (recent logs)
    const rejectedQuery = query(
      collection(db, 'pictures'),
      where('status', '==', 'rejected'),
      orderBy('createdAt', 'desc')
    );

    const unsubRejected = onSnapshot(
      rejectedQuery,
      (snapshot) => {
        const pics: Picture[] = [];
        snapshot.forEach((doc) => {
          pics.push({ id: doc.id, ...doc.data() } as Picture);
        });
        setRejectedPics(pics);
      },
      (err) => {
        // Log error and handle gracefully
        console.error('Rejected snapshot failure:', err);
      }
    );

    return () => {
      unsubPending();
      unsubRejected();
    };
  }, []);

  const handleReview = async (picId: string, action: 'approved' | 'rejected') => {
    const picRef = doc(db, 'pictures', picId);
    try {
      await updateDoc(picRef, {
        status: action,
        approvedBy: adminUid,
        approvedAt: serverTimestamp(),
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `pictures/${picId}`);
      alert(`Approval error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
        <span className="text-sm font-mono text-gray-400">Inspecting Mod logs...</span>
      </div>
    );
  }

  return (
    <div id="moderator-queue" className="space-y-8 max-w-5xl mx-auto">
      {/* Pending Queue */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100 font-sans tracking-tight">
                Auditing Desk
              </h2>
              <p className="text-xs text-gray-400">
                Incoming uploads waiting for secure gateway confirmation
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-semibold">
            {pendingPics.length} Pending
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono mb-4">
            {error}
          </div>
        )}

        {pendingPics.length === 0 ? (
          <div className="text-center py-12 bg-gray-950/40 rounded-xl border border-dashed border-gray-800">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm font-semibold text-slate-300">Clean Slate!</p>
            <p className="text-xs text-gray-500 mt-1">
              All user creations are processed. No pending queues left.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingPics.map((pic) => (
              <div
                key={pic.id}
                className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden flex flex-col justify-between hover:border-gray-700 transition"
              >
                <div>
                  <div className="relative group aspect-video bg-black flex items-center justify-center">
                    <img
                      src={pic.imageUrl}
                      alt={pic.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-yellow-950/80 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-mono">
                      {pic.category}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-slate-100 text-sm line-clamp-1">{pic.title}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {pic.description || 'No description provided.'}
                    </p>
                    <div className="pt-2 text-[11px] font-mono text-gray-500 border-t border-gray-900 flex justify-between items-center">
                      <span>By: {pic.uploaderName}</span>
                      <span className="text-[10px] lowercase text-orange-400 opacity-80">{pic.uploaderEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 border-t border-gray-900 flex space-x-3">
                  <button
                    onClick={() => handleReview(pic.id, 'approved')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Check size={14} />
                    <span>Approve to Live</span>
                  </button>
                  <button
                    onClick={() => handleReview(pic.id, 'rejected')}
                    className="flex-1 bg-rose-600/25 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/20 font-medium py-2 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Ledger (Recently Rejected) */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
            <Archive size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200 font-sans tracking-tight">
              Recently Rejected Posts
            </h2>
            <p className="text-xs text-gray-500">
              Audit logs of denied images. You can revoke rejection to approve them.
            </p>
          </div>
        </div>

        {rejectedPics.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">No archived rejections in this session.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {rejectedPics.map((pic) => (
              <div key={pic.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={pic.imageUrl}
                    alt={pic.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-10 object-cover rounded-lg bg-gray-900"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">{pic.title}</h4>
                    <p className="text-xs text-gray-500">
                      Uploaded by <span className="text-gray-400">{pic.uploaderName}</span> ({pic.uploaderEmail})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleReview(pic.id, 'approved')}
                  className="bg-gray-800 hover:bg-gray-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                >
                  <RotateCcw size={12} />
                  <span>Reverse to Approved</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
