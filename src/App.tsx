import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Upload, 
  Volume2, 
  Zap, 
  Disc, 
  Mic, 
  Download, 
  RotateCcw,
  Activity,
  Music,
  Music2,
  FastForward,
  Rewind,
  Waves,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface DeckState {
  isPlaying: boolean;
  fileName: string;
  playbackRate: number;
  gain: number;
  cues: number[];
  duration: number;
  currentTime: number;
  eq: {
    low: number;
    mid: number;
    high: number;
  };
  subBass: number;
  filter: number;
  echo: number;
  reverb: number;
  flanger: number;
  loop: {
    active: boolean;
    start: number;
    end: number;
    length: number;
  };
}

const INITIAL_DECK_STATE: DeckState = {
  isPlaying: false,
  fileName: 'NO TRACK LOADED',
  playbackRate: 1.0,
  gain: 1.0,
  cues: [0, 0, 0, 0],
  duration: 0,
  currentTime: 0,
  eq: { low: 0, mid: 0, high: 0 },
  subBass: 0,
  filter: 20000,
  echo: 0,
  reverb: 0,
  flanger: 0,
  loop: { active: false, start: 0, end: 0, length: 4 }
};

// --- Components ---

const Visualizer = ({ analyser, color, type = 'bars' }: { analyser: AnalyserNode | null, color: string, type?: 'bars' | 'wave' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const render = () => {
      animationId = requestAnimationFrame(render);
      
      if (type === 'wave') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.5, color + 'aa');
          gradient.addColorStop(1, '#ffffff33');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, color, type]);

  return <canvas ref={canvasRef} className="w-full h-24 bg-black/80 rounded-lg border border-white/5" width={400} height={100} />;
};

