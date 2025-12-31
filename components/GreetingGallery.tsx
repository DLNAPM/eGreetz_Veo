
import React from 'react';
import { GreetingRecord } from '../types';
import { Trash2, Share2, Play, Clock, Inbox, Sparkles, Edit3 } from 'lucide-react';

interface Props {
  greetings: GreetingRecord[];
  receivedGreetings?: GreetingRecord[];
  onDelete: (id: string) => void;
  onEdit: (greeting: GreetingRecord) => void;
  onSelect: (greeting: GreetingRecord) => void;
  onCreateNew: () => void;
}

const GreetingGallery: React.FC<Props> = ({ greetings, receivedGreetings = [], onDelete, onEdit, onSelect, onCreateNew }) => {
  const renderCard = (g: any, canModify: boolean) => (
    <div 
      key={g.id} 
      className="group relative bg-[#111114] border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500 hover:ring-2 hover:ring-blue-500/20 transition-all shadow-xl cursor-pointer"
      onClick={() => onSelect(g)}
    >
      <div className="relative aspect-video bg-black overflow-hidden pointer-events-none">
        <video 
          src={g.videoUrl} 
          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-transparent transition-colors">
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all">
            <Play fill="currentColor" size={24} />
          </div>
        </div>
        <div className="absolute top-3 left-3 px-3 py-1 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg z-10 text-white">
          {g.occasion}
        </div>
        {g.isReceived && (
          <div className="absolute top-3 right-3 px-3 py-1 bg-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg z-10 text-white flex items-center gap-1">
            <Inbox size={10} /> Received
          </div>
        )}
      </div>
      
      <div className="p-5 border-t border-white/5">
        <p className="text-gray-300 line-clamp-2 text-sm mb-4 font-medium italic">"{g.message}"</p>
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              {g.isReceived ? `From: ${g.senderName}` : 'Production Date'}
            </span>
            <span className="text-[10px] text-gray-600">
              {new Date(g.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex gap-1">
            {canModify && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(g);
                  }}
                  className="p-2 text-gray-600 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all"
                  title="Edit Greeting"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(g.id);
                  }}
                  className="p-2 text-gray-600 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(g.videoUrl);
                alert("Cloud link copied!");
              }}
              className="p-2 text-gray-600 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all"
              title="Copy Cloud Link"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full animate-in fade-in duration-700 pb-20">
      {/* Sent Greetings Section */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Sparkles className="text-blue-500" /> My Productions
            </h2>
            <p className="text-gray-500 text-sm">Permanent cloud-hosted cinematic greetings.</p>
          </div>
        </div>

        {greetings.length === 0 && receivedGreetings.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-[#0a0a0c] text-center">
            <Clock size={32} className="text-gray-700 mb-4" />
            <p className="text-gray-500 text-sm mb-6">No videos in your cloud library.</p>
            <button 
              onClick={onCreateNew}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-500 transition-all text-sm"
            >
              Start Creating
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Display both created and received if combined view is preferred, 
                but based on requirements we show them in their respective sections.
                User specifically mentioned them not showing up in My Productions,
                so we will list them together here but with appropriate labels. */}
            {greetings.map(g => renderCard(g, true))}
            {receivedGreetings.map(g => renderCard(g, false))}
          </div>
        )}
      </section>

      {/* Explicit Received Greetings Section if there are many */}
      {receivedGreetings.length > 5 && (
        <section>
          <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <Inbox className="text-purple-500" /> Inbox
              </h2>
              <p className="text-gray-500 text-sm">Manage greetings received from others.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receivedGreetings.map(g => renderCard(g, false))}
          </div>
        </section>
      )}
    </div>
  );
};

export default GreetingGallery;
