/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Heart, 
  Search, 
  Volume2, 
  Clock, 
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  Music4
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_TRACKS, CATEGORIES, AudioTrack } from './constants';

export default function App() {
  // State
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const [volume, setVolume] = useState(0.8);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load persistence and fetch tracks
  useEffect(() => {
    const loadApp = async () => {
      try {
        // Fetch local JSON
        const response = await fetch('/audio/tracks.json');
        const data = await response.json();
        
        // Map filenames to full URLs if they are local
        const mappedData = data.map((track: any) => ({
          ...track,
          // If url is not provided but filename is, use local path
          url: track.url || `/audio/${track.filename}`
        }));
        
        setTracks(mappedData);

        const savedFavorites = localStorage.getItem('pashto_player_favorites');
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

        const lastTrackId = localStorage.getItem('pashto_player_last_track');
        const lastProgress = localStorage.getItem('pashto_player_last_progress');
        
        if (lastTrackId) {
          const track = mappedData.find((t: AudioTrack) => t.id === lastTrackId);
          if (track) {
            setCurrentTrack(track);
            if (lastProgress) setProgress(parseFloat(lastProgress));
          }
        }
      } catch (error) {
        console.error("Error loading tracks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadApp();
  }, []);

  // Sync favorites
  useEffect(() => {
    localStorage.setItem('pashto_player_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!currentTrack) {
      if (filteredTracks.length > 0) handleTrackSelect(filteredTracks[0]);
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle Track Selection
  const handleTrackSelect = (track: AudioTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    localStorage.setItem('pashto_player_last_track', track.id);
  };

  // Handle Time Update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (total) {
        setProgress((current / total) * 100);
        localStorage.setItem('pashto_player_last_progress', current.toString());
      }
    }
  };

  // Handle Progress Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current && audioRef.current.duration) {
      const newProgress = parseFloat(e.target.value);
      const newTime = (newProgress / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(newProgress);
    }
  };

  // Skip Next/Prev
  const handleNext = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % filteredTracks.length;
    handleTrackSelect(filteredTracks[nextIndex]);
  };

  const handlePrev = () => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;
    handleTrackSelect(filteredTracks[prevIndex]);
  };

  // Favorite toggle
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      const matchesCategory = activeCategory === 'all' || track.category === activeCategory;
      const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           track.artist.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, tracks]);

  // Formatted time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30 overflow-hidden flex flex-col items-center" dir="rtl">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-radial-at-t from-[#3a1510] to-transparent opacity-60 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0a0502] to-transparent" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-lg h-screen flex flex-col px-4 pt-6 pb-24 lg:pb-32">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">صوتي فایلونه</h1>
            <p className="text-xs text-orange-200/50 uppercase tracking-widest font-mono">اسلامي غږیز پلیر</p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md"
          >
            <Music4 className="w-5 h-5 text-orange-500" />
          </motion.div>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input 
            type="text" 
            placeholder="لټون..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-11 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all placeholder:text-white/20"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                activeCategory === cat.id 
                  ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' 
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full mb-4"
              />
              <p className="text-sm">لوډېږي...</p>
            </div>
          ) : filteredTracks.map((track, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={track.id}
              onClick={() => handleTrackSelect(track)}
              className={`group relative flex items-center p-3 rounded-2xl transition-all cursor-pointer border ${
                currentTrack?.id === track.id
                  ? 'bg-orange-600/20 border-orange-500/50'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden mr-0 ml-3 flex-shrink-0">
                <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex gap-0.5 items-end h-3">
                      <motion.div animate={{ height: [4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-orange-500 rounded-full" />
                      <motion.div animate={{ height: [8, 4, 10] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-orange-500 rounded-full" />
                      <motion.div animate={{ height: [12, 6, 8] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-orange-500 rounded-full" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold truncate ${currentTrack?.id === track.id ? 'text-orange-400' : 'text-white'}`}>
                  {track.title}
                </h3>
                <p className="text-xs text-white/40 truncate mt-0.5">{track.artist} • {track.categoryLabel}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-white/30">{track.duration}</span>
                <button 
                  onClick={(e) => toggleFavorite(track.id, e)}
                  className={`p-2 rounded-full transition-colors ${favorites.includes(track.id) ? 'text-orange-500' : 'text-white/20 hover:text-white/40'}`}
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(track.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            </motion.div>
          ))}

          {filteredTracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm">هیڅ فایل ونه موندل شو</p>
            </div>
          )}
        </div>
      </main>

      {/* Mini Player */}
      <AnimatePresence>
        {currentTrack && !showFullPlayer && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 w-full max-w-lg z-50 px-4 pb-6"
          >
            <div 
              onClick={() => setShowFullPlayer(true)}
              className="bg-[#1a1614]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-3 flex items-center shadow-2xl shadow-black/80 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden ml-3">
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{currentTrack.title}</h4>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-10 h-10 flex items-center justify-center text-white"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute top-0 left-0 h-1 bg-white/5 w-full rounded-t-3xl overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Player Overlay */}
      <AnimatePresence>
        {showFullPlayer && currentTrack && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-[#0a0502] flex flex-col px-8 pt-12 pb-16"
          >
            {/* Background Atmosphere for Full Player */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden h-[60%]">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, 0] }}
                transition={{ duration: 15, repeat: Infinity }}
                className="absolute -top-1/4 -right-1/4 w-[150%] aspect-square bg-radial-at-c from-orange-900/40 to-transparent blur-3xl" 
              />
            </div>

            <header className="relative z-10 flex items-center justify-between mb-12">
              <button 
                onClick={() => setShowFullPlayer(false)}
                className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white transition-all"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono">اوس غږیږي</span>
              <button 
                onClick={() => toggleFavorite(currentTrack.id)}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${favorites.includes(currentTrack.id) ? 'bg-orange-600/20 text-orange-500' : 'bg-white/5 border border-white/10 text-white/30'}`}
              >
                <Heart className={`w-5 h-5 ${favorites.includes(currentTrack.id) ? 'fill-current' : ''}`} />
              </button>
            </header>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
              <motion.div 
                layoutId="player-art"
                style={{ borderRadius: '2rem' }}
                className="w-full aspect-square max-w-[320px] shadow-2xl shadow-black/80 overflow-hidden mb-12 ring-1 ring-white/10"
              >
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
              </motion.div>

              <div className="text-center mb-10 w-full">
                <h2 className="text-2xl font-bold text-white mb-2 leading-tight">{currentTrack.title}</h2>
                <p className="text-orange-500 font-medium tracking-wide">{currentTrack.artist}</p>
                <p className="text-white/30 text-xs mt-3 bg-white/5 inline-block px-3 py-1 rounded-full uppercase tracking-tighter">
                  {currentTrack.categoryLabel}
                </p>
              </div>

              {/* Progress Slider */}
              <div className="w-full mb-8">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between mt-3 text-[10px] font-mono text-white/30">
                  <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                  <span>{formatTime(audioRef.current?.duration || 0)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="w-full flex items-center justify-between px-2">
                <button className="text-white/40 hover:text-white transition-colors">
                  <LayoutGrid className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-8">
                  <button 
                    onClick={handlePrev}
                    className="p-4 bg-white/5 rounded-3xl text-white hover:bg-white/10 transition-all border border-white/5"
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>

                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                    className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-black shadow-xl shadow-orange-600/40 relative group"
                  >
                    <div className="absolute inset-0 bg-orange-400 rounded-full scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all" />
                    {isPlaying ? <Pause className="w-8 h-8 relative" /> : <Play className="w-8 h-8 fill-current ml-1 relative" />}
                  </motion.button>

                  <button 
                    onClick={handleNext}
                    className="p-4 bg-white/5 rounded-3xl text-white hover:bg-white/10 transition-all border border-white/5"
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>
                </div>

                <div className="relative group">
                  <button className="text-white/40 hover:text-white transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <footer className="relative z-10 flex justify-center mt-12 gap-8 opacity-40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-mono">وخت ختم شو</span>
              </div>
              <div className="flex items-center gap-2">
                <ListIcon className="w-4 h-4" />
                <span className="text-[10px] font-mono">راتلونکی</span>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: #f97316;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }
        input[type='range']::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #f97316;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #000;
        }
      `}</style>
    </div>
  );
}