const VuMeter = ({ analyser }: { analyser: AnalyserNode | null }) => {
  const [level, setLevel] = useState(0);
  
  useEffect(() => {
    if (!analyser) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength;
      setLevel(avg / 128); // 0 to 1ish
      animationId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div className="flex flex-col gap-1 w-2 h-full bg-black/40 rounded-full p-0.5 overflow-hidden border border-white/5">
      <motion.div 
        animate={{ height: `${Math.min(level * 100, 100)}%` }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`w-full mt-auto rounded-full ${level > 0.8 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : level > 0.6 ? 'bg-yellow-500' : 'bg-green-500'}`}
      />
    </div>
  );
};

const DjLights = ({ analyserA, analyserB, active, mode }: { analyserA: AnalyserNode | null, analyserB: AnalyserNode | null, active: boolean, mode: 'strobe' | 'ambient' | 'pulse' }) => {
  const [intensity, setIntensity] = useState(0);

  useEffect(() => {
    if (!active || (!analyserA && !analyserB)) {
      setIntensity(0);
      return;
    }

    let animationId: number;
    const dataA = new Uint8Array(analyserA?.frequencyBinCount || 0);
    const dataB = new Uint8Array(analyserB?.frequencyBinCount || 0);

    const update = () => {
      let levelA = 0;
      let levelB = 0;

      if (analyserA) {
        analyserA.getByteFrequencyData(dataA);
        levelA = dataA.reduce((a, b) => a + b, 0) / dataA.length / 255;
      }
      if (analyserB) {
        analyserB.getByteFrequencyData(dataB);
        levelB = dataB.reduce((a, b) => a + b, 0) / dataB.length / 255;
      }

      setIntensity(Math.max(levelA, levelB));
      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, [analyserA, analyserB, active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Dynamic Glows */}
      <motion.div 
        animate={{ 
          opacity: mode === 'strobe' ? (intensity > 0.4 ? 0.3 : 0) : intensity * 0.4,
          scale: mode === 'pulse' ? 1 + intensity * 0.5 : 1
        }}
        className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#00f2ff]/20 blur-[150px] rounded-full"
      />
      <motion.div 
        animate={{ 
          opacity: mode === 'strobe' ? (intensity > 0.5 ? 0.2 : 0) : intensity * 0.3,
          scale: mode === 'pulse' ? 1 + intensity * 0.3 : 1
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/10 blur-[150px] rounded-full"
      />
      
      {/* Bass Impact Strobe */}
      <AnimatePresence>
        {mode === 'strobe' && intensity > 0.6 && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-white"
           />
        )}
      </AnimatePresence>

      {/* Ambient Color Sweep */}
      {mode === 'ambient' && (
        <motion.div 
          animate={{ 
            rotate: 360 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 bg-gradient-to-r from-[#00f2ff] via-purple-500 to-red-500 blur-[200px]"
        />
      )}
    </div>
  );
};

const JogWheel = ({ isPlaying, color, onScratch, deck, playerRef }: { isPlaying: boolean, color: string, onScratch?: (delta: number) => void, deck: 'A' | 'B', playerRef: React.RefObject<HTMLAudioElement | null> }) => {
  const [isScratching, setIsScratching] = useState(false);
  const rotationRef = useRef(0);
  const lastAngle = useRef(0);

  const handlePan = (event: any, info: any) => {
    if (!playerRef.current) return;
    
    // Calculate angle from center of jog wheel
    const rect = event.target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(info.point.y - centerY, info.point.x - centerX) * (180 / Math.PI);
    
    if (isScratching) {
      const delta = angle - lastAngle.current;
      // Normalize delta
      const normalizedDelta = delta > 180 ? delta - 360 : delta < -180 ? delta + 360 : delta;
      
      // Seek audio
      const seekAmount = normalizedDelta * 0.01;
      playerRef.current.currentTime += seekAmount;
      rotationRef.current += normalizedDelta;
    }
    
    lastAngle.current = angle;
  };

  return (
    <div className="relative group touch-none">
      <motion.div 
        onPanStart={(e, info) => {
          setIsScratching(true);
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          lastAngle.current = Math.atan2(info.point.y - centerY, info.point.x - centerX) * (180 / Math.PI);
        }}
        onPan={handlePan}
        onPanEnd={() => setIsScratching(false)}
        animate={isPlaying && !isScratching ? { 
          rotate: rotationRef.current + 360,
        } : { rotate: rotationRef.current }}
        onUpdate={(latest) => {
          if (typeof latest.rotate === 'number') {
            rotationRef.current = latest.rotate;
          }
        }}
        transition={isPlaying && !isScratching ? { 
          rotate: { duration: 2, repeat: Infinity, ease: "linear" },
        } : { rotate: { duration: 0 } }}
        style={{
          boxShadow: isPlaying ? `0 0 20px ${color}22` : 'none'
        }}
        className="w-40 h-40 rounded-full jog-wheel border-4 border-white/10 flex items-center justify-center relative cursor-grab active:cursor-grabbing shadow-2xl overflow-hidden"
      >
        <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
        <div className="w-32 h-32 rounded-full border-4 border-white/5 bg-black/40 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          <Disc size={60} className="text-white/10 animate-pulse" />
        </div>
        <div className="absolute top-2 w-1.5 h-6 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ backgroundColor: color }} />
        
        {/* Vinyl Grooves Effect */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full border border-white/5 pointer-events-none"
            style={{ inset: `${(i + 1) * 12}px` }}
          />
        ))}
      </motion.div>
    </div>
  );
};

const WalkerLogo = () => (
  <div className="relative w-12 h-12 flex items-center justify-center">
    <div className="absolute inset-0 border-2 border-neon/50 rotate-45" />
    <span className="font-bold text-2xl text-neon z-10 font-mono tracking-tight">W</span>
  </div>
);

export default function App() {
  // Audio Engine Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Deck Refs
  const playerARef = useRef<HTMLAudioElement | null>(null);
  const playerBRef = useRef<HTMLAudioElement | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const analyserARef = useRef<AnalyserNode | null>(null);
  const analyserBRef = useRef<AnalyserNode | null>(null);
  const masterAnalyserRef = useRef<AnalyserNode | null>(null);

  const filtersARef = useRef<{ sub: BiquadFilterNode; low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode; lpf: BiquadFilterNode } | null>(null);
  const filtersBRef = useRef<{ sub: BiquadFilterNode; low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode; lpf: BiquadFilterNode } | null>(null);
  const echoNodesARef = useRef<{ input: GainNode; delay: DelayNode; feedback: GainNode; output: GainNode } | null>(null);
  const echoNodesBRef = useRef<{ input: GainNode; delay: DelayNode; feedback: GainNode; output: GainNode } | null>(null);
  const reverbNodesARef = useRef<{ input: GainNode; convolver: ConvolverNode; output: GainNode } | null>(null);
  const reverbNodesBRef = useRef<{ input: GainNode; convolver: ConvolverNode; output: GainNode } | null>(null);
  const flangerNodesARef = useRef<{ input: GainNode; delay: DelayNode; osc: OscillatorNode; feedback: GainNode; output: GainNode } | null>(null);
  const flangerNodesBRef = useRef<{ input: GainNode; delay: DelayNode; osc: OscillatorNode; feedback: GainNode; output: GainNode } | null>(null);

  // Helper to create impulse response for reverb
  const createImpulseResponse = (ctx: AudioContext, duration: number, decay: number) => {
    const length = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  };

  // UI State
  const [deckA, setDeckA] = useState<DeckState>(INITIAL_DECK_STATE);
  const [deckB, setDeckB] = useState<DeckState>(INITIAL_DECK_STATE);
  const [crossfade, setCrossfade] = useState(0); // -1 to 1
  const [isRecording, setIsRecording] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [isJedagJedug, setIsJedagJedug] = useState(false);
  const [isPump, setIsPump] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Jedag Jedug Logic
  useEffect(() => {
    let interval: any;
    if (isJedagJedug) {
      interval = setInterval(() => {
        playSample('kick');
        setIsPump(true);
        setTimeout(() => setIsPump(false), 100);
      }, 500); // 120 BPM roughly
    }
    return () => clearInterval(interval);
  }, [isJedagJedug]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [lightsActive, setLightsActive] = useState(true);
  const [lightMode, setLightMode] = useState<'strobe' | 'ambient' | 'pulse'>('pulse');

  // Initialize Audio Logic
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;

    masterGainRef.current = ctx.createGain();
    masterGainRef.current.connect(ctx.destination);

    masterAnalyserRef.current = ctx.createAnalyser();
    masterAnalyserRef.current.fftSize = 1024;
    masterGainRef.current.connect(masterAnalyserRef.current);

    const setupDeckAudio = (player: HTMLAudioElement, deckId: 'A' | 'B') => {
      const source = ctx.createMediaElementSource(player);
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;

      // Filter Nodes - Bass "Empuk" setup
      const sub = ctx.createBiquadFilter();
      sub.type = 'peaking';
      sub.frequency.value = 60; // Ultra-low sub bass
      sub.Q.value = 1.0;
      sub.gain.value = 0;

      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 150; // Focused sub-bass region
      low.gain.value = 0;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 0.5; // Wider Q for warmer sound

      const high = ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 5000;

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 20000;

      // --- ECHO SETUP ---
      const echoInput = ctx.createGain();
      const echoDelay = ctx.createDelay(2.0);
      echoDelay.delayTime.value = 0.4;
      const echoFeedback = ctx.createGain();
      echoFeedback.gain.value = 0.5;
      const echoOutput = ctx.createGain();
      echoOutput.gain.value = 0;

      echoInput.connect(echoDelay);
      echoDelay.connect(echoFeedback);
      echoFeedback.connect(echoDelay);
      echoDelay.connect(echoOutput);

      // --- REVERB SETUP ---
      const reverbInput = ctx.createGain();
      const reverbConvolver = ctx.createConvolver();
      reverbConvolver.buffer = createImpulseResponse(ctx, 3.5, 2.0); // "Slow"/Long reverb
      const reverbOutput = ctx.createGain();
      reverbOutput.gain.value = 0;

      reverbInput.connect(reverbConvolver);
      reverbConvolver.connect(reverbOutput);

      // --- FLANGER SETUP ---
      const flangerInput = ctx.createGain();
      const flangerDelay = ctx.createDelay();
      flangerDelay.delayTime.value = 0.005;
      const flangerFeedback = ctx.createGain();
      flangerFeedback.gain.value = 0.5;
      const flangerOsc = ctx.createOscillator();
      const flangerDepth = ctx.createGain();
      flangerDepth.gain.value = 0.002;
      flangerOsc.frequency.value = 0.25;
      const flangerOutput = ctx.createGain();
      flangerOutput.gain.value = 0;

      flangerOsc.connect(flangerDepth);
      flangerDepth.connect(flangerDelay.delayTime);
      flangerOsc.start();

      flangerInput.connect(flangerDelay);
      flangerDelay.connect(flangerOutput);
      flangerDelay.connect(flangerFeedback);
      flangerFeedback.connect(flangerInput);

      // Connections Path: source -> filters -> split(dry/wet) -> gain -> analyser -> master
      source.connect(sub);
      sub.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(lpf);
      
      // Dry signal
      lpf.connect(gain);
      
      // Wet signals (Parallel)
      lpf.connect(echoInput);
      echoOutput.connect(gain);
      
      lpf.connect(reverbInput);
      reverbOutput.connect(gain);

      lpf.connect(flangerInput);
      flangerOutput.connect(gain);

      gain.connect(analyser);
      gain.connect(masterGainRef.current!);

      if (deckId === 'A') {
        gainARef.current = gain;
        analyserARef.current = analyser;
        filtersARef.current = { sub, low, mid, high, lpf };
        echoNodesARef.current = { input: echoInput, delay: echoDelay, feedback: echoFeedback, output: echoOutput };
        reverbNodesARef.current = { input: reverbInput, convolver: reverbConvolver, output: reverbOutput };
        flangerNodesARef.current = { input: flangerInput, delay: flangerDelay, osc: flangerOsc, feedback: flangerFeedback, output: flangerOutput };
      } else {
        gainBRef.current = gain;
        analyserBRef.current = analyser;
        filtersBRef.current = { sub, low, mid, high, lpf };
        echoNodesBRef.current = { input: echoInput, delay: echoDelay, feedback: echoFeedback, output: echoOutput };
        reverbNodesBRef.current = { input: reverbInput, convolver: reverbConvolver, output: reverbOutput };
        flangerNodesBRef.current = { input: flangerInput, delay: flangerDelay, osc: flangerOsc, feedback: flangerFeedback, output: flangerOutput };
      }
    };

    if (playerARef.current) setupDeckAudio(playerARef.current, 'A');
    if (playerBRef.current) setupDeckAudio(playerBRef.current, 'B');
  }, []);

  const handleEcho = (deck: 'A' | 'B', value: number) => {
    const nodes = deck === 'A' ? echoNodesARef.current : echoNodesBRef.current;
    if (nodes) {
      nodes.output.gain.setTargetAtTime(value, audioCtxRef.current!.currentTime, 0.1);
      const setter = deck === 'A' ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, echo: value }));
    }
  };

  const handleReverb = (deck: 'A' | 'B', value: number) => {
    const nodes = deck === 'A' ? reverbNodesARef.current : reverbNodesBRef.current;
    if (nodes) {
      nodes.output.gain.setTargetAtTime(value, audioCtxRef.current!.currentTime, 0.1);
      const setter = deck === 'A' ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, reverb: value }));
    }
  };

  const handleFlanger = (deck: 'A' | 'B', value: number) => {
    const nodes = deck === 'A' ? flangerNodesARef.current : flangerNodesBRef.current;
    if (nodes) {
      nodes.output.gain.setTargetAtTime(value, audioCtxRef.current!.currentTime, 0.1);
      const setter = deck === 'A' ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, flanger: value }));
    }
  };

  const handleSubBass = (deck: 'A' | 'B', value: number) => {
    const filters = deck === 'A' ? filtersARef.current : filtersBRef.current;
    if (filters) {
      filters.sub.gain.setTargetAtTime(value, audioCtxRef.current!.currentTime, 0.1);
      const setter = deck === 'A' ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, subBass: value }));
    }
  };

  const handleEQ = (deck: 'A' | 'B', type: 'low' | 'mid' | 'high', value: number) => {
    const filters = deck === 'A' ? filtersARef.current : filtersBRef.current;
    if (filters) {
      filters[type].gain.value = value;
      const setter = deck === 'A' ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, eq: { ...prev.eq, [type]: value } }));
    }
  };

  const handleFilter = (deck: 'A' | 'B', value: number) => {
    const filters = deck === 'A' ? filtersARef.current : filtersBRef.current;
    if (filters) {
      // Exponentially map value for smoother filter sweep
      const freq = value;
      filters.lpf.frequency.setTargetAtTime(freq, audioCtxRef.current!.currentTime, 0.1);
      const setter = deck === 'A' ? setDeckA : setDeckB;
      setter(prev => ({ ...prev, filter: value }));
    }
  };

  const playSample = (type: 'kick' | 'snare' | 'hihat' | 'airhorn' | 'clap' | 'cowbell' | 'cymbal' | 'zap') => {
    initAudio();
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g).connect(ctx.destination);

    switch(type) {
      case 'kick':
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
        break;
      case 'snare':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        g.gain.setValueAtTime(0.5, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
        break;
      case 'hihat':
        osc.type = 'square';
        osc.frequency.setValueAtTime(10000, ctx.currentTime);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
        break;
      case 'airhorn':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.8);
        g.gain.setValueAtTime(0.5, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        osc.start(); osc.stop(ctx.currentTime + 0.8);
        break;
      case 'clap':
        // Generate clap-like noise
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start();
        break;
      case 'cowbell':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        g.gain.setValueAtTime(0.6, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
        break;
      case 'cymbal':
        osc.type = 'square';
        osc.frequency.setValueAtTime(12000, ctx.currentTime);
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
        break;
      case 'zap':
        osc.frequency.setValueAtTime(2000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.4, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
        break;
    }
  };

  useEffect(() => {
    // Crossfade Logic
    if (gainARef.current && gainBRef.current) {
      // Use equal power crossfade for better transition
      gainARef.current.gain.value = Math.cos(((crossfade + 1) / 4) * Math.PI);
      gainBRef.current.gain.value = Math.sin(((crossfade + 1) / 4) * Math.PI);
    }
  }, [crossfade]);

  // Deck Controls
  const handleLoad = (deck: 'A' | 'B', file: File) => {
    initAudio();
    const url = URL.createObjectURL(file);
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    if (player) {
      player.src = url;
      if (deck === 'A') {
        setDeckA(prev => ({ ...prev, fileName: file.name.toUpperCase() }));
      } else {
        setDeckB(prev => ({ ...prev, fileName: file.name.toUpperCase() }));
      }
    }
  };

  const togglePlay = (deck: 'A' | 'B') => {
    initAudio();
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    if (!player) return;

    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
    
    const setter = deck === 'A' ? setDeckA : setDeckB;
    setter(prev => ({ ...prev, isPlaying: !player.paused }));
  };

  const setCue = (deck: 'A' | 'B', index: number = 0) => {
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    if (player) {
      const time = player.currentTime;
      const setter = deck === 'A' ? setDeckA : setDeckB;
      setter(prev => {
        const newCues = [...prev.cues];
        newCues[index] = time;
        return { ...prev, cues: newCues };
      });
      playSample('hihat');
    }
  };

  const jumpToCue = (deck: 'A' | 'B', index: number = 0) => {
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    const deckData = deck === 'A' ? deckA : deckB;
    if (player) {
      player.currentTime = deckData.cues[index];
    }
  };

  const toggleLoop = (deck: 'A' | 'B', length: number) => {
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    if (!player) return;

    const setter = deck === 'A' ? setDeckA : setDeckB;
    setter(prev => {
      if (prev.loop.active && prev.loop.length === length) {
        return { ...prev, loop: { ...prev.loop, active: false } };
      }
      return { 
        ...prev, 
        loop: { 
          active: true, 
          start: player.currentTime, 
          end: player.currentTime + (length * (60 / 128)), // Approx based on 128bpm
          length 
        } 
      };
    });
  };

  const handleTimeUpdate = (deck: 'A' | 'B') => {
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    const deckData = deck === 'A' ? deckA : deckB;
    if (!player) return;

    // Looping Logic
    if (deckData.loop.active && player.currentTime >= deckData.loop.end) {
      player.currentTime = deckData.loop.start;
    }

    const setter = deck === 'A' ? setDeckA : setDeckB;
    setter(prev => ({ 
      ...prev, 
      currentTime: player.currentTime, 
      duration: player.duration || 0 
    }));
  };

  const handlePitch = (deck: 'A' | 'B', val: number) => {
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    const setter = deck === 'A' ? setDeckA : setDeckB;
    if (player) {
      player.playbackRate = val;
      setter(prev => ({ ...prev, playbackRate: val }));
    }
  };

  const handleSync = (targetDeck: 'A' | 'B') => {
    const sourceRate = targetDeck === 'B' ? deckA.playbackRate : deckB.playbackRate;
    handlePitch(targetDeck, sourceRate);
    playSample('zap');
  };

  // Recording
  const startRecording = () => {
    initAudio();
    if (!audioCtxRef.current || !masterGainRef.current) return;

    const dest = audioCtxRef.current.createMediaStreamDestination();
    masterGainRef.current.connect(dest);

    recorderRef.current = new MediaRecorder(dest.stream);
    recordedChunksRef.current = [];

    recorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
    };

    recorderRef.current.start();
    setIsRecording(true);
    setRecordedUrl(null);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const BrakeEffect = (deck: 'A' | 'B') => {
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    if (!player) return;
    
    let rate = player.playbackRate;
    const interval = setInterval(() => {
      rate -= 0.05;
      if (rate <= 0) {
        player.pause();
        player.playbackRate = 1.0;
        clearInterval(interval);
        const setter = deck === 'A' ? setDeckA : setDeckB;
        setter(prev => ({ ...prev, isPlaying: false, playbackRate: 1.0 }));
      } else {
        player.playbackRate = rate;
      }
    }, 50);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start p-4 md:p-8 relative overflow-hidden selection:bg-[#00f2ff] selection:text-black transition-all duration-75 ${isPump ? 'scale-[1.01] brightness-125' : 'scale-100 brightness-100'}`}>
      {/* DJ Lights Engine */}
      <DjLights 
        analyserA={analyserARef.current} 
        analyserB={analyserBRef.current} 
        active={lightsActive} 
        mode={lightMode} 
      />

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#011]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00f2ff]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <header className="z-10 w-full max-w-6xl flex flex-col md:flex-row items-center justify-between mb-8 gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <WalkerLogo />
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-[#00f2ff] neon-glow uppercase italic">WALKER PRO DJ</h1>
            <p className="text-[10px] font-mono text-white/40 tracking-[0.2em] uppercase">ULTRA PERFORMANCE CONSOLE X-1</p>
          </div>
        </div>

        <div className="flex items-center gap-8 bg-black/40 px-8 py-4 rounded-3xl border border-white/5 backdrop-blur-md">
           <div className="text-center">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Master BPM</p>
              <p className="text-3xl font-mono font-black text-[#00f2ff] tabular-nums">128.00</p>
           </div>
           <div className="w-[1px] h-10 bg-white/10" />
           <div className="text-center">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Master Level</p>
              <div className="flex gap-1 h-8 items-end">
                 <Visualizer analyser={masterAnalyserRef.current} color="#00f2ff" type="bars" />
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLightsActive(!lightsActive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${lightsActive ? 'border-[#00f2ff] bg-[#00f2ff]/10 text-[#00f2ff]' : 'border-white/10 bg-white/5 text-white/40'}`}
          >
            <Zap size={14} className={lightsActive ? 'animate-pulse' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{lightsActive ? 'Lights ON' : 'Lights OFF'}</span>
          </button>

          {lightsActive && (
            <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
               {(['pulse', 'strobe', 'ambient'] as const).map(m => (
                 <button 
                  key={m}
                  onClick={() => setLightMode(m)}
                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${lightMode === m ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                 >
                   {m}
                 </button>
               ))}
            </div>
          )}
          
          <button 
            onClick={() => setShowStore(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black transition-all ${isPremium ? 'border-yellow-500/50 text-yellow-500' : 'border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/10'}`}
          >
            <Zap size={14} fill={isPremium ? "currentColor" : "none"} />
            {isPremium ? 'PRO UNLOCKED' : 'GO PRO'}
          </button>

          <button 
            onClick={() => setIsJedagJedug(!isJedagJedug)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black transition-all ${isJedagJedug ? 'border-red-500 bg-red-500/20 text-red-500 animate-pulse scale-110' : 'border-white/10 text-white/40 hover:bg-white/5'}`}
          >
            <Music size={14} className={isJedagJedug ? 'animate-spin' : ''} />
            JEDAG JEDUG
          </button>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isRecording ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-white/5'} transition-all`}>
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-white/20'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{isRecording ? 'Recording Live Mix' : 'Idle Engine'}</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <main className="z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* DECK A */}
        <section className="lg:col-span-12 xl:col-span-5 flex flex-col gap-4">
          <div className="bg-[#111] border-l-4 border-white neon-border p-6 rounded-2xl relative overflow-hidden group scanline">
            <div className="absolute top-0 right-0 p-3 opacity-20"><Activity size={24} /></div>
            
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">System Deck Alpha</span>
                <h2 className="text-xl font-mono font-bold truncate max-w-[200px] neon-glow">{deckA.fileName}</h2>
              </div>
              <label className="cursor-pointer group/upload">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="audio/*"
                  onChange={(e) => e.target.files?.[0] && handleLoad('A', e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover/upload:bg-white group-hover/upload:text-black transition-all">
                  <Upload size={20} />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-12 gap-4 h-56">
              <div className="col-span-1 flex flex-col justify-center items-center py-4">
                <VuMeter analyser={analyserARef.current} />
              </div>
              <div className="col-span-7 flex flex-col justify-center items-center relative gap-4">
                <JogWheel isPlaying={deckA.isPlaying} color="#ffffff" deck="A" playerRef={playerARef} />
                <div className="flex gap-1 w-full px-4 items-end h-16">
                   <Visualizer analyser={analyserARef.current} color="#ffffff" type={deckA.isPlaying ? 'bars' : 'wave'} />
                </div>
              </div>
              
              <div className="col-span-4 flex flex-col gap-3 justify-between pt-2">
                {(['high', 'mid', 'low'] as const).map(band => (
                  <div key={band} className="flex flex-col gap-1 items-center">
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">{band} gain</span>
                    <input 
                      type="range" min="-40" max="15" step="0.5"
                      value={deckA.eq[band]}
                      onChange={(e) => handleEQ('A', band, parseFloat(e.target.value))}
                      className="w-full rotate-[-90deg] h-1 bg-white/10 accent-white cursor-pointer" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <audio ref={playerARef} onTimeUpdate={() => handleTimeUpdate('A')} onEnded={() => setDeckA(d => ({ ...d, isPlaying: false }))} />

            <div className="mt-12 grid grid-cols-4 gap-2">
              <div className="col-span-4 grid grid-cols-4 gap-1 mb-2">
                {[4, 8, 16, 32].map(len => (
                  <button 
                    key={len}
                    onClick={() => toggleLoop('A', len)}
                    className={`h-8 rounded-lg text-[8px] font-black border transition-all ${deckA.loop.active && deckA.loop.length === len ? 'bg-[#00f2ff] text-black border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    LOOP {len}
                  </button>
                ))}
              </div>
              
              {[0, 1, 2, 3].map(i => (
                <button 
                  key={i}
                  onClick={() => deckA.cues[i] === 0 ? setCue('A', i) : jumpToCue('A', i)}
                  className={`h-14 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckA.cues[i] !== 0 ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}
                >
                  CUE {i + 1}
                </button>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-4 gap-2">
              <button 
                onClick={() => handleEQ('A', 'low', deckA.eq.low === -40 ? 0 : -40)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckA.eq.low <= -20 ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill Low
              </button>
              <button 
                onClick={() => handleEQ('A', 'mid', deckA.eq.mid === -40 ? 0 : -40)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckA.eq.mid <= -20 ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill Mid
              </button>
              <button 
                onClick={() => handleEQ('A', 'high', deckA.eq.high === -40 ? 0 : -40)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckA.eq.high <= -20 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill High
              </button>
              <button 
                onClick={() => handleFilter('A', deckA.filter < 500 ? 20000 : 300)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckA.filter < 500 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill LPF
              </button>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-4">
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Sub Bass</span>
                    <span className="text-[8px] font-mono text-white/80">{Math.round(deckA.subBass)}dB</span>
                  </div>
                  <input 
                    type="range" min="0" max="24" step="1" 
                    value={deckA.subBass}
                    onChange={(e) => handleSubBass('A', parseFloat(e.target.value))}
                    className="w-full h-1 accent-red-500"
                  />
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Echo FX</span>
                    <span className="text-[8px] font-mono text-white/80">{Math.round(deckA.echo * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={deckA.echo}
                    onChange={(e) => handleEcho('A', parseFloat(e.target.value))}
                    className="w-full h-1 accent-white"
                  />
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Reverb FX</span>
                    <span className="text-[8px] font-mono text-white/80">{Math.round(deckA.reverb * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={deckA.reverb}
                    onChange={(e) => handleReverb('A', parseFloat(e.target.value))}
                    className="w-full h-1 accent-white"
                  />
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#00f2ff]/60">Flange FX</span>
                    <span className="text-[8px] font-mono text-[#00f2ff]/80">{Math.round(deckA.flanger * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={deckA.flanger}
                    onChange={(e) => handleFlanger('A', parseFloat(e.target.value))}
                    className="w-full h-1 accent-[#00f2ff]"
                  />
               </div>
            </div>

            <div className="mt-8 grid grid-cols-4 gap-3">
              <button 
                onClick={() => togglePlay('A')}
                className={`col-span-2 flex items-center justify-center gap-2 h-16 rounded-xl font-black transition-all text-sm tracking-widest ${deckA.isPlaying ? 'bg-white text-black scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {deckA.isPlaying ? <Pause /> : <Play />}
                {deckA.isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button onClick={() => setCue('A')} className="bg-white/5 hover:bg-white/10 rounded-xl h-16 font-mono font-bold text-xs border border-white/10">CUE</button>
              <button onClick={() => BrakeEffect('A')} className="bg-red-500/10 hover:bg-red-500/20 rounded-xl h-16 font-mono font-bold text-xs border border-red-500/20 text-red-500">BRAKE</button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase">
                  <span>Speed Offset</span>
                  <span className="text-white">{deckA.playbackRate.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" min="0.5" max="2" step="0.01" 
                  value={deckA.playbackRate}
                  onChange={(e) => handlePitch('A', parseFloat(e.target.value))}
                  className="w-full accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <button 
                  onClick={() => handleSync('A')}
                  className="w-full h-8 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  SYNC TO B
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase">
                  <span>LP Filter</span>
                  <span className="text-white">{Math.floor(deckA.filter)}Hz</span>
                </div>
                <input 
                  type="range" min="100" max="20000" step="1" 
                  value={deckA.filter}
                  onChange={(e) => handleFilter('A', parseFloat(e.target.value))}
                  className="w-full accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {(['kick', 'snare', 'hihat', 'airhorn', 'clap', 'cowbell', 'cymbal', 'zap'] as const).map(sample => (
              <button 
                key={sample} 
                onClick={() => playSample(sample)}
                className="h-14 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black hover:bg-white/10 hover:scale-105 active:scale-90 transition-all uppercase tracking-[0.2em]"
              >
                {sample}
              </button>
            ))}
          </div>
        </section>

        {/* CENTER MIXER */}
        <section className="lg:col-span-12 xl:col-span-2 flex flex-col gap-8 items-center py-8 bg-white/5 rounded-[40px] border border-white/10 backdrop-blur-xl group">
           <div className="flex flex-col items-center gap-6 w-full px-6">
              <div className="flex items-center gap-2">
                <Volume2 size={14} className="text-white/20" />
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Master Mixer</label>
              </div>
              <div className="relative w-full h-[300px] flex items-center justify-center">
                 <div className="absolute inset-0 bg-black/20 rounded-full w-2 mx-auto" />
                 <input 
                  type="range" 
                  min="-1" max="1" step="0.01" 
                  value={crossfade}
                  onChange={(e) => setCrossfade(parseFloat(e.target.value))}
                  style={{ transform: 'rotate(-90deg)', width: '250px' }}
                  className="accent-[#00f2ff] h-4 bg-transparent appearance-none cursor-pointer z-10"
                 />
                 <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 flex flex-col justify-between py-4 pointer-events-none opacity-20">
                    {[...Array(11)].map((_, i) => <div key={i} className="h-[1px] w-full bg-white" />)}
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-3 w-full px-8">
              <div className="flex justify-between text-[9px] font-black text-white/30 uppercase tracking-widest">
                <span>PL A</span>
                <span>PL B</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full p-0.5 border border-white/5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-white to-[#00f2ff] transition-all shadow-[0_0_15px_rgba(0,242,255,0.5)]" 
                  style={{ 
                    width: '30%',
                    marginLeft: `${((crossfade + 1) / 2) * 70}%`
                  }} 
                />
              </div>
           </div>

           <div className="mt-auto flex flex-col w-full gap-3 px-4">
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-tighter transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-[#00f2ff] text-black hover:scale-105 active:scale-95'}`}
              >
                {isRecording ? <Mic size={16} /> : <Zap size={16} />}
                {isRecording ? 'STOP SESSION' : 'MASTER REC'}
              </button>
              
              <AnimatePresence>
                {recordedUrl && (
                  <motion.a 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    href={recordedUrl}
                    download="WALKER_PRO_MIX.webm"
                    className="w-full h-14 rounded-2xl bg-white text-black flex items-center justify-center gap-3 text-xs font-black uppercase tracking-tighter shadow-xl"
                  >
                    <Download size={16} />
                    EXPORT MIX
                  </motion.a>
                )}
              </AnimatePresence>
           </div>
        </section>

        {/* DECK B */}
        <section className="lg:col-span-12 xl:col-span-5 flex flex-col gap-4">
          <div className="bg-[#111] border-r-4 border-[#00f2ff] neon-border p-6 rounded-2xl relative overflow-hidden group scanline">
            <div className="absolute top-0 left-0 p-3 opacity-20"><Activity size={24} /></div>

            <div className="flex justify-between items-center mb-6">
              <label className="cursor-pointer group/upload">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="audio/*"
                  onChange={(e) => e.target.files?.[0] && handleLoad('B', e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover/upload:bg-[#00f2ff] group-hover/upload:text-black transition-all">
                  <Upload size={20} />
                </div>
              </label>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold text-[#00f2ff]/40 uppercase tracking-[0.2em]">System Deck Bravo</span>
                <h2 className="text-xl font-mono font-bold truncate max-w-[200px] text-[#00f2ff] neon-glow">{deckB.fileName}</h2>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 h-56">
              <div className="col-span-4 flex flex-col gap-3 justify-between pt-2">
                {(['high', 'mid', 'low'] as const).map(band => (
                  <div key={band} className="flex flex-col gap-1 items-center">
                    <span className="text-[7px] font-black text-[#00f2ff]/40 uppercase tracking-widest">{band} gain</span>
                    <input 
                      type="range" min="-40" max="15" step="0.5"
                      value={deckB.eq[band]}
                      onChange={(e) => handleEQ('B', band, parseFloat(e.target.value))}
                      className="w-full rotate-[-90deg] h-1 bg-white/10 accent-[#00f2ff] cursor-pointer" 
                    />
                  </div>
                ))}
              </div>
              <div className="col-span-12 xl:col-span-7 flex flex-col justify-center items-center relative gap-4">
                <JogWheel isPlaying={deckB.isPlaying} color="#00f2ff" deck="B" playerRef={playerBRef} />
                <div className="flex gap-1 w-full px-4 items-end h-16">
                   <Visualizer analyser={analyserBRef.current} color="#00f2ff" type={deckB.isPlaying ? 'bars' : 'wave'} />
                </div>
              </div>
              <div className="col-span-1 flex flex-col justify-center items-center py-4">
                <VuMeter analyser={analyserBRef.current} />
              </div>
            </div>

            <audio ref={playerBRef} onTimeUpdate={() => handleTimeUpdate('B')} onEnded={() => setDeckB(d => ({ ...d, isPlaying: false }))} />

            <div className="mt-12 grid grid-cols-4 gap-2">
              <div className="col-span-4 grid grid-cols-4 gap-1 mb-2">
                {[4, 8, 16, 32].map(len => (
                  <button 
                    key={len}
                    onClick={() => toggleLoop('B', len)}
                    className={`h-8 rounded-lg text-[8px] font-black border transition-all ${deckB.loop.active && deckB.loop.length === len ? 'bg-[#00f2ff] text-black border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    LOOP {len}
                  </button>
                ))}
              </div>

              {[0, 1, 2, 3].map(i => (
                <button 
                  key={i}
                  onClick={() => deckB.cues[i] === 0 ? setCue('B', i) : jumpToCue('B', i)}
                  className={`h-14 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckB.cues[i] !== 0 ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}
                >
                  CUE {i + 1}
                </button>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-4 gap-2">
              <button 
                onClick={() => handleFilter('B', deckB.filter < 500 ? 20000 : 300)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckB.filter < 500 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill LPF
              </button>
              <button 
                onClick={() => handleEQ('B', 'high', deckB.eq.high === -40 ? 0 : -40)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckB.eq.high <= -20 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill High
              </button>
              <button 
                onClick={() => handleEQ('B', 'mid', deckB.eq.mid === -40 ? 0 : -40)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckB.eq.mid <= -20 ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill Mid
              </button>
              <button 
                onClick={() => handleEQ('B', 'low', deckB.eq.low === -40 ? 0 : -40)}
                className={`h-12 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckB.eq.low <= -20 ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                Kill Low
              </button>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-4">
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#00f2ff]/40">Sub Bass</span>
                    <span className="text-[8px] font-mono text-[#00f2ff]/80">{Math.round(deckB.subBass)}dB</span>
                  </div>
                  <input 
                    type="range" min="0" max="24" step="1" 
                    value={deckB.subBass}
                    onChange={(e) => handleSubBass('B', parseFloat(e.target.value))}
                    className="w-full h-1 accent-[#00f2ff]"
                  />
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#00f2ff]/40">Echo FX</span>
                    <span className="text-[8px] font-mono text-[#00f2ff]/80">{Math.round(deckB.echo * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={deckB.echo}
                    onChange={(e) => handleEcho('B', parseFloat(e.target.value))}
                    className="w-full h-1 accent-[#00f2ff]"
                  />
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#00f2ff]/40">Reverb FX</span>
                    <span className="text-[8px] font-mono text-[#00f2ff]/80">{Math.round(deckB.reverb * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={deckB.reverb}
                    onChange={(e) => handleReverb('B', parseFloat(e.target.value))}
                    className="w-full h-1 accent-[#00f2ff]"
                  />
               </div>
               <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between mb-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#00f2ff]/60">Flange FX</span>
                    <span className="text-[8px] font-mono text-[#00f2ff]/80">{Math.round(deckB.flanger * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" 
                    value={deckB.flanger}
                    onChange={(e) => handleFlanger('B', parseFloat(e.target.value))}
                    className="w-full h-1 accent-[#00f2ff]"
                  />
               </div>
            </div>

            <div className="mt-8 grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => (
                <button 
                  key={i}
                  onClick={() => deckB.cues[i] === 0 ? setCue('B', i) : jumpToCue('B', i)}
                  className={`h-16 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${deckB.cues[i] !== 0 ? 'bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-white/5 border-white/10 text-white/20'}`}
                >
                  CUE {i + 1}
                </button>
              ))}
              <button 
                onClick={() => BrakeEffect('B')}
                className="bg-red-500/10 hover:bg-red-500/20 rounded-xl h-20 font-mono font-bold text-xs border border-red-500/20 text-red-500"
              >
                BRAKE
              </button>
              <button 
                onClick={() => togglePlay('B')}
                className={`col-span-3 flex items-center justify-center gap-2 h-20 rounded-xl font-black transition-all text-sm tracking-widest ${deckB.isPlaying ? 'bg-[#00f2ff] text-black scale-95 shadow-[0_0_30px_rgba(0,242,255,0.4)]' : 'bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20'}`}
              >
                {deckB.isPlaying ? <Pause /> : <Play />}
                {deckB.isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-[#00f2ff]/40 uppercase">
                  <span>Speed Offset</span>
                  <span className="text-[#00f2ff]">{deckB.playbackRate.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" min="0.5" max="2" step="0.01" 
                  value={deckB.playbackRate}
                  onChange={(e) => handlePitch('B', parseFloat(e.target.value))}
                  className="w-full accent-[#00f2ff] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <button 
                  onClick={() => handleSync('B')}
                  className="w-full h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/20 text-[8px] font-black hover:bg-[#00f2ff]/20 text-[#00f2ff] transition-all uppercase tracking-widest"
                >
                  SYNC TO A
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-[#00f2ff]/40 uppercase">
                  <span>LP Filter</span>
                  <span className="text-[#00f2ff]">{Math.floor(deckB.filter)}Hz</span>
                </div>
                <input 
                  type="range" min="100" max="20000" step="1" 
                  value={deckB.filter}
                  onChange={(e) => handleFilter('B', parseFloat(e.target.value))}
                  className="w-full accent-[#00f2ff] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {(['kick', 'snare', 'hihat', 'airhorn', 'clap', 'cowbell', 'cymbal', 'zap'] as const).map(sample => (
              <button 
                key={sample} 
                onClick={() => playSample(sample)}
                className="h-14 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black hover:bg-[#00f2ff]/20 hover:scale-105 active:scale-90 transition-all uppercase tracking-[0.2em]"
              >
                {sample}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Area Iklan Adsterra / Ads Holder */}
      {!isPremium && (
        <div className="fixed bottom-0 left-0 w-full h-[60px] bg-black/90 border-t border-[#00f2ff]/20 flex items-center justify-center z-40 backdrop-blur-md">
          {/* 
              TIPS: Tempel kode script Adsterra Anda di bawah ini jika Anda mengedit manual.
              Untuk saat ini, ini adalah area holder agar layout tidak berantakan.
          */}
          <div className="text-center">
            <p className="text-[10px] font-black text-[#00f2ff]/40 uppercase tracking-[0.4em] animate-pulse">Adsterra Ads Area</p>
          </div>
        </div>
      )}

      <footer className="z-10 mt-auto pt-12 pb-16 flex flex-col items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
        <div className="flex items-center gap-4 mb-2">
          <Waves size={16} />
          <p className="text-[9px] font-mono tracking-[0.5em] uppercase">Built for the Walkers Society</p>
          <Waves size={16} />
        </div>
        <div className="flex gap-8">
           <Disc className="animate-spin-slow" size={12} />
           <Music2 size={12} />
           <FastForward size={12} />
           <Rewind size={12} />
        </div>
      </footer>

      {/* Store Modal */}
      <AnimatePresence>
        {showStore && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowStore(false)} className="text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Zap size={40} className="text-yellow-500" fill="currentColor" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">Upgrade to Pro</h2>
                <p className="text-white/60 text-sm mb-8">Unlock professional features and remove advertisements forever.</p>
                
                <div className="space-y-4 mb-8">
                  {[
                    "Remove Bottom Ads",
                    "Recording Studio Access",
                    "Exclusive FX & Samples",
                    "Higher Audio Quality"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-3 text-left">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <span className="text-sm text-white/80">{feat}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    setIsPremium(true);
                    setShowStore(false);
                    playSample('zap');
                  }}
                  className="w-full py-4 bg-yellow-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-yellow-400 transition-colors"
                >
                  Unlock Now - $4.99
                </button>

                {deferredPrompt && (
                  <button 
                    onClick={handleInstallClick}
                    className="w-full mt-4 py-3 bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl border border-white/10 hover:bg-white/20 transition-colors"
                  >
                    Install App on Phone
                  </button>
                )}
                <p className="mt-4 text-[10px] text-white/20 uppercase tracking-widest cursor-pointer hover:text-white/40 transition-colors">Restore Purchases</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255,255,255,0.5);
        }
        input[type="range"].accent-neon::-webkit-slider-thumb {
          background: #00f2ff;
          box-shadow: 0 0 15px rgba(0,242,255,0.8);
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
