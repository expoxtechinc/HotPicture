import React, { useState } from 'react';
import { 
  Play, 
  Eye, 
  Video, 
  Image as ImageIcon, 
  Calendar,
  X,
  PlusCircle,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react';
import { Announcement } from '../types';

interface MediaGalleryProps {
  announcements: Announcement[];
  isAdmin: boolean;
  onRemove?: (id: string) => void;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ 
  announcements, 
  isAdmin,
  onRemove 
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxDesc, setLightboxDesc] = useState('');

  // Helper to extract clean Youtube video IDs for correct responsive iframe embeds
  const parseYoutubeEmbedUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    
    // Check various formats
    // e.g. watch?v=ID, short link: be/ID, or clean ID itself
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = rawUrl.match(regExp);

    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
    }
    
    // In case user provided embed URL directly
    if (rawUrl.includes('youtube.com/embed/')) {
      return rawUrl;
    }

    // Return original if no match, or fallback
    return rawUrl;
  };

  // Filter out announcements based on category and media fields
  const filteredMedia = announcements.filter((ann) => {
    // Media includes item designated as 'Gallery', or having videoUrl / imageUrl
    // Let's filter by tab selection
    if (activeMediaTab === 'photo') {
      return (ann.category === 'Gallery' || ann.mediaType === 'image') && ann.imageUrl;
    }
    if (activeMediaTab === 'video') {
      return (ann.category === 'Video' || ann.mediaType === 'video' || ann.videoUrl) && ann.videoUrl;
    }
    // All media tab - anything that has a picture or a video link
    return ann.imageUrl || ann.videoUrl;
  });

  const handleOpenPhoto = (url: string, title: string, desc: string) => {
    setSelectedPhoto(url);
    setLightboxTitle(title);
    setLightboxDesc(desc);
  };

  const handleOpenVideo = (url: string, title: string, desc: string) => {
    const embedUrl = parseYoutubeEmbedUrl(url);
    setSelectedVideoUrl(embedUrl);
    setLightboxTitle(title);
    setLightboxDesc(desc);
  };

  return (
    <div className="space-y-6" id="modular-media-station">
      
      {/* Media Type selectors filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100/60 font-mono">
            Creative Media Hub
          </span>
          <h4 className="text-xl font-serif font-bold text-slate-950 mt-1">
            Academy TV &amp; Picture Albumns
          </h4>
          <p className="text-slate-500 text-xs">
            Showcasing vocational laboratory assignments, community outreach events, and video lectures.
          </p>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 space-x-1 shrink-0">
          {[
            { id: 'all', label: 'All Catalog', icon: Sparkles },
            { id: 'photo', label: 'Photo Albums', icon: ImageIcon },
            { id: 'video', label: 'MISS Academy TV', icon: Video },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMediaTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
                  activeMediaTab === tab.id
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-505 text-slate-500 hover:text-slate-800'
                }`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of items */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No media items published here yet.</p>
          <p className="text-xs text-slate-400 mt-1">Administrators can publish YouTube lessons and gallery photos via the staff panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredMedia.map((media) => {
            const isVideo = media.videoUrl || media.mediaType === 'video' || media.category === 'Video';
            const formattedDate = media.createdAt?.seconds 
              ? new Date(media.createdAt.seconds * 1000).toLocaleDateString()
              : 'Recently';

            return (
              <div 
                key={media.id}
                className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-3xs hover:border-slate-250 hover:shadow-xs transition-all relative flex flex-col justify-between group"
              >
                {/* Rendering Cover Stage */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                  {media.imageUrl ? (
                    <img 
                      src={media.imageUrl} 
                      alt={media.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500">
                      <Video className="w-12 h-12 text-amber-500/80 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Dark mask on hover */}
                  <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/45 transition-colors flex items-center justify-center">
                    
                    {isVideo ? (
                      <button 
                        onClick={() => handleOpenVideo(media.videoUrl || '', media.title, media.content)}
                        className="p-3 bg-amber-500 text-slate-950 rounded-full hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer border-2 border-white"
                        title="Play Lesson"
                      >
                        <Play className="w-5 h-5 fill-slate-950 text-slate-950 pl-0.5" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleOpenPhoto(media.imageUrl || '', media.title, media.content)}
                        className="p-3 bg-white/10 text-white rounded-full hover:scale-110 opacity-0 group-hover:opacity-100 transition-all shadow-sm cursor-pointer border border-white/20 backdrop-blur-md"
                        title="Zoom Photo"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    )}

                  </div>

                  {/* Top categorization channel badge */}
                  <span className={`absolute top-3 left-3 text-[9.5px] font-bold text-white px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 ${
                    isVideo 
                      ? 'bg-rose-900/90 border-rose-800' 
                      : 'bg-indigo-900/90 border-indigo-800'
                  }`}>
                    {isVideo ? <Video className="w-3 h-3 text-amber-400" /> : <ImageIcon className="w-3 h-3 text-amber-400" />}
                    <span>{isVideo ? 'Academy Lesson' : 'Campus Photo'}</span>
                  </span>
                </div>

                {/* Details segment */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-slate-900 text-sm tracking-tight leading-snug line-clamp-2">
                      {media.title}
                    </h5>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {media.content}
                    </p>
                  </div>

                  {/* Bottom indicators */}
                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-350" />
                      {formattedDate}
                    </span>
                    <span className="font-medium text-slate-500">
                      By {media.publisherName || 'MISS Board'}
                    </span>
                  </div>
                </div>

                {/* Secure administrative deletions override */}
                {isAdmin && onRemove && (
                  <div className="bg-rose-50 px-5 py-2 flex justify-between items-center border-t border-rose-100">
                    <span className="text-[10px] text-rose-800 font-bold font-mono">Administrator tools</span>
                    <button
                      onClick={() => onRemove(media.id)}
                      className="px-2 py-0.5 text-[10px] bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-md font-bold cursor-pointer transition-colors"
                    >
                      Delete Media
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LIGHTBOX FOR DISPLAYING PUBLIC PHOTOS */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-slate-950/95 flex items-center justify-center p-4 z-55 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-3xl w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900">
              <img 
                src={selectedPhoto} 
                alt={lightboxTitle} 
                className="max-h-[70vh] w-auto mx-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="text-white space-y-1">
              <h5 className="font-serif text-lg font-bold">{lightboxTitle}</h5>
              <p className="text-xs text-slate-300 leading-relaxed">{lightboxDesc}</p>
            </div>
          </div>
        </div>
      )}

      {/* THEATER PLAYER OVERLAY FOR EDUCATION VIDEOS */}
      {selectedVideoUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/95 flex items-center justify-center p-4 z-55 animate-fade-in"
          onClick={() => setSelectedVideoUrl(null)}
        >
          <button 
            onClick={() => setSelectedVideoUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              {selectedVideoUrl.includes('youtube.com') ? (
                <iframe
                  src={selectedVideoUrl}
                  title={lightboxTitle}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : (
                <video 
                  src={selectedVideoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full"
                ></video>
              )}
            </div>

            <div className="text-white space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-650 rounded-full animate-pulse"></span>
                <h5 className="font-serif text-lg font-bold">{lightboxTitle}</h5>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{lightboxDesc}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
