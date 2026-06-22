import React, { useState } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Image, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AddPicFormProps {
  user: User;
  isAdmin: boolean;
  onSuccess: () => void;
}

const PRESETS = [
  {
    name: 'Cyberpunk Neon',
    url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=800&auto=format&fit=crop',
    category: 'Cyberpunk',
  },
  {
    name: 'Scenic Mountain',
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop',
    category: 'Scenic',
  },
  {
    name: 'Abstract Paint',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop',
    category: 'Abstract',
  },
  {
    name: 'Tokyo street',
    url: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=800&auto=format&fit=crop',
    category: 'City',
  },
  {
    name: 'Fuzzy Corgi',
    url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop',
    category: 'Animals',
  },
  {
    name: 'Astral Nebula',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop',
    category: 'Cosmos',
  },
];

const CATEGORIES = ['Cyberpunk', 'Scenic', 'Abstract', 'City', 'Animals', 'Cosmos', 'Minimalist', 'Other'];

export default function AddPicForm({ user, isAdmin, onSuccess }: AddPicFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cyberpunk');
  const [imageUrl, setImageUrl] = useState(PRESETS[0].url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Auto-seed generating tool for Picsum
  const handleRandomSeed = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setImageUrl(`https://picsum.photos/seed/${randomSeed}/800/600`);
  };

  const selectPreset = (url: string, cat: string) => {
    setImageUrl(url);
    setCategory(cat);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!imageUrl.trim()) {
      setError('Image URL is required');
      return;
    }

    setLoading(true);
    setError(null);

    const picRef = doc(collection(db, 'pictures'));
    const docId = picRef.id;

    // Build picture conforms to Picture schema inside firestore.rules and firebase-blueprint.json
    const newPic = {
      id: docId,
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      uploaderId: user.uid,
      uploaderName: user.displayName || 'Anonymous User',
      uploaderEmail: user.email || '',
      uploaderRole: isAdmin ? 'admin' : 'user',
      status: isAdmin ? 'approved' : 'pending',
      createdAt: serverTimestamp(),
      likes: 0,
      category: category,
    };

    try {
      await setDoc(picRef, newPic);
      setSubmitted(true);
      setTitle('');
      setDescription('');
      onSuccess();
      setTimeout(() => {
        setSubmitted(false);
      }, 4000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `pictures/${docId}`);
      setError(err.message || 'Failed to submit picture.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="add-pic-form" className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
          <Image size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-100 font-sans tracking-tight">Upload Creative Frame</h2>
          <p className="text-xs text-gray-400">
            {isAdmin 
              ? 'Logged in as Admin. Your uploads skip moderation.' 
              : 'Submissions are audited by admins before going live.'}
          </p>
        </div>
      </div>

      {submitted && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-3 text-emerald-400">
          <CheckCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Upload Successful!</p>
            <p className="text-xs text-emerald-300">
              {isAdmin 
                ? 'Your photo is live in the gallery.' 
                : 'Your submission is now cooking in the validation queue.'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-400 text-xs">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="overflow-auto max-w-full">
            <p className="font-semibold">Security Gate Refusal:</p>
            <p className="font-mono mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Title
          </label>
          <input
            type="text"
            required
            maxLength={100}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-orange-500 transition-all font-sans"
            placeholder="Give your masterpiece a stunning title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Description / Caption
          </label>
          <textarea
            maxLength={1000}
            rows={3}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-orange-500 transition-all font-sans resize-none"
            placeholder="Share the atmosphere, device specs, or creative vision behind this photo..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-orange-500 transition-all"
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
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Image Customizer
            </label>
            <button
              type="button"
              onClick={handleRandomSeed}
              className="w-full bg-gray-800 hover:bg-gray-700 text-slate-200 text-sm font-medium py-3 rounded-xl flex items-center justify-center space-x-2 transition-all"
            >
              <Sparkles size={16} />
              <span>Roll Random Seed</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Image URL
          </label>
          <input
            type="url"
            required
            maxLength={2048}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-slate-200 text-xs font-mono focus:outline-none focus:border-orange-500 transition-all"
            placeholder="Paste raw photo CDN or Unsplash direct URL..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        {/* Preset Cards Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Press to Pick a Hot Theme Preset
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const isSelected = imageUrl === p.url;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => selectPreset(p.url, p.category)}
                  className={`relative p-2 rounded-xl text-left border ${
                    isSelected ? 'border-orange-500/80 bg-orange-500/5' : 'border-gray-800 hover:border-gray-700 bg-gray-950/50'
                  } transition-all`}
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-12 object-cover rounded-lg mb-1"
                  />
                  <div className="text-[10px] font-medium text-slate-300 truncate">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-800 disabled:to-gray-800 text-white py-3.5 px-6 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Post Picture</span>
              <span>🔥</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
