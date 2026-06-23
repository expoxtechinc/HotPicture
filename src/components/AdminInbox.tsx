import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Mail, CheckCheck, Trash2, Clock, Inbox, Filter, ShieldAlert, Sparkles } from 'lucide-react';
import { Inquiry } from '../types';

interface AdminInboxProps {
  onInquiriesCount?: (count: number) => void;
}

export const AdminInbox: React.FC<AdminInboxProps> = ({ onInquiriesCount }) => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'replied' | 'dismissed'>('all');

  const fetchInquiries = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: Inquiry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          subject: data.subject || '',
          message: data.message || '',
          status: data.status || 'unread',
          createdAt: data.createdAt,
        });
      });
      setInquiries(list);
      if (onInquiriesCount) {
        onInquiriesCount(list.filter(i => i.status === 'unread').length);
      }
    } catch (err: any) {
      setErrorMsg('Unauthorized context. Only authorized school administrators can view visitor inquiries.');
      try {
        handleFirestoreError(err, OperationType.LIST, 'inquiries');
      } catch (logErr) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'unread' | 'replied' | 'dismissed') => {
    try {
      const docRef = doc(db, 'inquiries', id);
      await updateDoc(docRef, { status: newStatus });
      
      // Update local state
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
    } catch (err: any) {
      setErrorMsg('Failed to update status. Verify your administrator permissions.');
      try {
        handleFirestoreError(err, OperationType.UPDATE, `inquiries/${id}`);
      } catch (logErr) {}
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this inquiry? This action cannot be undone.')) {
      return;
    }

    try {
      const docRef = doc(db, 'inquiries', id);
      await deleteDoc(docRef);
      setInquiries(prev => prev.filter(inq => inq.id !== id));
    } catch (err: any) {
      setErrorMsg('Deletion failed. Only verified admins are authorized.');
      try {
        handleFirestoreError(err, OperationType.DELETE, `inquiries/${id}`);
      } catch (logErr) {}
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    if (statusFilter === 'all') return true;
    return inq.status === statusFilter;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'unread':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'replied':
        return 'bg-emerald-100 text-emerald-805 border-emerald-200';
      case 'dismissed':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs" id="admin-inbox">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-1.5">
            <Inbox className="w-5 h-5 text-blue-900" />
            Visitor Inquiries Registry
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time contact submissions from parents, prospective students, and TVET applicants.
          </p>
        </div>

        {/* Filter triggers */}
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
          {(['all', 'unread', 'replied', 'dismissed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-white text-blue-950 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {errorMsg ? (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-xl flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Access Denied / Firewalled</span>
            <span className="text-xs leading-relaxed">{errorMsg}</span>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-12 space-y-2">
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Loading parent inquiries...</p>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Inbox className="w-12 h-12 text-slate-350 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No Inquiries Found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Perfect, no messages registered for the &quot;{statusFilter}&quot; filter at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {filteredInquiries.map((inq) => {
            const formattedDate = inq.createdAt?.seconds 
              ? new Date(inq.createdAt.seconds * 1000).toLocaleString()
              : inq.createdAt instanceof Date 
                ? inq.createdAt.toLocaleString() 
                : 'Just now';

            return (
              <div
                key={inq.id}
                className="p-5 rounded-2xl border border-slate-100 bg-white shadow-3xs transition-all hover:border-slate-250 flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{inq.name}</span>
                    <a
                      href={`mailto:${inq.email}`}
                      className="text-xs text-blue-900 hover:underline flex items-center gap-1 font-mono"
                    >
                      <Mail className="w-3 h-3" />
                      {inq.email}
                    </a>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 ml-auto md:ml-0">
                      <Clock className="w-3.5 h-3.5" />
                      {formattedDate}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Subject: {inq.subject}
                    </span>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-sans">
                      {inq.message}
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(inq.status)}`}>
                    {inq.status}
                  </span>

                  <div className="flex items-center gap-1.5 mt-2">
                    {inq.status !== 'replied' && (
                      <button
                        onClick={() => handleUpdateStatus(inq.id, 'replied')}
                        title="Mark as Replied"
                        className="p-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg transition-colors cursor-pointer border border-emerald-100/50"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    {inq.status !== 'dismissed' && (
                      <button
                        onClick={() => handleUpdateStatus(inq.id, 'dismissed')}
                        title="Dismiss / Mark Read"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-200/50"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteInquiry(inq.id)}
                      title="Permanently Delete"
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer border border-rose-200/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
