import React from 'react';
import { GreetingRecord } from '../types';
import { Trash2, Share2, Play, Clock } from 'lucide-react';

interface Props {
  greetings: GreetingRecord[];
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

const GreetingGallery: React.FC<Props> = ({ greetings, onDelete, onCreateNew }) => {
  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-bold mb-2">My Greetings</h2>
          <p className="text-gray-500">Your collection of personalized moments.</p>
        </div>
      </div>

      {greetings.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
          <Clock size={48} className="text-gray-700 mb-4" />
          <p className="text-gray-500 mb-6">You haven't created any greetings yet.</p>
          <button 
            onClick={onCreateNew}
            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all"
          >
            Create Your First Greeting
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {greetings.map(g => (
            <div key={g.id} className="group bg-[#111114] border border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all shadow-xl">
              <div className="relative aspect-video bg-black">
                <video src={g.videoUrl} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:scale-110 transition-transform">
                    <Play fill="currentColor" size={24} />
                  </button>
                </div>
                <div className="absolute top-3 left-3 px-3 py-1 bg-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {g.occasion}
                </div>
              </div>
              <div className="p-5">
                <p className="text-gray-300 line-clamp-2 text-sm mb-4">"{g.message}"</p>
                <div className="flex justify-between items-center text-gray-500">
                  <span className="text-xs">{new Date(g.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onDelete(g.id)}
                      className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button className="p-2 hover:bg-white/10 hover:text-white rounded-lg transition-colors">
                      <Share2 size={18} />
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