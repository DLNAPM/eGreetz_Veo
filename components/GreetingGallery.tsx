
import React from 'react';
import { GreetingRecord } from '../types';
import { Trash2, Share2, Play, Clock, AlertCircle } from 'lucide-react';

interface Props {
  greetings: GreetingRecord[];
  onDelete: (id: string) => void;
  onSelect: (greeting: GreetingRecord) => void;
  onCreateNew: () => void;
}

const GreetingGallery: React.FC<Props> = ({ greetings, onDelete, onSelect, onCreateNew }) => {
  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-bold mb-2">My Collection</h2>
          <p className="text-gray-500">Your personalized cinematic moments across all sessions.</p>
        </div>
      </div>

      {greetings.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-[#0a0a0c]">
          <Clock size={48} className="text-gray-700 mb-4" />
          <p className="text-gray-500 mb-6">Your gallery is currently empty.</p>
          <button 
            onClick={onCreateNew}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-500 transition-all"
          >
            Start Your First Production
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {greetings.map(g => (
            <div 
              key={g.id} 
              className="group relative bg-[#111114] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500 hover:ring-2 hover:ring-blue-500/20 transition-all shadow-xl cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                onSelect(g);
              }}
            >
              <div className="relative aspect-video bg-black overflow-hidden pointer-events-none">
                <video 
                  src={g.videoUrl} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                />
                
                {/* Expired Blob Guard (Visual only) */}
                {!g.videoUrl.startsWith('http') && !g.videoUrl.startsWith('https') && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={32} className="text-yellow-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Local Draft</span>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                  <div className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all shadow-2xl">
                    <Play fill="currentColor" size={24} />
                  </div>
                </div>
                <div className="absolute top-3 left-3 px-3 py-1 bg-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg z-10">
                  {g.occasion}
                </div>
              </div>
              
              <div className="p-5 border-t border-white/5">
                <p className="text-gray-300 line-clamp-2 text-sm mb-4 font-medium italic">"{g.message}"</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{new Date(g.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(g.id);
                      }}
                      className="p-2 text-gray-600 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                      title="Delete Greeting"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Share logic
                      }}
                      className="p-2 text-gray-600 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all"
                      title="Share"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GreetingGallery;
