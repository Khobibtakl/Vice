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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accentTheme, setAccentTheme] = useState('default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'default'>('default');
  const [showSplash, setShowSplash] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Clean sleep timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Sync playback speed when track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [currentTrack, speed]);

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const startSleepTimer = (minutes: number | null) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (minutes === null) {
      setSleepTimer(null);
      setTimeLeft(null);
      return;
    }

    setSleepTimer(minutes);
    const totalSeconds = minutes * 60;
    setTimeLeft(totalSeconds);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
          setSleepTimer(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Helper to resolve track source URL absolutely to avoid cross-browser source glitches
  const getTrackUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = window.location.origin;
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    return `${origin}${cleanUrl}`;
  };

  // Theme synchronization
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Determine the status bar background color based on light/dark mode theme
    const statusBarColor = isDarkMode ? '#030a08' : '#f4faf8';

    // 1. Dynamic Web Theme Color Meta updates
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', statusBarColor);

    // 2. Capacitor native status bar synchronization
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setBackgroundColor({ color: statusBarColor }).catch(() => {});

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
              const cleanedText = rawText
                .replace(/,\s*([\]}])/g, '$1')
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
              data = JSON.parse(cleanedText);
            }
          } else {
            // Try fetching from assets folder as fallback
            const assetResp = await fetch('src/assets/tracks.json');
            if (assetResp.ok) {
              data = await assetResp.json();
            } else {
              data = INITIAL_TRACKS;
            }
          }
        } catch (fetchErr) {
          console.warn("Failed to fetch tracks.json, falling back to initial tracks asset list:", fetchErr);
          data = INITIAL_TRACKS;
        }

        // Helper to format beautiful Pashto titles from filenames like '1.mp3' or '1'
        const formatTitleFromFilename = (filename: string) => {
          const cleanName = filename.replace(/\.[^/.]+$/, "");
          const num = parseInt(cleanName, 10);
          if (!isNaN(num)) {
            return `${num}- برخه خير الدين بربروسا`;
          }
          return cleanName;
        };

        // Initial mapping with robust support for array of strings or objects
        const mappedData = (Array.isArray(data) && data.length > 0 ? data : INITIAL_TRACKS).map((track: any, index: number) => {
          const isString = typeof track === 'string';
          const filename = isString ? track : (track?.filename || track?.url?.split('/').pop() || `${index + 1}.mp3`);
          const title = isString ? formatTitleFromFilename(filename) : (track?.title || formatTitleFromFilename(filename));
          const category = isString ? 'lessons' : (track?.category || 'lessons');

          return {
            id: isString ? `track-${index + 1}` : (track.id || `track-${index + 1}`),
            title: title,
            category: category,
            artist: isString ? 'الحاج داکتر فريدون احرار' : (track.artist || 'الحاج داکتر فريدون احرار'),
            url: isString ? `audio/${filename}` : (track.url || `audio/${filename}`),
            filename: filename,
            duration: isString ? '05:00' : (track.duration || '05:00'),
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
        let initialTrack = null;
        if (lastTrackId) {
          initialTrack = mappedData.find((t: AudioTrack) => t.id === lastTrackId);
        }
        if (!initialTrack && mappedData.length > 0) {
          initialTrack = mappedData[0];
        }
        if (initialTrack) {
          setCurrentTrack(initialTrack);
          if (audioRef.current) {
            audioRef.current.src = getTrackUrl(initialTrack.url);
            audioRef.current.load();
          }
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
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const targetUrl = getTrackUrl(currentTrack.url);
        // Ensure accurate source is bound
        if (audioRef.current.src !== targetUrl) {
          audioRef.current.src = targetUrl;
          audioRef.current.load();
        }
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(err => {
            console.info("Playback toggle play failed, retrying after load:", err);
            audioRef.current?.load();
            audioRef.current?.play().then(() => setIsPlaying(true)).catch(e => {
              console.warn("Retry play failed:", e);
              setIsPlaying(false);
            });
          });
      }
    }
  };

  // Handle Track Selection
  const handleTrackSelect = (track: AudioTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    
    setCurrentTrack(track);
    setProgress(0);
    localStorage.setItem('pashto_player_last_track', track.id);

    // Programmatically set source and play synchronously within user interaction flow
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        const targetUrl = getTrackUrl(track.url);
        audioRef.current.src = targetUrl;
        audioRef.current.load();
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(err => {
              console.info("Direct play failed, scheduling retry:", err);
              // Retry on short microtask to allow UI rendering state to finalize
              setTimeout(() => {
                audioRef.current?.play()
                  .then(() => setIsPlaying(true))
                  .catch(e => {
                    console.warn("Direct play retry completely failed:", e);
                    setIsPlaying(false);
                  });
              }, 50);
            });
        }
      } catch (err) {
        console.warn("Direct play exception caught:", err);
      }
    }
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
    <div className="min-h-screen transition-colors duration-500 overflow-hidden flex flex-col items-center w-full bg-[var(--bg-color)] text-[var(--text-color)]" dir="rtl">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dark cosmic base */}
        <div className={`absolute inset-0 transition-colors duration-1000 ${isDarkMode ? 'bg-[#060318]' : 'bg-[#f4f2fe]'}`} />
        
        {/* Floating Orb 1 */}
        <motion.div 
          animate={{ 
            scale: [1, 1.25, 1],
            x: [0, 20, 0],
            y: [0, -35, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[10%] -right-[10%] w-[380px] h-[380px] rounded-full blur-[100px] opacity-35"
          style={{ 
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(217,70,239,0.25) 0%, rgba(139,92,246,0.1) 70%, transparent 100%)'
              : 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(217,70,239,0.05) 70%, transparent 100%)' 
          }}
        />

        {/* Floating Orb 2 */}
        <motion.div 
          animate={{ 
            scale: [1.1, 0.9, 1.1],
            x: [0, -45, 0],
            y: [0, 25, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-[15%] -left-[10%] w-[420px] h-[420px] rounded-full blur-[110px] opacity-30"
          style={{ 
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.08) 70%, transparent 100%)'
              : 'radial-gradient(circle, rgba(217,70,239,0.1) 0%, rgba(139,92,246,0.05) 70%, transparent 100%)'
          }}
        />

        {/* Floating Orb 3 */}
        <motion.div 
          animate={{ 
            scale: [0.9, 1.15, 0.9],
            x: [0, 30, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-[35%] left-[-20%] w-[360px] h-[360px] rounded-full blur-[90px] opacity-25"
          style={{ 
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(217,70,239,0.05) 70%, transparent 100%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.05) 70%, transparent 100%)'
          }}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-lg h-[100dvh] flex flex-col px-4 pt-4 overflow-hidden safe-area-top">
        {/* Header */}
        <header className="flex flex-col gap-5 mb-6 mt-4 text-center items-center justify-center relative z-20">
          <div className="flex w-full items-center justify-between px-2">
            {/* Right button (Menu) */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowInfo(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all border shadow-[var(--shadow-nm)]"
              style={{ 
                backgroundColor: 'var(--panel-bg)', 
                borderColor: 'var(--panel-border)',
                boxShadow: 'var(--shadow-nm)'
              }}
            >
              <Info className="w-5 h-5 text-[var(--accent-color)]" />
            </motion.button>

            {/* Center Title */}
            <div className="flex flex-col items-center">
              <h1 className="text-2xl font-bold tracking-tight mb-0.5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
                خير الدين بربروسا
              </h1>
              <p className="text-[10px] uppercase tracking-[0.15em] font-semibold opacity-60">
                الحاج داکتر فريدون احرار
              </p>
            </div>

            {/* Left Options/Theme Toggle */}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowContact(true)}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all border"
                style={{ 
                  backgroundColor: 'var(--panel-bg)', 
                  borderColor: 'var(--panel-border)',
                  boxShadow: 'var(--shadow-nm)'
                }}
              >
                <MessageCircle className="w-5 h-5 text-[var(--text-color)] opacity-70" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all border"
                style={{ 
                  backgroundColor: 'var(--panel-bg)', 
                  borderColor: 'var(--panel-border)',
                  boxShadow: 'var(--shadow-nm)'
                }}
              >
                {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-950" />}
              </motion.button>
            </div>
          </div>

          {/* Quick Config Bar */}
          <div className="flex gap-2 p-1.5 rounded-full border backdrop-blur-md self-center text-xs"
               style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const sorts: ('default' | 'title' | 'artist')[] = ['default', 'title', 'artist'];
                const next = sorts[(sorts.indexOf(sortBy) + 1) % sorts.length];
                setSortBy(next);
              }}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${sortBy !== 'default' ? 'bg-fuchsia-500/20 text-fuchsia-400 font-bold' : 'opacity-60'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortBy === 'title' ? 'الفبا' : sortBy === 'artist' ? 'بیان کوونکی' : 'معیاري'}</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 opacity-60 hover:opacity-100"
            >
              {viewMode === 'list' ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
              <span>{viewMode === 'list' ? 'جدول' : 'لیست'}</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowThemePicker(true)}
              className="px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 opacity-60 hover:opacity-100"
            >
              <Palette className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>رنګ</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSleepModal(true)}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${sleepTimer !== null ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'opacity-60 hover:opacity-100'}`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>{timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : 'د شپې موډ'}</span>
            </motion.button>
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-6 z-20">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 opacity-40 text-[var(--text-color)]" />
          <input 
            type="text" 
            placeholder="لټون..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-[1.5rem] py-3.5 pr-11 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition-all shadow-inner"
            style={{
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
              color: 'var(--text-color)'
            }}
          />
        </div>

        {/* Categories */}
        <div className="flex gap-3.5 mb-8 overflow-x-auto pb-2 scrollbar-none no-scrollbar z-20">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                activeCategory === cat.id 
                  ? 'text-white shadow-[0_4px_20px_rgba(217,70,239,0.35)]' 
                  : 'opacity-75'
              }`}
              style={{
                background: activeCategory === cat.id 
                  ? 'linear-gradient(135deg, #d946ef 0%, #8b5cf6 100%)' 
                  : 'var(--panel-bg)',
                borderColor: activeCategory === cat.id 
                  ? 'transparent' 
                  : 'var(--panel-border)',
                boxShadow: activeCategory === cat.id 
                  ? '0 6px 20px rgba(217,70,239,0.35)' 
                  : 'var(--shadow-nm)'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List Body with safe pb-32 so elements scroll fully past sticky Mini Player on mobile */}
        <div className={`flex-1 overflow-y-auto no-scrollbar pr-1 pb-32 z-20 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-4 space-y-0' : 'space-y-4'}`}>
          {loading ? (
             <div className="flex justify-center py-10 col-span-full">
               <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                 <Music4 className="w-6 h-6 opacity-30" style={{ color: 'var(--accent-color)' }} />
               </motion.div>
             </div>
          ) : filteredTracks.map((track, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              key={track.id}
              onClick={() => handleTrackSelect(track)}
              className={`group relative transition-all duration-300 cursor-pointer border overflow-hidden ${
                viewMode === 'grid' 
                ? 'flex flex-col rounded-[2.5rem] p-5 h-52 justify-between backdrop-blur-md' 
                : 'flex items-center p-4 rounded-[2rem] backdrop-blur-md'
              }`}
              style={{
                backgroundColor: currentTrack?.id === track.id ? 'rgba(217,70,239,0.08)' : 'var(--panel-bg)',
                borderColor: currentTrack?.id === track.id ? 'rgba(217,70,239,0.35)' : 'var(--panel-border)',
                boxShadow: currentTrack?.id === track.id ? '0 8px 32px rgba(217,70,239,0.15)' : 'var(--shadow-nm)'
              }}
            >
              {viewMode === 'grid' ? (
                // Super Premium Grid Mode Layout
                <div className="flex flex-col justify-between h-full w-full">
                  {/* Top bar with heart and a styled badge */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] px-2.5 py-1 bg-fuchsia-500/10 rounded-full font-bold uppercase tracking-tight text-fuchsia-400 font-sans">
                      برخه {track.filename?.replace(/\.[^/.]+$/, "")}
                    </span>
                    <button 
                      onClick={(e) => toggleFavorite(track.id, e)}
                      className={`p-1.5 rounded-full transition-all ${favorites.includes(track.id) ? 'text-fuchsia-400 scale-110' : 'opacity-40 hover:opacity-100'}`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(track.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Center Visualization / Play animation */}
                  <div className="flex justify-center items-center my-2 flex-1">
                    {currentTrack?.id === track.id && isPlaying ? (
                       <div className="flex gap-1 items-end h-8">
                         <motion.div animate={{ height: [6, 24, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-fuchsia-500 rounded-full" />
                         <motion.div animate={{ height: [12, 6, 20] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-fuchsia-500 rounded-full" />
                         <motion.div animate={{ height: [18, 10, 12] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-1 bg-fuchsia-500 rounded-full" />
                       </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/5 bg-white/5 shadow-[var(--shadow-nm-inset)]">
                        <Music4 className="w-5 h-5 text-fuchsia-400 opacity-60" />
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="text-right w-full mt-1">
                    <h3 className={`text-xs font-bold truncate ${currentTrack?.id === track.id ? 'text-fuchsia-400' : ''}`}>
                      {track.title || track.filename}
                    </h3>
                    <div className="flex items-center justify-between mt-1 text-[10px] opacity-40">
                      <span className="truncate max-w-[70px]">{track.artist}</span>
                      <span className="font-mono text-[9px] opacity-60">{track.duration || '00:00'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Super Premium List Mode Layout
                <>
                  <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center ml-3.5 flex-shrink-0 border"
                       style={{
                         backgroundColor: currentTrack?.id === track.id ? 'rgba(217,70,239,0.15)' : 'rgba(255, 255, 255, 0.03)',
                         borderColor: currentTrack?.id === track.id ? 'rgba(217,70,239,0.3)' : 'rgba(255, 255, 255, 0.05)',
                       }}>
                    {currentTrack?.id === track.id && isPlaying ? (
                      <div className="flex gap-0.5 items-end h-4">
                        <motion.div animate={{ height: [4, 14, 6] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.75 bg-fuchsia-500 rounded-full" />
                        <motion.div animate={{ height: [8, 4, 12] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-0.75 bg-fuchsia-500 rounded-full" />
                        <motion.div animate={{ height: [12, 6, 8] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.75 bg-fuchsia-500 rounded-full" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center font-sans">
                        <Music4 className="w-4.5 h-4.5 text-fuchsia-400 opacity-55" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 text-right">
                    <h3 className={`text-sm font-bold truncate ${currentTrack?.id === track.id ? 'text-fuchsia-400' : ''}`}>
                      {track.title || track.filename}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 opacity-40">
                      <p className="text-[10px] truncate">{track.artist}</p>
                      <span className="text-[9px] opacity-35">•</span>
                      <p className="text-[10px] font-mono font-bold">برخه {track.filename?.replace(/\.[^/.]+$/, "")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-[10px] font-mono font-semibold opacity-40">{track.duration}</span>
                    <button 
                      onClick={(e) => toggleFavorite(track.id, e)}
                      className={`p-1.5 rounded-full transition-all ${favorites.includes(track.id) ? 'text-fuchsia-400 scale-105' : 'opacity-25 hover:opacity-100'}`}
                    >
                      <Heart className={`w-4 h-4 ${favorites.includes(track.id) ? 'fill-current' : ''}`} />
                    </button>
                    
                    {/* Pink/Fuchsia gradient Play button on the edge exactly like the middle pane in the mockup */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                         style={{
                           background: currentTrack?.id === track.id && isPlaying
                             ? 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)'
                             : 'var(--panel-bg)',
                           boxShadow: currentTrack?.id === track.id && isPlaying
                             ? '0 4px 12px rgba(217,70,239,0.35)'
                             : 'var(--shadow-nm-inset)',
                           border: currentTrack?.id === track.id && isPlaying
                             ? 'none'
                             : '1px solid var(--panel-border)'
                         }}>
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="w-4 h-4 text-white fill-current" />
                      ) : (
                        <Play className="w-4 h-4 text-fuchsia-400 fill-current ml-0.5" />
                      )}
                    </div>
                  </div>
                </>
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
              className="backdrop-blur-xl border rounded-[2rem] p-3.5 flex items-center transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--panel-border)',
                color: 'var(--text-color)'
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center ml-3.5 flex-shrink-0 border border-fuchsia-500/20">
                <Music4 className="w-5 h-5 text-fuchsia-400 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <h4 className="text-sm font-bold truncate">{currentTrack.title}</h4>
                <p className="text-[10px] uppercase tracking-wider opacity-40">برخه {currentTrack.filename?.replace(/\.[^/.]+$/, "")}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10"
                >
                  {isPlaying ? <Pause className="w-4.5 h-4.5 text-fuchsia-400 fill-current" /> : <Play className="w-4.5 h-4.5 text-fuchsia-400 fill-current ml-0.5" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="w-10 h-10 flex items-center justify-center opacity-60 hover:opacity-100"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute top-0 left-0 h-1 w-full rounded-t-3xl overflow-hidden bg-white/5">
                <div className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }} />
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
            className="fixed inset-0 z-50 flex flex-col px-8 pt-8 pb-16 transition-colors duration-500 safe-area-top safe-area-bottom bg-[var(--bg-color)] text-[var(--text-color)] overflow-y-auto no-scrollbar"
          >
            {/* Background floating gradient aura in full player */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
              <motion.div 
                animate={{ scale: [1, 1.25, 1], rotate: [0, 10, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-1/4 -right-1/4 w-[150%] aspect-square blur-3xl opacity-55" 
                style={{ backgroundImage: `radial-gradient(circle at center, rgba(217,70,239,0.3) 0%, rgba(139,92,246,0.1) 60%, transparent 100%)` }}
              />
            </div>

            <header className="relative z-10 flex items-center justify-between mb-8 mt-4">
              <button 
                onClick={() => setShowFullPlayer(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full transition-all border shadow-[var(--shadow-nm)]"
                style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-40">اوس غږیږي</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowSleepModal(true)}
                  className="w-11 h-11 flex items-center justify-center rounded-full transition-all border relative"
                  style={{ 
                    backgroundColor: sleepTimer !== null ? 'rgba(99,102,241,0.2)' : 'var(--panel-bg)', 
                    borderColor: sleepTimer !== null ? 'rgba(99,102,241,0.5)' : 'var(--panel-border)',
                    color: sleepTimer !== null ? '#818cf8' : 'inherit'
                  }}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  {sleepTimer !== null && (
                    <span className="absolute -bottom-1 -right-1 text-[8px] font-mono font-black bg-indigo-600 text-white px-1 rounded-full">
                      {Math.ceil((timeLeft || 0) / 60)}m
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => toggleFavorite(currentTrack.id)}
                  className="w-11 h-11 flex items-center justify-center rounded-full transition-all border"
                  style={{ 
                    backgroundColor: favorites.includes(currentTrack.id) ? 'rgba(217,70,239,0.15)' : 'var(--panel-bg)', 
                    borderColor: favorites.includes(currentTrack.id) ? 'rgba(217,70,239,0.4)' : 'var(--panel-border)',
                    color: favorites.includes(currentTrack.id) ? '#d946ef' : 'inherit'
                  }}
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(currentTrack.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            </header>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center mt-4">
              {/* Massive Neumorphic Concentric Cover Disk */}
              <motion.div 
                layoutId="player-art"
                className="w-64 h-64 rounded-full flex items-center justify-center mb-10 relative border backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                style={{
                  backgroundColor: 'var(--panel-bg)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                {/* Pulsating outer light ring */}
                <AnimatePresence>
                  {isPlaying && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.35, 0.15] }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundImage: `radial-gradient(circle, rgba(217,70,239,0.2) 20%, transparent 80%)` }}
                    />
                  )}
                </AnimatePresence>

                {/* Concentric Circle 2 */}
                <div className="absolute w-52 h-52 rounded-full border border-white/5 flex items-center justify-center bg-black/10 shadow-inner">
                  {/* Concentric Circle 3 / Vinyl Record Disc with rotating animation */}
                  <motion.div 
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                    className="w-40 h-40 rounded-full flex items-center justify-center relative shadow-lg"
                    style={{
                      background: 'radial-gradient(circle, #221c38 0%, #0d091a 100%)',
                      border: '4px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div className="absolute inset-3 rounded-full border border-white/5 border-dashed opacity-45" />
                    <div className="absolute inset-6 rounded-full border border-white/5 opacity-35" />
                    <div className="absolute inset-9 rounded-full border border-white/5 opacity-25" />
                    
                    {/* Glowing pink center core */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                      <Music4 className="w-6 h-6 text-white animate-pulse" />
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <div className="text-center mb-8 w-full px-4">
                <h2 className="text-2xl font-black mb-1 leading-tight tracking-tight">{currentTrack.title}</h2>
                <p className="text-fuchsia-400 font-extrabold tracking-wide text-lg">{currentTrack.artist}</p>
                <p className="text-[10px] mt-4 inline-block px-4 py-1.5 rounded-full font-bold uppercase tracking-wide border"
                   style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                  {currentTrack.categoryLabel}
                </p>
              </div>

              {/* Custom Seekbar Slider */}
              <div className="w-full mb-8 px-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-fuchsia-500"
                  style={{
                    background: `linear-gradient(to left, #d946ef ${progress}%, rgba(255,255,255,0.1) ${progress}%)`
                  }}
                />
                <div className="flex justify-between mt-3 text-xs font-mono font-bold opacity-45">
                  <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                  <span>{formatTime(audioRef.current?.duration || 0)}</span>
                </div>
              </div>

              {/* Tactile Premium Control Console */}
              <div className="w-full flex items-center justify-between px-2">
                <div className="w-10" /> {/* Spacer to align */}
                
                <div className="flex items-center gap-6">
                  {/* Previous Button - Tactile tile */}
                  <button 
                    onClick={handlePrev}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-[var(--shadow-nm)] hover:scale-105 active:scale-95"
                    style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
                  >
                    <SkipBack className="w-5 h-5 fill-current text-[var(--text-color)] opacity-85" />
                  </button>

                  {/* Gigantic Glow Play/Pause Button */}
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white relative group transition-all duration-300"
                    style={{ 
                      background: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #8b5cf6 100%)',
                      boxShadow: '0 10px 30px rgba(217,70,239,0.45)'
                    }}
                  >
                    {isPlaying ? <Pause className="w-7 h-7 relative" /> : <Play className="w-7 h-7 fill-current ml-1 relative" />}
                  </motion.button>

                  {/* Next Button - Tactile tile */}
                  <button 
                    onClick={handleNext}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-[var(--shadow-nm)] hover:scale-105 active:scale-95"
                    style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
                  >
                    <SkipForward className="w-5 h-5 fill-current text-[var(--text-color)] opacity-85" />
                  </button>
                </div>

                <div className="w-10" /> {/* Spacer to align */}
              </div>
            </div>

            <footer className="relative z-10 flex justify-center mt-12 gap-8 opacity-40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-mono font-bold tracking-tight">غږیږي</span>
              </div>
              <div className="flex items-center gap-2">
                <ListIcon className="w-4 h-4" />
                <span className="text-[10px] font-mono font-bold tracking-tight">مرتب شوی</span>
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

      {/* Night Mode & Sleep Timer Modal */}
      <AnimatePresence>
        {showSleepModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSleepModal(false)}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-[90%] max-w-sm rounded-[3rem] shadow-2xl border overflow-hidden flex flex-col p-7 backdrop-blur-2xl"
              style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-color)' }}
            >
              <div className="flex flex-col items-center mb-5">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-2">
                  <Moon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-black">د شپې موډ او د خوب ټایمر</h3>
                <p className="text-[10px] opacity-40 uppercase tracking-widest mt-0.5">Night Mode & Sleep Timer</p>
              </div>

              {/* Night Theme Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border mb-5" style={{ borderColor: 'var(--panel-border)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
                  <div className="text-right">
                    <p className="text-xs font-bold">د شپې تیاره بڼه (Dark Mode)</p>
                    <p className="text-[10px] opacity-40">{isDarkMode ? 'د شپې حالت فعال دی' : 'ورځنی حالت فعال دی'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-400'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${isDarkMode ? '-translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Sleep Timer Options */}
              <div className="space-y-2 mb-5">
                <p className="text-xs font-bold opacity-60 mb-2 text-right">د اتومات بندېدو خوب ټایمر:</p>
                {[
                  { min: 15, label: '۱۵ دقیقې' },
                  { min: 30, label: '۳۰ دقیقې' },
                  { min: 45, label: '۴۵ دقیقې' },
                  { min: 60, label: '۶۰ دقیقې (۱ ساعت)' },
                ].map((option) => (
                  <button
                    key={option.min}
                    onClick={() => startSleepTimer(option.min)}
                    className={`w-full p-3 rounded-2xl border text-right text-xs font-bold transition-all flex items-center justify-between ${sleepTimer === option.min ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                    style={{ borderColor: sleepTimer === option.min ? '#6366f1' : 'var(--panel-border)' }}
                  >
                    <span>{option.label}</span>
                    {sleepTimer === option.min && <Clock className="w-4 h-4 text-indigo-400" />}
                  </button>
                ))}

                {sleepTimer !== null && (
                  <button
                    onClick={() => startSleepTimer(null)}
                    className="w-full p-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-center text-xs font-bold transition-all mt-2"
                  >
                    ټایمر بندول (Cancel Timer)
                  </button>
                )}
              </div>

              {timeLeft !== null && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-2.5 text-center mb-5">
                  <p className="text-[10px] text-indigo-300 font-bold mb-0.5">پاتې وخت:</p>
                  <p className="text-base font-mono font-black text-indigo-400">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              )}

              <button 
                onClick={() => setShowSleepModal(false)}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all text-xs shadow-lg shadow-indigo-600/30"
              >
                بشپړ شو
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
                    <p className="text-[10px] opacity-40 mb-1">📱 د کاريال نوم:</p>
                    <p className="text-sm font-bold">خير الدين بربروسا</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🔢 د کاريال ورژن:</p>
                    <p className="text-sm font-bold">لومړی (1.0)</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🎧 د کاريال بڼه:</p>
                    <p className="text-sm font-bold">غږيز جوابونه</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">📚 برخې:</p>
                    <p className="text-sm font-bold">ټولې ۵ برخې</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">👨💻 کاريال جوړوونکی:</p>
                    <p className="text-sm font-bold">طالب العلم خبيب تکل</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🗂 ترتيب کوونکی:</p>
                    <p className="text-sm font-bold">الحاج داکتر فريدون احرار.</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <p className="text-[10px] opacity-40 mb-1">🏢 نشروونکې اداره:</p>
                    <p className="text-sm font-bold">د اسلامي کاريالونو څانګه</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-500/5 border-indigo-500/10'}`}>
                    <p className="text-[10px] text-indigo-400 mb-1 font-bold">🔐 دحفاظت په اړه:</p>
                    <p className="text-[11px] leading-relaxed font-semibold">ددې اپلېکېشن ټولې مهمې برخې د AES رمزګذاري پواسطه رمز (کوډ) شوي.</p>
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
            className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col items-center justify-center text-[var(--text-color)]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 bg-[var(--accent-color)] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[var(--accent-soft)] rotate-12" style={{ boxShadow: '0 20px 40px var(--accent-soft)' }}>
                <Music4 className="w-12 h-12 text-white -rotate-12" />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-[var(--accent-color)] rounded-[2rem] blur-2xl -z-10"
              />
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 text-3xl font-bold tracking-tight text-center"
            >
              خير الدين بربروسا
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.7 }}
              className="mt-2 text-sm uppercase tracking-[0.2em] font-semibold"
            >
              غږيز جوابونه - ټولې ۵ برخې
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
          border: 3px solid var(--bg-color);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--accent-color);
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid var(--bg-color);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}

