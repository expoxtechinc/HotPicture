import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Award, CheckCircle2, Star, Sparkles, GraduationCap } from 'lucide-react';

interface AcademicDivision {
  id: string;
  name: string;
  tagline: string;
  span: string;
  description: string;
  features: string[];
  focus: string;
  badge: string;
}

export const AcademicSelector: React.FC = () => {
  const divisions: AcademicDivision[] = [
    {
      id: 'early_childhood',
      name: 'Early Childhood Education',
      tagline: 'Nursery, Pre-K, and Kindergarten',
      span: 'Nursery to Kindergarten',
      description: 'Unlocking potential starting from the nursery phase. We provide a warm, encouraging, play-based intellectual environment to cultivate early literacy, numbers recognition, motor activities, and positive cooperative traits.',
      features: [
        'Interactive play-based curriculum',
        'Early childhood cognitive assessment',
        'Phonics and musical discovery programs',
        'Creative arts & speech therapy games'
      ],
      focus: 'Foundational Confidence',
      badge: 'Nursery - Kindergarten'
    },
    {
      id: 'elementary',
      name: 'Elementary Education',
      tagline: 'Grades 1 to 6',
      span: 'Grades 1 - 6',
      description: 'Providing a rigorous foundational curriculum. Emphasis is placed on English reading competence, mathematics, basic science, and cultural citizenship designed to build inquisitive minds.',
      features: [
        'Comprehensive computational math',
        'Guided reading groups & weekly spelling tests',
        'General Science investigations',
        'Introduction into computer literacy basics'
      ],
      focus: 'Essential Skills Mastery',
      badge: 'Grade 1 - 6'
    },
    {
      id: 'junior_high',
      name: 'Junior High School',
      tagline: 'Grades 7 to 9',
      span: 'Grades 7 - 9',
      description: 'Bridging foundational schooling and senior secondary qualifications. Students transition to structural subjects, general sciences, algebra, and participate in active quiz bowl prep or debate societies.',
      features: [
        'Advanced civics & Liberian geography',
        'Pre-Algebra and Introductory Physics',
        'Junior High regional Quiz Bowl training',
        'Adolescent mentorship & character circles'
      ],
      focus: 'Analytical Thinking',
      badge: 'Grade 7 - 9'
    },
    {
      id: 'senior_high',
      name: 'Senior High School',
      tagline: 'Grades 10 to 12',
      span: 'Grades 10 - 12',
      description: 'Preparing Liberian youths for university selection and global leadership. High secondary tracks are geared toward standard West African regional exams (WAEC & WASSCE) with distinguished outcomes.',
      features: [
        'WASSCE Approved science labs',
        'Advanced Stem: Chemistry, Biology & Calculus',
        'National debate elite team selection',
        'Career consultation & university entry prep'
      ],
      focus: 'WASSCE Excellence & Leadership',
      badge: 'WAEC / WASSCE Approved'
    }
  ];

  const [activeTab, setActiveTab] = useState<string>(divisions[0].id);
  const activeDiv = divisions.find((d) => d.id === activeTab) || divisions[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs" id="academic-selector">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            Nursery to 12th Grade
          </div>
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-900">
            Registered Academic Divisions
          </h3>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Our structured programs bridge foundational child growth directly into elite career-ready or university paths.
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-8 bg-slate-50 p-1.5 rounded-xl">
        {divisions.map((div) => {
          const isActive = activeTab === div.id;
          return (
            <button
              key={div.id}
              onClick={() => setActiveTab(div.id)}
              className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              {div.name.split(' ')[0]} {div.name.split(' ')[1] || ''}
            </button>
          );
        })}
      </div>

      {/* Selected division panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100">
                {activeDiv.badge}
              </span>
              <span className="text-xs font-mono text-amber-600 font-medium">
                Focus: {activeDiv.focus}
              </span>
            </div>

            <h4 className="text-2xl font-serif font-bold text-slate-950">
              {activeDiv.name}
              <span className="block text-sm font-sans font-medium text-amber-600 mt-1">
                {activeDiv.tagline}
              </span>
            </h4>

            <p className="text-slate-600 text-sm leading-relaxed">
              {activeDiv.description}
            </p>

            <div className="pt-4 border-t border-slate-150">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Key Academic Benchmarks
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeDiv.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-md">
            <div className="absolute right-0 bottom-0 opacity-10">
              <BookOpen className="w-44 h-44" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-1 bg-white/10 w-fit px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest mb-4">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Proven Pedagogy
              </div>

              <h5 className="text-lg font-serif font-semibold text-amber-100">
                Academic Integrity & High Passing Rates
              </h5>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                We are accredited by the Ministry of Education in Liberia. Graduates are recognized in university matriculations nationwide for mathematical skill and community discipline.
              </p>
            </div>

            <div className="relative z-10 pt-4 mt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Class Standard:</span>
              <span className="text-amber-400 font-semibold">Teacher Certified</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
