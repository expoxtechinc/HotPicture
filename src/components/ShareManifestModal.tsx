import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Info,
  Smartphone,
  Send,
  ExternalLink,
  QrCode,
  GraduationCap
} from 'lucide-react';

interface ShareManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any; // PWA installation event
  onTriggerInstall: () => void;
}

export default function ShareManifestModal({ 
  isOpen, 
  onClose, 
  deferredPrompt, 
  onTriggerInstall 
}: ShareManifestModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.origin;
  const appTitle = "Multee International School System (MISS) Portal";
  const shareText = `Explore the official portal of Multee International School System (MISS) in Monrovia, Liberia. Browse news, TVET vocational training, academics, and activities: ${shareUrl}`;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl || 'https://miss-portal.org');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Multee Int\'l School System (MISS) Portal',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.warn('Native share canceled or failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  const getWhatsAppLink = () => {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  };

  const getTelegramLink = () => {
    return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  };

  const getFacebookLink = () => {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div 
        className="relative w-full max-w-lg bg-[#0f1115] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        id="share-modal-container"
      >
        {/* Accent Bar */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 h-1.5 w-full" />
        
        {/* Close */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-slate-100 bg-gray-900/60 hover:bg-gray-800 p-1.5 rounded-lg transition"
        >
          <X size={16} />
        </button>

        <div className="p-6 md:p-8 space-y-6">
          {/* Header Area */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl border-2 border-orange-500/40 p-1 overflow-hidden shadow-lg bg-gray-950 shrink-0 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100 font-sans tracking-tight">
                Install & Share MISS Portal
              </h3>
              <p className="text-xs text-orange-400 font-medium">
                Add to your phone home screen & share with parent networks
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Install Box */}
            <div className="p-4 bg-gray-950 border border-gray-800/80 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
                  <Smartphone size={16} className="text-orange-400" />
                  <span>Install Web App</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                  Browse activities offline, save bandwidth, and load the MISS portal instantly with single-tap home screen access!
                </p>
              </div>

              {deferredPrompt ? (
                <button
                  onClick={onTriggerInstall}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition shadow-lg shadow-orange-500/20"
                >
                  <Download size={14} />
                  <span>Add school app to phone</span>
                </button>
              ) : (
                <div className="p-2.5 bg-gray-900 rounded-lg space-y-1.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                    <Info size={11} className="text-orange-400 shrink-0" />
                    <span>How to Install:</span>
                  </div>
                  <ul className="text-[10px] text-gray-400 space-y-1 pl-4 list-disc font-sans">
                    <li><strong className="text-slate-300">Android:</strong> Tap browser menu (<strong className="text-slate-300">︙</strong>) & select <strong className="text-slate-300">"Install App"</strong>.</li>
                    <li><strong className="text-slate-300">iOS (Safari):</strong> Tap Share indicator (<span className="text-blue-400 font-bold">⎙</span>) and click <strong className="text-orange-400 font-bold">"Add to Home Screen"</strong>.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Offline Tool Share (Xender, Bluetooth) */}
            <div className="p-4 bg-gray-950 border border-gray-800/80 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
                  <Share2 size={16} className="text-amber-400" />
                  <span>Xender & Offline Export</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                  To share via bluetooth hotspot, Xender setups, or local networks, copy the unique secure link!
                </p>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={handleCopy}
                  className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 text-slate-200 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-green-400" />
                      <span className="text-green-400">Copied Portal Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Portal URL</span>
                    </>
                  )}
                </button>
                {navigator.share && (
                  <button
                    onClick={shareNative}
                    className="w-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <Share2 size={12} />
                    <span>Send via system apps</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Social Platforms Links Grid */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Web & Message Distribution Channels
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp */}
              <a 
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#2563eb]/10 hover:bg-[#2563eb]/20 border border-[#2563eb]/30 text-[#60a5fa] hover:text-[#93c5fd] py-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center justify-center space-y-1 transition duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  WA
                </div>
                <span>WhatsApp</span>
              </a>

              {/* Telegram */}
              <a 
                href={getTelegramLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#0284c7]/10 hover:bg-[#0284c7]/20 border border-[#0284c7]/30 text-[#38bdf8] hover:text-[#7dd3fc] py-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center justify-center space-y-1 transition duration-200"
              >
                <Send size={15} className="text-sky-400 mb-0.5" />
                <span>Telegram</span>
              </a>

              {/* Facebook */}
              <a 
                href={getFacebookLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1e40af]/10 hover:bg-[#1e40af]/20 border border-[#1e40af]/30 text-blue-400 hover:text-blue-300 py-2.5 rounded-xl text-xs font-bold text-center flex flex-col items-center justify-center space-y-1 transition duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-black shrink-0">
                  f
                </div>
                <span>Facebook</span>
              </a>
            </div>
          </div>

          {/* Bottom Footnote info */}
          <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl flex items-start space-x-2.5">
            <QrCode className="text-orange-400 shrink-0 mt-0.5" size={16} />
            <div className="text-[10px] text-gray-500 leading-relaxed font-mono">
              <span className="text-gray-300 font-bold block mb-0.5">XENDER LOCAL TRANSFER OPTION:</span>
              Open Xender on your smartphone, tap Web-share, connect to local MISS computer hotspots, and share educational flyers or enrollment receipts with full integrity.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
