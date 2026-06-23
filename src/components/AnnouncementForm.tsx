import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, 
  Check, 
  Image as ImageIcon, 
  Sparkles, 
  BookOpen, 
  Clock, 
  AlertCircle,
  Video,
  FileText,
  Compass,
  Trophy
} from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementFormProps {
  publisherEmail: string;
  onSuccess: (announcement: Announcement) => void;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ publisherEmail, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('News'); // e.g. 'News', 'Admission', 'TVET', 'Event', 'Gallery', 'Video'
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text');
  
  // URL details
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [publisherName, setPublisherName] = useState('Office of the Principal');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Preset gallery illustration options so the principal doesn't have to look up links
  const presets = [
    { name: 'General Classroom', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60' },
    { name: 'Computer Lab Room', url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=60' },
    { name: 'Tailoring Practical', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60' },
    { name: 'Cooking Studio', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=60' },
    { name: 'Graduation Ceremony', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      setErrorMsg('Announcement Title and Content are required parameters before publishing.');
      return;
    }

    if (mediaType === 'video' && !videoUrl) {
      setErrorMsg('Please specify a valid YouTube Video Link for video channel postings.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Generate compliant ID client side matching security guidelines: id == announcementId
    const randomSuffix = Math.random().toString(36).substring(2, 11);
    const annId = `ann_${Date.now()}_${randomSuffix}`;

    try {
      const docRef = doc(db, 'announcements', annId);
      
      // Auto assign category for specific media formats if needed
      let resolvedCategory = category;
      if (mediaType === 'image' && category !== 'Gallery') {
        resolvedCategory = 'Gallery';
      } else if (mediaType === 'video' && category !== 'Video') {
        resolvedCategory = 'Video';
      }

      // Construct database payload keeping keys strictly defined with non-empty string values.
      // Firebase throws local errors on 'undefined' values before the request reaches the server.
      const payload: any = {
        id: annId,
        title: title.trim(),
        content: content.trim(),
        category: resolvedCategory,
        mediaType,
        publisherEmail,
        createdAt: serverTimestamp(),
      };

      const trimmedImg = imageUrl.trim();
      if (trimmedImg) {
        payload.imageUrl = trimmedImg;
      }

      const trimmedVid = videoUrl.trim();
      if (mediaType === 'video' && trimmedVid) {
        payload.videoUrl = trimmedVid;
      }

      const trimmedPub = publisherName.trim();
      if (trimmedPub) {
        payload.publisherName = trimmedPub;
      }

      await setDoc(docRef, payload);
      setSuccess(true);
      onSuccess(payload as Announcement);

      // Clean core inputs
      setTitle('');
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      const errStr = String(err?.message || err);
      if (errStr.includes('permission') || errStr.includes('PERMISSION_DENIED') || errStr.includes('permission-denied')) {
        setErrorMsg('Access blocked. Check that you are authenticated as verifying luckyglobalnews@gmail.com.');
      } else {
        setErrorMsg(`Failed to publish: ${err?.message || 'Unknown network error. Please try again.'}`);
      }
      try {
        handleFirestoreError(err, OperationType.CREATE, `announcements/${annId}`);
      } catch (logErr) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xs" id="announcement-form">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl shadow-sm border border-slate-950">
          <BookOpen className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xl font-serif font-bold text-slate-950">Publish Multi-Media Alerts</h4>
          <p className="text-xs text-slate-500">Authorized Master Administrator Gate (Principal: {publisherEmail})</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* POST FORMAT TYPE TOGGLE SELECTOR */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">
            Select Post Format &amp; Layout Channel
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'text', label: 'News & Events', desc: 'Standard board alert', icon: FileText },
              { id: 'image', label: 'Photo Gallery', desc: 'Publish campus album', icon: ImageIcon },
              { id: 'video', label: 'YouTube Lecture', desc: 'Publish video stream', icon: Video },
            ].map((fmt) => {
              const IconComp = fmt.icon;
              const isSelected = mediaType === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    setMediaType(fmt.id as any);
                    if (fmt.id === 'image') setCategory('Gallery');
                    else if (fmt.id === 'video') setCategory('Video');
                    else setCategory('News');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-900/5 hover:bg-blue-900/10 border-blue-900 text-blue-950' 
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp className={`w-4 h-4 ${isSelected ? 'text-blue-900' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs uppercase tracking-wider">{fmt.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{fmt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* INPUT STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Publication Title / Headline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Saturday TVET Sewing Practical Labs Added"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Campus channel channel
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={mediaType !== 'text'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-855 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="News">News &amp; Stories Channel</option>
              <option value="Admission">Official Admissions Alert</option>
              <option value="TVET">T-VET Technical Division info</option>
              <option value="Event">Institutional Campus Event</option>
              <option value="Gallery" disabled={mediaType !== 'image'}>Public Photo Album</option>
              <option value="Video" disabled={mediaType !== 'video'}>Academy TV Series</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Author Administrative Tag
            </label>
            <input
              type="text"
              value={publisherName}
              onChange={(e) => setPublisherName(e.target.value)}
              placeholder="e.g. Office of the Registrar"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* DYNAMIC VIDEO URL IF VIDEO MODE CHOSEN */}
          {mediaType === 'video' ? (
            <div>
              <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Video className="w-3.5 h-3.5 fill-rose-100" />
                YouTube Video URL Link <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste video: https://www.youtube.com/watch?v=..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-wrap focus:ring-2 focus:ring-rose-250 font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Display Cover Picture Link (Optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste direct .jpg / .png image link..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-mono text-xs"
              />
            </div>
          )}
        </div>

        {/* Quick Cover Presets panel details (only applicable when photo cover exists) */}
        {mediaType !== 'video' && (
          <div>
            <span className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              Instant Catalog Photo Presets Selector:
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, idx) => {
                const isSelected = imageUrl === preset.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className={`text-[10.5px] px-3 py-1 rounded-full cursor-pointer transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-900 border-blue-950 text-white font-medium shadow-3xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 stroke-[2.5]" />}
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Story content &amp; Details <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Introduce rich informational texts here, detailing timing structures, enrollment requirements, laboratory equipment, or fee segments..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 resize-y"
          ></textarea>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-855 border border-rose-100 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-855 border border-emerald-100 rounded-2xl text-xs flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 stroke-[2.5] shrink-0" />
            <span className="font-semibold">Successfully published your multi-media update onto the live community feed!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 hover:from-slate-950 hover:to-slate-950 text-white font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 border-none"
        >
          {loading ? 'Transmitting Data securely...' : 'Publish to live school community'}
        </button>
      </form>
    </div>
  );
};
