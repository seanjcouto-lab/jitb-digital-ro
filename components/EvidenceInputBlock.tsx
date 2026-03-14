
import React, { useState, useRef } from 'react';
import SectionHeader from './SectionHeader';

interface EvidenceInputBlockProps {
  title: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onTakePhoto: () => void;
  onTakeVideo: () => void;
  onRecordAudio: () => void;
  placeholder: string;
}

const EvidenceInputBlock: React.FC<EvidenceInputBlockProps> = ({
  title,
  notes,
  onNotesChange,
  onTakePhoto,
  onTakeVideo,
  onRecordAudio,
  placeholder,
}) => {
  const [isDictating, setIsDictating] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  const toggleDictation = () => {
    if (isDictating) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported by this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    speechRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => {
      setIsDictating(false);
      speechRecognitionRef.current = null;
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsDictating(false);
    };
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      onNotesChange((notes + " " + transcript).trim());
    };

    recognition.start();
  };

  const handleInputFocus = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    setTimeout(() => {
        event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <div>
      <SectionHeader title={title} />
      <div className="relative">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onFocus={handleInputFocus}
          className="w-full h-28 bg-slate-900 border border-slate-700 rounded-lg p-4 text-white text-base focus:border-slate-500 outline-none transition-colors"
          placeholder={placeholder}
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button onClick={toggleDictation} title="Dictate Notes" className={`p-2.5 rounded-full transition-colors ${isDictating ? 'bg-red-500/50' : 'bg-slate-700/50 hover:bg-slate-600/50'}`}>
            <svg className={`w-5 h-5 text-white ${isDictating ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 3a3 3 0 016 0v5a3 3 0 01-6 0V3zm2 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 00-1 1v1a3 3 0 003 3h1a3 3 0 003-3v-1a1 1 0 10-2 0v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex items-stretch gap-4 mt-4">
        <button onClick={onTakePhoto} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 py-3 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>Photo</button>
        <button onClick={onTakeVideo} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 py-3 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 5.553A1 1 0 0116 6.447V13.553a1 1 0 01-1.447.894l-3-2.25A1 1 0 0111 11.5v-3a1 1 0 01.553-.894l3-2.25z" /></svg>Video</button>
        <button onClick={onRecordAudio} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 py-3 rounded-xl transition-all">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 3a3 3 0 016 0v5a3 3 0 01-6 0V3zm2 5a1 1 0 011-1h.01a1 1 0 110 2H8a1 1 0 01-1-1zm-1 3a1 1 0 00-1 1v1a3 3 0 003 3h1a3 3 0 003-3v-1a1 1 0 10-2 0v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Audio
        </button>
      </div>
    </div>
  );
};

export default EvidenceInputBlock;
