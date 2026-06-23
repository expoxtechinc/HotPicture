import React, { useState } from 'react';
import { Scissors, Sparkles, Laptop, ShieldCheck, Heart, Newspaper, Flame, Clock, CalendarDays } from 'lucide-react';

interface TvetTrack {
  id: string;
  name: string;
  icon: React.ReactNode;
  duration: string;
  description: string;
  skills: string[];
  color: string;
  jobs: string;
}

export const TvetTracksGrid: React.FC = () => {
  const tracks: TvetTrack[] = [
    {
      id: 'computer_science',
      name: 'Computer Science',
      icon: <Laptop className="w-6 h-6" />,
      duration: '9 Months Certification',
      description: 'Acquiring robust computer literacy, office suite execution, software basics, network configurations, and introductory web scripting for tech placement.',
      skills: ['Office Productivity Systems', 'Web Fundamentals', 'IT Troubleshooting', 'Digital Media Management'],
      color: 'from-blue-50 to-indigo-50 border-blue-100 text-blue-700 hover:border-blue-300',
      jobs: 'ICT Assistant, Cyber Cafe Manager, Data Entry Operator'
    },
    {
      id: 'tailoring',
      name: 'Tailoring & Fashion Design',
      icon: <Scissors className="w-6 h-6" />,
      duration: '9 Months Certification',
      description: 'Mastering apparel construction, draft patterns, body measurements, sewing machines maintenance, and traditional Liberian fabric assemblies.',
      skills: ['Pattern Drafting & Cutting', 'Sewing Machine Mastery', 'Apparel Design & Fitting', 'Garment Embellishments'],
      color: 'from-amber-50 to-orange-50 border-amber-100 text-amber-700 hover:border-amber-300',
      jobs: 'Fashion Designer, Independent Tailor, Textiles Entrepreneur'
    },
    {
      id: 'pastry',
      name: 'Pastry & Baking Arts',
      icon: <Flame className="w-6 h-6" />,
      duration: '9 Months Certification',
      description: 'Providing student baking chefs with hand-on experience in breads, desserts, dough management, cakes, catering principles, and industrial nutrition hygiene.',
      skills: ['Yeasts & Breads Crafting', 'Sugar Crafting & Cake Art', 'Commercial Food Prep', 'Bakery Cost Calculation'],
      color: 'from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700 hover:border-emerald-300',
      jobs: 'Baking Chef, Catering Specialist, Pastry Shop Owner'
    },
    {
      id: 'journalism',
      name: 'Journalism & Communications',
      icon: <Newspaper className="w-6 h-6" />,
      duration: '9 Months Certification',
      description: 'Acquiring fundamental skills in broadcast interviewing, news report writing, voice modulation, digital media ethic codes, and grassroots field presentation.',
      skills: ['News Writing & Fact Checking', 'Audio/Podcast Recording', 'Broadcast Interrogations', 'Legal Journalism Standards'],
      color: 'from-sky-50 to-cyan-50 border-sky-100 text-sky-700 hover:border-sky-300',
      jobs: 'Radio Presenter, Grassroots Reporter, Media Officer'
    },
    {
      id: 'hair_dressing',
      name: 'Hair Dressing',
      icon: <Sparkles className="w-6 h-6" />,
      duration: '9 Months Certification',
      description: 'Comprehensive instruction on hair cutting, advanced weaving, treatment products, chemical care safety, braiding techniques, and salon setups.',
      skills: ['Advance Braiding & Weaves', 'Scalp Care & Product Chemistry', 'Advanced Cut Styling', 'Customer Service & Hygiene'],
      color: 'from-purple-50 to-fuchsia-50 border-purple-100 text-purple-700 hover:border-purple-300',
      jobs: 'Professional Hair Stylist, Hair Consultant, Bridal Therapist'
    },
    {
      id: 'beauty_care',
      name: 'Beauty Care & Cosmetology',
      icon: <Heart className="w-6 h-6" />,
      duration: '9 Months Certification',
      description: 'Instruction in modern aesthetics, facial therapies, professional skin-type assessments, manicure, pedicure, and bridal/stage cosmetic applications.',
      skills: ['Dermatological Safety Basics', 'Professional Cosmetic Styles', 'Manicure & Pedicure Arts', 'Salon Sanitization Protocols'],
      color: 'from-pink-50 to-rose-50 border-pink-100 text-pink-700 hover:border-pink-300',
      jobs: 'Cosmetic Artist, Beauty Lounge Manager, Spa Consultant'
    }
  ];

  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  return (
    <div className="w-full" id="tvet-section">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            9mos TVET Vocational tracks
          </div>
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-900">
            Technical & Vocational Training (T-VET)
          </h3>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Empowering Liberian youth with direct, practical skills to enter the global workforce or launch local business operations with certified training.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0">
          <CalendarDays className="w-4 h-4 text-amber-500" />
          <span>Labs: Sat 9:00 AM - 2:00 PM</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => (
          <div
            key={track.id}
            onClick={() => setSelectedTrack(selectedTrack === track.id ? null : track.id)}
            className={`border rounded-2xl p-6 bg-white transition-all cursor-pointer card-shine overflow-hidden group ${
              selectedTrack === track.id 
                ? 'ring-2 ring-blue-600 border-transparent shadow-md' 
                : 'border-slate-100 hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${track.color} shrink-0`}>
                {track.icon}
              </div>
              <span className="text-[11px] font-mono font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                {track.duration}
              </span>
            </div>

            <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
              {track.name}
            </h4>

            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              {track.description}
            </p>

            {/* Click to expand indicators */}
            <div className={`mt-4 space-y-3 transition-all duration-300 ${
              selectedTrack === track.id ? 'opacity-100 max-h-96' : 'opacity-45 max-h-6 overflow-hidden'
            }`}>
              {selectedTrack === track.id ? (
                <>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest block mb-2">
                      Practical Lessons:
                    </span>
                    <ul className="grid grid-cols-1 gap-1.5">
                      {track.skills.map((skill, sIdx) => (
                        <li key={sIdx} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Career Scope:
                    </span>
                    <span className="text-xs text-slate-700 font-medium">
                      {track.jobs}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-blue-600 text-xs font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Click to view lessons & career pathways →
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mt-8 flex flex-col sm:flex-row items-center gap-4">
        <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h5 className="text-sm font-bold text-slate-900">National T-VET Standards Aligned</h5>
          <p className="text-xs text-slate-600 mt-1">
            Our intensive 9-month professional certification track includes a combined mandate of theoretical classroom learning and compulsory Saturday practical labs, concluding with a national exhibition and accredited certification.
          </p>
        </div>
      </div>
    </div>
  );
};
