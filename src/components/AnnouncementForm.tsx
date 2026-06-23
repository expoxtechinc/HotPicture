import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Plus, Check, Image as ImageIcon, Sparkles, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementFormProps {
  publisherEmail: string;
  onSuccess: (announcement: Announcement) => void;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ publisherEmail, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('News');
  const [imageUrl, setImageUrl] = useState('');
  const [publisherName, setPublisherName] = useState('Admissions Office');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Preset illustrations so the administrator doesn't need to manually hunt for URLs
  const presets = [
    { name: 'General Classroom', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60' },
    { name: 'Computer Lab', url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60' },
    { name: 'Tailoring / Textiles', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60' },
    { name: 'Cooking / Pastry', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=60' },
    { name: 'Graduation Day', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !category) {
      setErrorMsg('Please pre-fill the Title, Update Content, and Category fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Generate compliant ID client side matching security guidelines: id == announcementId
    const randomSuffix = Math.random().toString(36).substring(2, 11);
    const annId = `ann_${Date.now()}_${randomSuffix}`;

    try {
      const docRef = doc(db, 'announcements', annId);
      const payload: Announcement = {
        id: annId,
        title: title.trim(),
        content: content.trim(),
        category,
        imageUrl: imageUrl.trim() || undefined,
        publisherName: publisherName.trim() || 'Admissions Office',
        publisherEmail,
        createdAt: new Date(), // This is parsed safely as Timestamp or client-side date
      };

      await setDoc(docRef, payload);
      setSuccess(true);
      onSuccess(payload);

      // Clear the form
      setTitle('');
      setContent('');
      setImageUrl('');
      // Delay reset of success state
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg('Posting failed. Make sure your account has official administrator permissions.');
      try {
        handleFirestoreError(err, OperationType.CREATE, `announcements/${annId}`);
      } catch (logErr) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-6 md:p-8" id="announcement-form">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-900 text-white rounded-lg">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-lg font-serif font-bold text-slate-900">Publish to Multee Buzz</h4>
          <p className="text-xs text-slate-500">Administrator Panel (Signed in as {publisherEmail})</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Announcement Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026/2027 Registration Cycle"
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category Channel <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
            >
              <option value="News">News &amp; Stories</option>
              <option value="Admission">Admissions Alert</option>
              <option value="TVET">T-VET Practical update</option>
              <option value="Event">Campus Event</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Publisher Label
            </label>
            <input
              type="text"
              value={publisherName}
              onChange={(e) => setPublisherName(e.target.value)}
              placeholder="e.g. Office of the Registrar"
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Photo URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste a direct image URL link..."
              disabled={loading}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Presets visual picker */}
        <div>
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
            Or Select an Academic/Vocational Cover Preset:
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, idx) => {
              const isSelected = imageUrl === preset.url;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImageUrl(preset.url)}
                  className={`text-[11px] px-2.5 py-1 rounded-full cursor-pointer transition-all border flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-900 border-blue-950 text-white font-medium'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-amber-400 font-bold" />}
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Announcement Content &amp; Details <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write story content, dates, and tuition requirement details here..."
            disabled={loading}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
          ></textarea>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600 font-bold" />
            <span>Announcement posted successfully to the school feed!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs uppercase tracking-widest py-3 px-4 rounded-xl border border-blue-950 hover:border-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? 'Publishing Story...' : 'Publish Announcement'}
        </button>
      </form>
    </div>
  );
};
