import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Mail, Phone, Clock, MapPin, Send, CheckCircle, AlertTriangle } from 'lucide-react';

export const InquiryForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      setErrorMsg('Please pre-fill all required inquiry field parameters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Generate compliant ID client side matching security guidelines: id == inquiryId
    const randomSuffix = Math.random().toString(36).substring(2, 11);
    const inqId = `inq_${Date.now()}_${randomSuffix}`;

    try {
      const docRef = doc(db, 'inquiries', inqId);
      const payload = {
        id: inqId,
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'unread',
        createdAt: new Date(), // this will be evaluated as a Timestamp or handled on the client
      };

      await setDoc(docRef, payload);
      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg('Submission error. Please ensure form fields match requirements.');
      // Handle the strict error tracking pattern as specified in the firebase-integration skill:
      try {
        handleFirestoreError(err, OperationType.CREATE, `inquiries/${inqId}`);
      } catch (logErr) {
        // Log is already printed in console as JSON from handleFirestoreError
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="contact-form-section">
      {/* Informative column */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
            Get in touch
          </span>
          <h3 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 mt-2">
            Get In Touch
          </h3>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            We&apos;d love to hear from you. Contact the Multee International administrative offices directly for registration questions, school fees schedules, school brochures, and academic reports.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-xs transition-colors hover:border-slate-200">
            <span className="p-3 bg-blue-50 text-blue-700 rounded-xl max-h-12 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Our Location</span>
              <span className="text-sm font-medium text-slate-800">
                Greenland Community, Johnsonville, Montserrado County, Liberia
              </span>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-xs transition-colors hover:border-slate-200">
            <span className="p-3 bg-amber-50 text-amber-700 rounded-xl max-h-12 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Telephone Line</span>
              <a href="tel:+231777829659" className="text-sm font-semibold text-blue-900 hover:underline">
                +231 77 782 9659
              </a>
              <span className="text-xs text-slate-500 block">Admissions &amp; Registrar Coordinator</span>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-xs transition-colors hover:border-slate-200">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-xl max-h-12 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Send Email</span>
              <a href="mailto:multeeschoolsystem@gmail.com" className="text-sm font-semibold text-blue-900 hover:underline">
                multeeschoolsystem@gmail.com
              </a>
              <span className="text-xs text-slate-500 block block">Official administration contact</span>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-xs transition-colors hover:border-slate-200">
            <span className="p-3 bg-purple-50 text-purple-700 rounded-xl max-h-12 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </span>
            <div className="text-xs leading-relaxed text-slate-600">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Working Hours</span>
              <p><span className="font-medium text-slate-800">Monday - Friday:</span> 7:30 AM - 4:00 PM</p>
              <p><span className="font-medium text-slate-800">Saturday (T-VET Labs):</span> 9:00 AM - 2:00 PM</p>
              <p><span className="font-medium text-slate-800">Sunday:</span> <span className="text-rose-600 font-semibold">Closed</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Submission column */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs">
        <h4 className="text-lg font-serif font-bold text-slate-900 mb-2">
          Send an Inquiry
        </h4>
        <p className="text-slate-500 text-xs mb-6">
          Fill out the message form below and one of our school team representatives will call or email you soon.
        </p>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <h5 className="font-bold text-slate-900">Inquiry Received Successfully!</h5>
            <p className="text-xs text-slate-650 max-w-sm mx-auto leading-relaxed">
              Thank you for trusting Multee International School. Your inquiry has been securely stored. Our admissions coordinator will verify your information and get back to you shortly.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-2 text-xs font-semibold px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Samuel Karpeh"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. samuel@gmail.com"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Registration details for early child"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Write Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message details..."
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-50 resize-y"
              ></textarea>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 border border-blue-950 text-white font-medium text-sm py-3 px-4 rounded-xl hover:bg-blue-950 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs group disabled:opacity-50"
            >
              {loading ? (
                <span>Submitting Inquiry...</span>
              ) : (
                <>
                  <span>Send Message</span>
                  <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
