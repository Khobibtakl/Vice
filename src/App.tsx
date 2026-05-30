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
  LayoutList,
  Music4,
  Sun,
  Moon,
  Palette,
  ArrowUpDown,
  Info,
  MessageCircle,
  Phone,
  Facebook,
  Mail,
  Send,
  User2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_TRACKS, CATEGORIES, AudioTrack } from './constants';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

const ACCENT_THEMES = [
  { id: 'default', color: '#f97316' },
  { id: 'emerald', color: '#10b981' },
  { id: 'rose', color: '#f43f5e' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'violet', color: '#8b5cf6' },
  { id: 'amber', color: '#f59e0b' },
  { id: 'cyan', color: '#06b6d4' },
  { id: 'indigo', color: '#6366f1' },
  { id: 'teal', color: '#14b8a6' },
  { id: 'pink', color: '#ec4899' },
];

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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accentTheme, setAccentTheme] = useState('default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'default'>('default');
  const [showSplash, setShowSplash] = useState(true);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Theme synchronization
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Initialize Capacitor Status Bar Overlay
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

    if (isDarkMode) {
      root.classList.remove('light');
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    } else {
      root.classList.add('light');
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    }
    
    if (accentTheme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', accentTheme);
    }
  }, [isDarkMode, accentTheme]);

  // Capacitor Back Button Handling
  useEffect(() => {
    const handleBackButton = CapApp.addListener('backButton', () => {
      if (showThemePicker) {
        setShowThemePicker(false);
      } else if (showInfo) {
        setShowInfo(false);
      } else if (showContact) {
        setShowContact(false);
      } else if (showFullPlayer) {
        setShowFullPlayer(false);
      } else if (activeCategory !== 'all' || searchQuery !== '') {
        setActiveCategory('all');
        setSearchQuery('');
      } else {
        CapApp.exitApp().catch(() => {});
      }
    });

    return () => {
      handleBackButton.then(h => h.remove());
    };
  }, [showFullPlayer, activeCategory, searchQuery, showThemePicker, showInfo, showContact]);

  // Formatted time
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load persistence and fetch tracks
  useEffect(() => {
    const loadApp = async () => {
      try {
        let response;
        let data: any = [];
        try {
          response = await fetch('audio/tracks.json');
          if (response.ok) {
            const rawText = await response.text();
            try {
              data = JSON.parse(rawText);
            } catch (pErr) {
              console.warn("Standard JSON parse failed, trying safe cleaning...", pErr);
              // Clean trailing commas and spacing in arrays or objects
              const cleanedText = rawText
                .replace(/,\s*([\]}])/g, '$1') // remove trailing commas
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":'); // wrap unquoted keys with quotes
              data = JSON.parse(cleanedText);
            }
          } else {
            throw new Error(`Failed to fetch tracks.json: status ${response.status}`);
          }
        } catch (fetchErr) {
          console.error("Failed to load tracks.json, generating default fallback list:", fetchErr);
          // Fallback array of 50 items so the app is always fully functional and populated
          data = Array.from({ length: 50 }, (_, i) => `${i + 1}.mp3`);
        }

        // Helper to format beautiful Pashto titles from filenames like '1.mp3' or '1'
        const formatTitleFromFilename = (filename: string) => {
          const cleanName = filename.replace(/\.[^/.]+$/, ""); // strip extension
          const num = parseInt(cleanName, 10);
          if (!isNaN(num)) {
            return `${num}- برخه د مسئلو جوابونه`;
          }
          return cleanName;
        };

        // Initial mapping with robust support for array of strings or simple objects
        const mappedData = (Array.isArray(data) ? data : []).map((track: any, index: number) => {
          const isString = typeof track === 'string';
          const filename = isString ? track : (track?.filename || track?.url?.split('/').pop() || `track-${index}.mp3`);
          const title = isString ? formatTitleFromFilename(filename) : (track?.title || formatTitleFromFilename(filename));
          const category = isString ? 'lessons' : (track?.category || 'lessons');

          return {
            id: isString ? `track-${index}` : (track.id || `track-${index}`),
            title: title,
            category: category,
            artist: isString ? 'مفتي محمد آصف مبارز' : (track.artist || 'مفتي محمد آصف مبارز'),
            url: isString ? `audio/${filename}` : (track.url || `audio/${filename}`),
            filename: filename,
            duration: isString ? '00:00' : (track.duration || '00:00'),
            thumbnail: isString ? 'https://images.unsplash.com/photo-1514525253361-bee8a8168ea7?auto=format&fit=crop&q=80&w=400' : (track.thumbnail || 'https://images.unsplash.com/photo-1514525253361-bee8a8168ea7?auto=format&fit=crop&q=80&w=400'),
            categoryLabel: CATEGORIES.find(c => c.id === category)?.label || 'شرعي جوابونه'
          };
        });

        setTracks(mappedData);

        const savedFavorites = localStorage.getItem('pashto_player_favorites');
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

        const savedTheme = localStorage.getItem('pashto_player_theme');
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');

        const savedAccent = localStorage.getItem('pashto_player_accent');
        if (savedAccent) setAccentTheme(savedAccent);

        const savedViewMode = localStorage.getItem('pashto_player_view_mode') as 'list' | 'grid' | null;
        if (savedViewMode) setViewMode(savedViewMode);

        const lastTrackId = localStorage.getItem('pashto_player_last_track');
        if (lastTrackId) {
          const track = mappedData.find((t: AudioTrack) => t.id === lastTrackId);
          if (track) setCurrentTrack(track);
        }

        setTimeout(() => setShowSplash(false), 2000);
      } catch (error) {
        console.error("Error loading tracks:", error);
        setShowSplash(false);
      } finally {
        setLoading(false);
      }
    };
    loadApp();
  }, []);

  // Sync state to storage
  useEffect(() => {
    localStorage.setItem('pashto_player_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('pashto_player_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('pashto_player_accent', accentTheme);
  }, [accentTheme]);

  useEffect(() => {
    localStorage.setItem('pashto_player_view_mode', viewMode);
  }, [viewMode]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!currentTrack) {
      if (filteredTracks.length > 0) handleTrackSelect(filteredTracks[0]);
      return;
    }
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(err => {
        console.warn("Playback toggle play failed:", err);
      });
    }
  };

  // Handle Track Selection
  const handleTrackSelect = (track: AudioTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    
    // Programmatically set source and play synchronously to bypass iOS/browser gesture policies
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.warn("Direct play failed, browser might have blocked it:", err);
      });
    }

    setCurrentTrack(track);
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

  // Filtered and sorted tracks
  const filteredTracks = useMemo(() => {
    let result = tracks.filter(track => {
      const matchesCategory = activeCategory === 'all' || track.category === activeCategory;
      const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           track.artist.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'artist') {
      result = [...result].sort((a, b) => a.artist.localeCompare(b.artist));
    }

    return result;
  }, [activeCategory, searchQuery, tracks, sortBy]);

  return (
    <div className="min-h-screen transition-colors duration-500 overflow-hidden flex flex-col items-center" dir="rtl">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute inset-0 bg-radial-at-t transition-opacity duration-1000 ${isDarkMode ? 'opacity-60' : 'opacity-100'} blur-3xl`} style={{ backgroundImage: `radial-gradient(circle at top, var(--accent-soft), transparent)` }} />
      </div>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-lg h-screen flex flex-col px-4 pt-4 pb-24 lg:pb-32 overflow-hidden safe-area-top">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">شرعي مسايلو حل</h1>
            <p className={`text-[10px] uppercase tracking-widest font-mono opacity-50`}>مفتي محمد آصف مبارز</p>
          </div>
          <div className="flex gap-2">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowContact(true)}
              className={`p-3 rounded-2xl backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`}
            >
              <MessageCircle className="w-5 h-5" />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowInfo(true)}
              className={`p-3 rounded-2xl backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`}
            >
              <Info className="w-5 h-5" />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const sorts: ('default' | 'title' | 'artist')[] = ['default', 'title', 'artist'];
                const next = sorts[(sorts.indexOf(sortBy) + 1) % sorts.length];
                setSortBy(next);
              }}
              className={`p-3 rounded-2xl backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'} ${sortBy !== 'default' ? 'text-accent border-accent' : ''}`}
              style={sortBy !== 'default' ? { color: 'var(--accent-color)', borderColor: 'var(--accent-color)' } : {}}
            >
              <ArrowUpDown className="w-5 h-5" />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className={`p-3 rounded-2xl backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`}
            >
              {viewMode === 'list' ? <LayoutGrid className="w-5 h-5" /> : <LayoutList className="w-5 h-5" />}
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowThemePicker(!showThemePicker)}
              className={`p-3 rounded-2xl backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`}
            >
              <Palette className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-3 rounded-2xl backdrop-blur-md border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-6">
          <Search className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30`} />
          <input 
            type="text" 
            placeholder="لټون..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-2xl py-3 pr-11 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-all ${
              isDarkMode 
                ? 'bg-white/5 border-white/10 placeholder:text-white/20' 
                : 'bg-black/5 border-black/10 placeholder:text-black/20 text-black'
            }`}
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
                  ? 'bg-accent border-accent text-white shadow-lg' 
                  : `border-transparent ${isDarkMode ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-black/5 text-black/50 hover:bg-black/10'}`
              }`}
              style={activeCategory === cat.id ? { backgroundColor: 'var(--accent-color)', borderColor: 'var(--accent-color)', boxShadow: `0 10px 15px -3px var(--accent-soft)` } : {}}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List Body */}
        <div className={`flex-1 overflow-y-auto no-scrollbar pr-1 pb-4 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-4 space-y-0' : 'space-y-3'}`}>
          {loading ? (
             <div className="flex justify-center py-10 col-span-full">
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                 <Music4 className="w-6 h-6 opacity-30" style={{ color: 'var(--accent-color)' }} />
               </motion.div>
            </div>
          ) : filteredTracks.map((track, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              key={track.id}
              onClick={() => handleTrackSelect(track)}
              className={`group relative transition-all cursor-pointer border overflow-hidden ${
                viewMode === 'grid' 
                ? 'flex flex-col rounded-3xl p-0' 
                : 'flex items-center p-3 rounded-2xl'
              } ${
                currentTrack?.id === track.id
                  ? 'bg-accent-soft border-accent'
                  : `${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10 hover:border-black/10'}`
              }`}
              style={currentTrack?.id === track.id ? { backgroundColor: 'var(--accent-soft)', borderColor: 'var(--accent-color)' } : {}}
            >
              <div className={`${viewMode === 'grid' ? 'w-full aspect-square relative' : 'relative w-12 h-12 rounded-xl overflow-hidden ml-3 flex-shrink-0'}`}>
                <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex gap-0.5 items-end h-3">
                      <motion.div animate={{ height: [4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-accent rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                      <motion.div animate={{ height: [8, 4, 10] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-accent rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                      <motion.div animate={{ height: [12, 6, 8] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-accent rounded-full" style={{ backgroundColor: 'var(--accent-color)' }} />
                    </div>
                  </div>
                )}
                {viewMode === 'grid' && (
                  <button 
                    onClick={(e) => toggleFavorite(track.id, e)}
                    className={`absolute top-3 left-3 p-2 rounded-full backdrop-blur-md bg-black/20 transition-all ${favorites.includes(track.id) ? 'text-accent' : 'text-white/40 hover:text-white'}`}
                    style={favorites.includes(track.id) ? { color: 'var(--accent-color)' } : {}}
                  >
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(track.id) ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
              
              <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'p-3' : ''}`}>
                <h3 className={`text-sm font-semibold truncate ${currentTrack?.id === track.id ? 'text-accent' : ''}`} style={currentTrack?.id === track.id ? { color: 'var(--accent-color)' } : {}}>
                  {track.title || track.filename}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-[10px] truncate opacity-40`}>{track.artist}</p>
                  <span className="text-[10px] opacity-20">•</span>
                  <p className="text-[10px] opacity-30 font-mono">{track.filename}</p>
                </div>
              </div>

              {viewMode === 'list' && (
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono opacity-30`}>{track.duration}</span>
                  <button 
                    onClick={(e) => toggleFavorite(track.id, e)}
                    className={`p-2 rounded-full transition-colors ${favorites.includes(track.id) ? 'text-accent' : 'opacity-20 hover:opacity-100'}`}
                    style={favorites.includes(track.id) ? { color: 'var(--accent-color)' } : {}}
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(track.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
          {!loading && filteredTracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 col-span-full">
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
            className="fixed bottom-0 w-full max-w-lg z-40 px-4 pb-6 safe-area-bottom"
          >
            <div 
              onClick={() => setShowFullPlayer(true)}
              className={`backdrop-blur-xl border rounded-3xl p-3 flex items-center shadow-2xl transition-colors duration-500 ${
                isDarkMode ? 'bg-[#1a1614]/90 border-white/10 shadow-black/80' : 'bg-white/90 border-black/10 shadow-orange-900/10'
              }`}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden ml-3">
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{currentTrack.title}</h4>
                <p className={`text-[10px] uppercase tracking-widest opacity-40`}>{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-10 h-10 flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              <div className={`absolute top-0 left-0 h-1 w-full rounded-t-3xl overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: 'var(--accent-color)' }} />
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
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed inset-0 z-50 flex flex-col px-8 pt-4 pb-16 transition-colors duration-500 safe-area-top safe-area-bottom ${isDarkMode ? 'bg-[#0a0502]' : 'bg-[#fdf8f5]'}`}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden h-[60%] opacity-50">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, 0] }}
                transition={{ duration: 15, repeat: Infinity }}
                className="absolute -top-1/4 -right-1/4 w-[150%] aspect-square blur-3xl opacity-50" 
                style={{ backgroundImage: `radial-gradient(circle at center, var(--accent-soft), transparent)` }}
              />
            </div>

            <header className="relative z-10 flex items-center justify-between mb-8 mt-4">
              <button 
                onClick={() => setShowFullPlayer(false)}
                className={`w-12 h-12 flex items-center justify-center border rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-black/5 border-black/10 text-black/50'}`}
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <span className={`text-[10px] uppercase tracking-[0.2em] font-mono opacity-30`}>اوس غږیږي</span>
              <button 
                onClick={() => toggleFavorite(currentTrack.id)}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${favorites.includes(currentTrack.id) ? 'bg-accent-soft text-accent' : `${isDarkMode ? 'bg-white/5 border-white/10 text-white/30' : 'bg-black/5 border-black/10 text-black/30'}`}`}
                style={favorites.includes(currentTrack.id) ? { backgroundColor: 'var(--accent-soft)', color: 'var(--accent-color)' } : {}}
              >
                <Heart className={`w-5 h-5 ${favorites.includes(currentTrack.id) ? 'fill-current' : ''}`} />
              </button>
            </header>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center mt-4">
              <motion.div 
                layoutId="player-art"
                style={{ borderRadius: '2.5rem' }}
                className={`w-full aspect-square max-w-[320px] shadow-2xl overflow-hidden mb-10 ring-1 ${isDarkMode ? 'shadow-black/80 ring-white/10' : 'shadow-black/5 ring-black/5'}`}
              >
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
              </motion.div>

              <div className="text-center mb-8 w-full px-4">
                <h2 className="text-2xl font-bold mb-2 leading-tight">{currentTrack.title}</h2>
                <p className="text-accent font-bold tracking-wide text-lg" style={{ color: 'var(--accent-color)' }}>{currentTrack.artist}</p>
                <p className={`text-[10px] mt-4 inline-block px-4 py-1.5 rounded-full uppercase tracking-tighter font-semibold ${isDarkMode ? 'bg-white/5 text-white/30' : 'bg-black/5 text-black/30'}`}>
                  {currentTrack.categoryLabel}
                </p>
              </div>

              <div className="w-full mb-10 px-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-accent ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}
                />
                <div className={`flex justify-between mt-4 text-xs font-mono font-medium opacity-30`}>
                  <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                  <span>{formatTime(audioRef.current?.duration || 0)}</span>
                </div>
              </div>

              <div className="w-full flex items-center justify-between px-2">
                <button className="opacity-40 hover:opacity-100 transition-opacity">
                  <LayoutGrid className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-6">
                  <button 
                    onClick={handlePrev}
                    className={`p-5 rounded-3xl transition-all border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>

                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                    className="w-20 h-20 bg-accent rounded-full flex items-center justify-center text-white shadow-xl relative group"
                    style={{ backgroundColor: 'var(--accent-color)', boxShadow: `0 20px 25px -5px var(--accent-soft)` }}
                  >
                    <div className="absolute inset-0 bg-white/20 rounded-full scale-100 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all" />
                    {isPlaying ? <Pause className="w-8 h-8 relative" /> : <Play className="w-8 h-8 fill-current ml-1 relative" />}
                  </motion.button>

                  <button 
                    onClick={handleNext}
                    className={`p-5 rounded-3xl transition-all border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>
                </div>

                <button className="opacity-40 hover:opacity-100 transition-opacity">
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <footer className={`relative z-10 flex justify-center mt-12 gap-8 opacity-40`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-mono font-bold tracking-tight">وخت تېر شو</span>
              </div>
              <div className="flex items-center gap-2">
                <ListIcon className="w-4 h-4" />
                <span className="text-[10px] font-mono font-bold tracking-tight">اضافه شوي</span>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme Picker Modal */}
      <AnimatePresence>
        {showThemePicker && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThemePicker(false)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-[90%] max-w-sm rounded-[3rem] p-8 shadow-2xl border ${isDarkMode ? 'bg-[#1a1614] border-white/10' : 'bg-white border-black/10'}`}
            >
              <h3 className="text-xl font-bold mb-6 text-center">رنګ غوره کړئ</h3>
              <div className="grid grid-cols-5 gap-4">
                {ACCENT_THEMES.map((theme) => (
                  <motion.button
                    key={theme.id}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setAccentTheme(theme.id); setShowThemePicker(false); }}
                    className={`aspect-square rounded-2xl flex items-center justify-center border-4 transition-all ${accentTheme === theme.id ? 'border-white ring-4 ring-orange-500/20' : 'border-transparent'}`}
                    style={{ backgroundColor: theme.color }}
                  >
                    {accentTheme === theme.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </motion.button>
                ))}
              </div>
              <button 
                onClick={() => setShowThemePicker(false)}
                className="w-full mt-8 py-4 bg-orange-600/10 text-orange-500 font-bold rounded-2xl hover:bg-orange-600/20 transition-all font-mono"
              >
                بندول
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfo(false)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-[90%] max-w-sm rounded-[3rem] shadow-2xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1a1614] border-white/10' : 'bg-white border-black/10'}`}
            >
              <div className="p-8 pb-4 overflow-y-auto max-h-[70vh] no-scrollbar">
                <div className="flex flex-col items-center mb-6">
                   <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4">
                     <Music4 className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="text-xl font-bold">د کاريال په اړه</h3>
                   <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">About Application</p>
                </div>

                <div className="space-y-4 text-right">
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">📱 نوم:</p>
                    <p className="text-sm font-bold">شرعي مسايلو حل</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🎙 جوابونکي:</p>
                    <p className="text-sm font-bold">محترم مفتي محمد آصف مبارز صاحب</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🔢 ورژن:</p>
                    <p className="text-sm font-bold">لومړی (1.0.0)</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🎧 بڼه:</p>
                    <p className="text-sm font-bold">غږيز جوابونه</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">📚 برخې:</p>
                    <p className="text-sm font-bold">ټولې ۵۰ برخې</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">👨💻 جوړوونکی:</p>
                    <p className="text-sm font-bold">طالب العلم خبيب تکل</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🗂 ترتيب کوونکی:</p>
                    <p className="text-sm font-bold">الحاج داکتر فريدون احرار</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🤝 مرسته کوونکی:</p>
                    <p className="text-sm font-bold">عبدالستار سعيد صاحب</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🏢 اداره:</p>
                    <p className="text-sm font-bold">د اسلامي کاريالونو څانګه</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-500/5 border-orange-500/10'}`}>
                    <p className="text-[10px] text-orange-500 mb-1">🔐 امنیت:</p>
                    <p className="text-[10px] leading-relaxed">ددې اپلېکېشن ټولې مهمې برخې د AES رمزګذاري پواسطه رمز (کوډ) شوي.</p>
                  </div>
                </div>
              </div>
              <div className="p-8 pt-0">
                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-full py-4 bg-orange-600/10 text-orange-500 font-bold rounded-2xl hover:bg-orange-600/20 transition-all font-mono"
                >
                  بندول
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContact && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContact(false)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-[90%] max-w-sm rounded-[3rem] shadow-2xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1a1614] border-white/10' : 'bg-white border-black/10'}`}
            >
              <div className="p-8 pb-4 overflow-y-auto max-h-[70vh] no-scrollbar">
                <div className="flex flex-col items-center mb-6">
                   <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
                     <User2 className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="text-xl font-bold">جوړونکي سره اړیکه</h3>
                   <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Contact Developer</p>
                </div>

                <div className="space-y-3">
                  <a href="https://t.me/khubaib_takl" target="_blank" rel="noopener noreferrer" className={`flex items-center p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}>
                    <div className="w-10 h-10 bg-sky-500/20 text-sky-500 rounded-xl flex items-center justify-center ml-4">
                      <Send className="w-5 h-5" />
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-[10px] opacity-40">تلګرام ادرس</p>
                      <p className="text-sm font-bold">@khubaib_takl</p>
                    </div>
                  </a>

                  <a href="https://wa.me/93765443156" target="_blank" rel="noopener noreferrer" className={`flex items-center p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}>
                    <div className="w-10 h-10 bg-green-500/20 text-green-500 rounded-xl flex items-center justify-center ml-4">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-[10px] opacity-40">وتساپ ادرس</p>
                      <p className="text-sm font-bold">+93765443156</p>
                    </div>
                  </a>

                  <a href="https://www.facebook.com/khobaib.takal." target="_blank" rel="noopener noreferrer" className={`flex items-center p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}>
                    <div className="w-10 h-10 bg-blue-600/20 text-blue-600 rounded-xl flex items-center justify-center ml-4">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-[10px] opacity-40">فیسبوک ادرس</p>
                      <p className="text-sm font-bold">طالب العلم خبيب تکل</p>
                    </div>
                  </a>

                  <a href="tel:0777233699" className={`flex items-center p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}>
                    <div className="w-10 h-10 bg-orange-500/20 text-orange-500 rounded-xl flex items-center justify-center ml-4">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-[10px] opacity-40">تلفوني اړیکه</p>
                      <p className="text-sm font-bold">0777233699</p>
                    </div>
                  </a>

                  <a href="mailto:khobibtakl@gmail.com" className={`flex items-center p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}>
                    <div className="w-10 h-10 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center ml-4">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="text-right flex-1">
                      <p className="text-[10px] opacity-40">جمیل ادرس</p>
                      <p className="text-sm font-bold">khobibtakl@gmail.com</p>
                    </div>
                  </a>
                </div>
              </div>
              <div className="p-8 pt-0">
                <button 
                  onClick={() => setShowContact(false)}
                  className="w-full py-4 bg-blue-600/10 text-blue-500 font-bold rounded-2xl hover:bg-blue-600/20 transition-all font-mono"
                >
                  بندول
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="fixed inset-0 z-[100] bg-[#0a0502] flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 bg-orange-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-500/20 rotate-12">
                <Music4 className="w-12 h-12 text-white -rotate-12" />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-orange-500 rounded-[2rem] blur-2xl -z-10"
              />
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 text-3xl font-bold tracking-tight"
            >
              شرعي مسايلو حل
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.7 }}
              className="mt-2 text-sm font-mono uppercase tracking-[0.3em]"
            >
              مفتي محمد آصف مبارز
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-4 flex flex-col items-center"
            >
              <p className="text-[10px] uppercase tracking-widest font-bold">جوړونکی: طالب العلم خبیب تکل</p>
            </motion.div>
            
            <div className="absolute bottom-16 flex flex-col items-center gap-4">
              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="w-1/2 h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]"
                />
              </div>
              <p className="text-[10px] opacity-30 font-medium">ښه راغلاست...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          width: 16px;
          height: 16px;
          background: var(--accent-color);
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid ${isDarkMode ? '#0a0502' : '#fdf8f5'};
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--accent-color);
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid ${isDarkMode ? '#0a0502' : '#fdf8f5'};
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}

