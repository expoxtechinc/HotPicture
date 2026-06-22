import React, { useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Image, Sparkles, AlertCircle, CheckCircle, Flame, Camera } from 'lucide-react';
import { motion } from 'motion/react';

interface AddPicFormProps {
  user: User;
  isAdmin: boolean;
  onSuccess: () => void;
}

// Highly curated aesthetic default picture presets
const PRESETS = [
  {
    name: 'Neon Tokyo Cyberpunk',
    url: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=800&auto=format&fit=crop',
    category: 'Cyberpunk',
  },
  {
    name: 'Minimalist Cozy Space',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop',
    category: 'Minimalist',
  },
  {
    name: 'Epic Mountain Peak Sunset',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop',
    category: 'Nature',
  },
  {
    name: 'Calm Turquoise Ocean',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop',
    category: 'Nature',
  },
  {
    name: 'Creative Abstract Flow',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop',
    category: 'Abstract',
  },
  {
    name: 'Vibrant Street Art Mural',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop',
    category: 'Street Art',
  },
];

const CATEGORIES = [
  'Aesthetic',
  'Cyberpunk',
  'Minimalist',
  'Nature',
  'Street Art',
  'Abstract',
  'Retro',
];

export default function AddPicForm({ user, isAdmin, onSuccess }: AddPicFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Aesthetic');
  const [imageUrl, setImageUrl] = useState(PRESETS[0].url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Generates randomized high-resolution aesthetic search terms from Unsplash
  const handleRandomSeed = () => {
    const keywords = ['aesthetic-sunset', 'cyberpunk-neon', 'minimalist-interior', 'ocean-waves', 'pastel-gradient', 'retro-photography'];
    const chosen = keywords[Math.floor(Math.random() * keywords.length)];
    const sig = Math.floor(Math.random() * 100);
    setImageUrl(`https://images.unsplash.com/featured/?${chosen}&sig=${sig}`);
  };

  const selectPreset = (url: string, cat: string) => {
    setImageUrl(url);
    if (CATEGORIES.includes(cat)) {
      setCategory(cat);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title/Headline is required');
      return;
    }
    if (!imageUrl.trim()) {
      setError('A representative photo or URL is required');
      return;
    }

    setLoading(true);
    setError(null);

    const picRef = doc(collection(db, 'pictures'));
    const docId = picRef.id;

    const newPost = {
      id: docId,
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      uploaderId: user.uid,
      uploaderName: user.displayName || 'Contributor',
      uploaderEmail: user.email || '',
      uploaderRole: isAdmin ? 'admin' : 'user',
      status: isAdmin ? 'approved' : 'pending',
      createdAt: serverTimestamp(),
      likes: 0,
      category: category,
    };

    try {
      await setDoc(picRef, newPost);
      setSubmitted(true);
      setTitle('');
      setDescription('');
      onSuccess();
      setTimeout(() => {
        setSubmitted(false);
      }, 4000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `pictures/${docId}`);
      setError(err.message || 'Submission failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="add-pic-form" className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-5">
        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 animate-pulse">
          <Flame size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100 font-sans tracking-tight uppercase">Upload Aesthetic Capture</h2>
          <p className="text-[10px] text-gray-400">
            {isAdmin 
              ? 'Administrator Mode: Your uploads bypass the safety review queue.' 
              : 'Community Mode: Submissions are verified by administrators before listing.'}
          </p>
        </div>
      </div>

      {submitted && (
        <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-3 text-emerald-400">
          <CheckCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs">Submission Complete!</p>
            <p className="text-[10px] text-emerald-300">
              {isAdmin 
                ? 'Your photo is live in the gallery feed.' 
                : 'Your submission is now waiting in the moderation review queue.'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-400 text-xs">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="overflow-auto max-w-full">
            <p className="font-semibold">Security Response:</p>
            <p className="font-mono mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Title / Aesthetic Focus Name
          </label>
          <input
            type="text"
            required
            maxLength={100}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-orange-500 transition-all font-sans"
            placeholder="e.g., Midnight Rain in Neo-Shinjuku..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Caption / Visual Story
          </label>
          <textarea
            maxLength={1000}
            rows={3}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-orange-500 transition-all font-sans resize-none"
            placeholder="Tell the story behind this shot, camera variables, location aesthetic, or colors..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Select Category Channel
            </label>
            <select
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-orange-500 transition-all"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Randomize Theme Banner
            </label>
            <button
              type="button"
              onClick={handleRandomSeed}
              className="w-full bg-gray-800 hover:bg-gray-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles size={13} className="text-orange-400" />
              <span>Fetch Alternate Unsplash Signature</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Photo URL (Unsplash or CDN Location)
          </label>
          <input
            type="url"
            required
            maxLength={2048}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-[11px] font-mono focus:outline-none focus:border-orange-500 transition-all"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        {/* Preset selections */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Or Choose a Pre-curated Aesthetic Asset
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const isSelected = imageUrl === p.url;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => selectPreset(p.url, p.category)}
                  className={`relative p-1.5 rounded-xl text-left border ${
                    isSelected ? 'border-orange-500 bg-orange-500/5' : 'border-gray-800 hover:border-gray-700 bg-gray-950/50'
                  } transition-all cursor-pointer`}
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-10 object-cover rounded-lg mb-1"
                  />
                  <div className="text-[8.5px] font-bold text-slate-300 truncate tracking-tight">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-800 disabled:to-gray-800 text-white py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Post to Gallery Feed</span>
              <span>➜</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
