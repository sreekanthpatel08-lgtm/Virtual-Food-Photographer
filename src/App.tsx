/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Settings2, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Maximize2,
  Download,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Dish, PhotoStyle, ImageSize, GenerationSettings } from './types';
import { parseMenu, generateDishImage, checkApiKey, requestApiKey } from './services/geminiService';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const STYLES: { id: PhotoStyle; label: string; description: string; icon: any }[] = [
  { 
    id: 'rustic', 
    label: 'Rustic & Dark', 
    description: 'Moody, high-contrast, artisanal feel',
    icon: Camera 
  },
  { 
    id: 'modern', 
    label: 'Bright & Modern', 
    description: 'Clean, minimalist, commercial look',
    icon: Sparkles 
  },
  { 
    id: 'social', 
    label: 'Social Media', 
    description: 'Overhead flat lay, trendy lifestyle',
    icon: ImageIcon 
  }
];

const SIZES: ImageSize[] = ['1K', '2K', '4K'];

export default function App() {
  const [menuText, setMenuText] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    style: 'modern',
    size: '1K'
  });
  const [isParsing, setIsParsing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyKey = async () => {
      const hasKey = await checkApiKey();
      setHasApiKey(hasKey);
      setIsCheckingKey(false);
    };
    verifyKey();
  }, []);

  const handleRequestKey = async () => {
    await requestApiKey();
    setHasApiKey(true); // Assume success as per instructions
  };

  const handleParseMenu = async () => {
    if (!menuText.trim()) return;
    
    setIsParsing(true);
    setError(null);
    try {
      const parsedDishes = await parseMenu(menuText);
      setDishes(parsedDishes);
    } catch (err) {
      console.error(err);
      setError('Failed to parse menu. Please check your text and try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateImage = async (dishId: string) => {
    const dish = dishes.find(d => d.id === dishId);
    if (!dish) return;

    setDishes(prev => prev.map(d => 
      d.id === dishId ? { ...d, isGenerating: true, error: undefined } : d
    ));

    try {
      const imageUrl = await generateDishImage(dish, settings.style, settings.size);
      setDishes(prev => prev.map(d => 
        d.id === dishId ? { ...d, imageUrl, isGenerating: false } : d
      ));
    } catch (err: any) {
      console.error('Image generation error:', err);
      let errorMessage = 'Failed to generate image.';
      
      if (err.message?.includes('Requested entity was not found')) {
        errorMessage = 'API Key error. Please re-select your key.';
        setHasApiKey(false);
      } else if (err.message) {
        errorMessage = `Generation Error: ${err.message}`;
      }

      setDishes(prev => prev.map(d => 
        d.id === dishId ? { ...d, isGenerating: false, error: errorMessage } : d
      ));
    }
  };

  const handleGenerateAll = async () => {
    dishes.forEach(dish => {
      if (!dish.imageUrl && !dish.isGenerating) {
        handleGenerateImage(dish.id);
      }
    });
  };

  const removeDish = (id: string) => {
    setDishes(prev => prev.filter(d => d.id !== id));
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-white selection:text-black">
      {/* API Key Banner */}
      {!hasApiKey && !isCheckingKey && (
        <div className="bg-white text-black py-3 px-6 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              A paid Gemini API Key is required for high-end image generation.
            </span>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs underline flex items-center gap-1 opacity-70 hover:opacity-100"
            >
              Billing Docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button 
            onClick={handleRequestKey}
            className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors"
          >
            Select API Key
          </button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] min-h-screen">
        {/* Left Sidebar: Controls */}
        <aside className="border-r border-zinc-800 p-8 flex flex-col gap-8 bg-[#0f0f0f]">
          <header className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Camera className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Food Studio</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Virtual Photographer</p>
            </div>
          </header>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Menu Input</label>
              <button 
                onClick={() => setMenuText('')}
                className="text-[10px] uppercase font-bold text-zinc-600 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <textarea 
              value={menuText}
              onChange={(e) => setMenuText(e.target.value)}
              placeholder="Paste your menu here... e.g. 'Truffle Mushroom Risotto - Creamy arborio rice with seasonal wild mushrooms and white truffle oil'"
              className="w-full h-48 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none placeholder:text-zinc-700"
            />
            <button 
              onClick={handleParseMenu}
              disabled={isParsing || !menuText.trim()}
              className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isParsing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Parse Menu</span>
                </>
              )}
            </button>
          </section>

          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-zinc-400">
              <Settings2 className="w-4 h-4" />
              <label className="text-xs font-bold uppercase tracking-widest">Studio Settings</label>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Photography Style</p>
              <div className="grid grid-cols-1 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSettings(s => ({ ...s, style: style.id }))}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group",
                      settings.style === style.id 
                        ? "bg-white border-white text-black" 
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <style.icon className={cn("w-5 h-5 mt-0.5", settings.style === style.id ? "text-black" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <div>
                      <p className="text-sm font-bold">{style.label}</p>
                      <p className={cn("text-[10px] mt-0.5 opacity-60", settings.style === style.id ? "text-black" : "text-zinc-500")}>
                        {style.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Output Resolution</p>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSettings(s => ({ ...s, size }))}
                    className={cn(
                      "py-3 rounded-xl border text-xs font-bold transition-all",
                      settings.size === size 
                        ? "bg-white border-white text-black" 
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {dishes.length > 0 && (
            <button 
              onClick={handleGenerateAll}
              className="mt-auto w-full bg-zinc-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-zinc-700"
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Generate All Photos</span>
            </button>
          )}
        </aside>

        {/* Right Content: Gallery */}
        <main className="p-8 lg:p-12 overflow-y-auto max-h-screen">
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {dishes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 border border-zinc-800">
                <ImageIcon className="w-10 h-10 text-zinc-700" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Your Studio is Empty</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Upload your menu text on the left to start generating high-end food photography for your restaurant.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Menu Gallery</h2>
                  <p className="text-zinc-500 text-sm mt-1">{dishes.length} items discovered in menu</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {STYLES.map(s => (
                      <div 
                        key={s.id}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center",
                          settings.style === s.id ? "bg-white text-black z-10" : "bg-zinc-900 text-zinc-600"
                        )}
                      >
                        <s.icon className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {dishes.map((dish) => (
                    <motion.div
                      key={dish.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative bg-zinc-900/30 rounded-[32px] border border-zinc-800/50 overflow-hidden flex flex-col"
                    >
                      {/* Image Container */}
                      <div className="aspect-square relative overflow-hidden bg-zinc-900">
                        {dish.imageUrl ? (
                          <>
                            <img 
                              src={dish.imageUrl} 
                              alt={dish.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button 
                                onClick={() => downloadImage(dish.imageUrl!, dish.name)}
                                className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                title="Download"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={() => handleGenerateImage(dish.id)}
                                className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                                title="Regenerate"
                              >
                                <Sparkles className="w-5 h-5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                            {dish.isGenerating ? (
                              <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                  </div>
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 animate-pulse">
                                  Developing Photo...
                                </p>
                              </div>
                            ) : dish.error ? (
                              <div className="flex flex-col items-center gap-4 text-red-400">
                                <AlertCircle className="w-10 h-10" />
                                <p className="text-xs font-medium max-w-[200px]">{dish.error}</p>
                                <button 
                                  onClick={() => handleGenerateImage(dish.id)}
                                  className="text-[10px] uppercase font-bold tracking-widest underline underline-offset-4 hover:text-white"
                                >
                                  Try Again
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleGenerateImage(dish.id)}
                                className="flex flex-col items-center gap-4 group/btn"
                              >
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover/btn:bg-white group-hover/btn:text-black transition-all">
                                  <Camera className="w-8 h-8" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover/btn:text-white transition-colors">
                                  Take Photo
                                </p>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-bold text-lg leading-tight">{dish.name}</h3>
                          <button 
                            onClick={() => removeDish(dish.id)}
                            className="text-zinc-700 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 mb-4">
                          {dish.description}
                        </p>
                        
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {dish.imageUrl ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                                Pending
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-700">
                            {settings.size} • {settings.style.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
