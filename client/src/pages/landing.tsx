import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, 
  Search, 
  Shield, 
  FileText, 
  Image, 
  Volume2, 
  Video, 
  ExternalLink,
  Sparkles,
  ArrowRight,
  Brain,
  Zap,
  MessageSquare,
  Star,
  Check,
  Circle,
  Triangle,
  Square,
  Hexagon,
  Play,
  Pause
} from "lucide-react";

const LandingPage = () => {
  const [, setLocation] = useLocation();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollY } = useScroll();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });
  
  const y1 = useTransform(scrollY, [0, 1000], [0, -200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -400]);
  const y3 = useTransform(scrollY, [0, 1000], [0, -100]);
  const rotate1 = useTransform(scrollY, [0, 1000], [0, 360]);
  const rotate2 = useTransform(scrollY, [0, 1000], [0, -180]);
  const scale = useTransform(scrollY, [0, 300], [1, 1.2]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseX.set(e.clientX - rect.left - rect.width / 2);
        mouseY.set(e.clientY - rect.top - rect.height / 2);
      }
      
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-section]');
      const scrollPos = window.scrollY + window.innerHeight / 2;
      
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = window.scrollY + rect.top;
        const sectionBottom = sectionTop + rect.height;
        
        if (scrollPos >= sectionTop && scrollPos < sectionBottom) {
          setCurrentSection(index);
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [mouseX, mouseY]);

  const handleGetStarted = () => {
    window.location.href = "/api/login";
  };

  const handleTryDemo = () => {
    setLocation("/chat");
  };

  const features = [
    {
      icon: Upload,
      shape: Circle,
      title: "INTELLIGENT\nUPLOAD",
      subtitle: "SYSTEM",
      description: "Transform chaos into clarity. Our AI doesn't just store—it understands, categorizes, and connects your content in ways you never imagined.",
      color: "#FF6B6B",
      accent: "#FF8E8E",
      position: { x: -20, y: 20 }
    },
    {
      icon: Search,
      shape: Triangle,
      title: "NEURAL\nSEARCH",
      subtitle: "ENGINE",
      description: "Beyond keywords. Beyond files. Your thoughts become queries, your questions become discoveries in the infinite landscape of your knowledge.",
      color: "#4ECDC4", 
      accent: "#6EDCD4",
      position: { x: 20, y: -20 }
    },
    {
      icon: Shield,
      shape: Hexagon,
      title: "FORTRESS\nPRIVACY",
      subtitle: "PROTOCOL", 
      description: "Your mind's vault, encrypted at the atomic level. What's yours stays yours, protected by mathematics itself.",
      color: "#45B7D1",
      accent: "#67C7E1", 
      position: { x: 0, y: 30 }
    }
  ];

  const fileTypes = [
    { icon: FileText, label: "PDFs", color: "text-red-500" },
    { icon: Image, label: "Images", color: "text-green-500" },
    { icon: Volume2, label: "Audio", color: "text-blue-500" },
    { icon: Video, label: "Video", color: "text-purple-500" },
    { icon: ExternalLink, label: "Links", color: "text-orange-500" }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Research Scientist",
      content: "KnowledgeVault transformed how I organize my research papers and notes. The AI search is incredibly accurate.",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "Content Creator", 
      content: "I can finally find that perfect clip from months ago in seconds. The AI understands context like magic.",
      avatar: "MR"
    },
    {
      name: "Dr. Emily Watson",
      role: "Medical Professional",
      content: "Secure, intelligent, and intuitive. Essential for managing medical knowledge and research.",
      avatar: "EW"
    }
  ];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-black text-white overflow-hidden relative font-mono" 
      data-testid="landing-page"
      style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(78, 205, 196, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(69, 183, 209, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, #000000 0%, #0a0a0a 100%)
        `
      }}
    >
      {/* Dynamic Cursor Follower */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-50 mix-blend-difference"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%"
        }}
      >
        <div className="w-full h-full bg-white rounded-full" />
      </motion.div>

      {/* Artistic Background Elements */}
      <motion.div
        style={{ y: y1, rotate: rotate1 }}
        className="absolute top-20 left-20 w-64 h-64 opacity-20"
        animate={{
          scale: [1, 1.3, 1],
          rotateZ: [0, 360]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="w-full h-full border-2 border-red-500 rotate-45" />
      </motion.div>
      
      <motion.div
        style={{ y: y2, rotate: rotate2 }}
        className="absolute top-40 right-10 w-32 h-32 opacity-30"
        animate={{
          scale: [1.2, 0.8, 1.2],
          rotateZ: [360, 0]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Triangle className="w-full h-full text-cyan-400" />
      </motion.div>

      <motion.div
        style={{ y: y3 }}
        className="absolute bottom-20 left-1/2 w-48 h-48 opacity-20"
        animate={{
          rotateZ: [0, 180, 360],
          scale: [0.8, 1.1, 0.8]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Hexagon className="w-full h-full text-blue-400" />
      </motion.div>

      {/* Floating Geometric Shapes */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute opacity-10"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${20 + Math.random() * 40}px`,
            height: `${20 + Math.random() * 40}px`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            rotate: [0, 360],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut"
          }}
        >
          {i % 3 === 0 && <Circle className="w-full h-full text-red-400" />}
          {i % 3 === 1 && <Square className="w-full h-full text-cyan-400" />}
          {i % 3 === 2 && <Triangle className="w-full h-full text-blue-400" />}
        </motion.div>
      ))}

      <div className="relative z-10">
        {/* Experimental Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 p-6 lg:px-12 mix-blend-difference">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.div 
              className="flex items-center gap-4"
              data-testid="logo"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="w-12 h-12 border-2 border-white relative"
                animate={{ 
                  rotateZ: isPlaying ? [0, 360] : 0,
                  borderRadius: ["20%", "50%", "20%"]
                }}
                transition={{ 
                  duration: 8, 
                  repeat: isPlaying ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <Brain className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </motion.div>
              
              <div className="text-left">
                <h1 className="text-2xl font-bold tracking-wider text-white">
                  KNOWLEDGE
                </h1>
                <div className="text-sm opacity-60 tracking-[0.2em]">
                  VAULT™
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-center gap-6"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 border border-white/30 hover:border-white/60 transition-all"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              
              <Button 
                onClick={handleGetStarted}
                className="bg-transparent border border-white text-white hover:bg-white hover:text-black transition-all duration-300 px-8 py-2 uppercase tracking-wider text-sm"
                data-testid="nav-get-started"
              >
                ENTER →
              </Button>
            </motion.div>
          </motion.div>
        </nav>

        {/* Hero Section - Experimental Typography */}
        <section 
          className="min-h-screen flex items-center justify-center px-6 relative"
          data-section="0"
        >
          <div className="max-w-7xl mx-auto text-center relative">
            {/* Main Title - Deconstructed */}
            <motion.div
              className="relative mb-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 0.5 }}
            >
              <motion.div 
                className="text-8xl lg:text-[12rem] font-black leading-none"
                style={{ 
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.02em'
                }}
                data-testid="hero-title"
              >
                <motion.span
                  className="inline-block"
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1, delay: 0.8 }}
                  style={{ color: '#FF6B6B' }}
                >
                  K
                </motion.span>
                <motion.span
                  className="inline-block"
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.9 }}
                  style={{ color: '#4ECDC4' }}
                >
                  N
                </motion.span>
                <motion.span
                  className="inline-block"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1, delay: 1.0 }}
                  style={{ color: '#45B7D1' }}
                >
                  O
                </motion.span>
                <motion.span
                  className="inline-block"
                  initial={{ opacity: 0, scale: 2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 1.1 }}
                  style={{ color: '#96CEB4' }}
                >
                  W
                </motion.span>
                <motion.span
                  className="inline-block"
                  initial={{ opacity: 0, rotate: 180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ duration: 1, delay: 1.2 }}
                  style={{ color: '#FECA57' }}
                >
                  L
                </motion.span>
              </motion.div>
              
              <motion.div
                className="text-4xl lg:text-6xl font-light tracking-[0.3em] mt-4 opacity-80"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ duration: 1, delay: 1.5 }}
              >
                EDGE_VAULT
              </motion.div>
            </motion.div>

            {/* Subtitle - Floating Words */}
            <motion.div 
              className="relative h-32 mb-16 overflow-hidden"
              data-testid="hero-description"
            >
              {["INTELLIGENCE", "ORGANIZES", "SEARCHABLE", "ENCRYPTED"].map((word, index) => (
                <motion.span
                  key={word}
                  className={`absolute text-2xl lg:text-3xl font-light tracking-widest`}
                  style={{
                    color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][index],
                    left: `${20 + index * 15}%`,
                    top: `${10 + index * 20}%`
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.6, 1, 0.6],
                    rotateZ: [0, 5, 0]
                  }}
                  transition={{
                    duration: 4,
                    delay: 2 + index * 0.2,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>

            {/* CTA Buttons - Asymmetric Layout */}
            <motion.div
              className="flex flex-col lg:flex-row items-center justify-center gap-8 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 2.5 }}
            >
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotateZ: -1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Button 
                  onClick={handleGetStarted}
                  className="bg-transparent border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-12 py-4 text-lg font-light tracking-widest transition-all duration-500"
                  data-testid="hero-get-started"
                >
                  INITIATE
                </Button>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-400 rounded-full animate-pulse" />
              </motion.div>
              
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05, rotateZ: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Button 
                  onClick={handleTryDemo}
                  className="bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black px-12 py-4 text-lg font-light tracking-widest transition-all duration-500"
                  data-testid="hero-demo"
                >
                  EXPLORE
                </Button>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-cyan-400 rotate-45" />
              </motion.div>
            </motion.div>

            {/* Floating Stats */}
            <motion.div 
              className="absolute top-20 right-10 text-right opacity-60"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 0.6, x: 0 }}
              transition={{ duration: 1, delay: 3 }}
              data-testid="hero-stats"
            >
              <div className="text-sm tracking-[0.2em] mb-2">FORMAT_SUPPORT</div>
              <div className="text-4xl font-black text-red-400">∞</div>
            </motion.div>

            <motion.div 
              className="absolute bottom-20 left-10 text-left opacity-60"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 0.6, x: 0 }}
              transition={{ duration: 1, delay: 3.2 }}
            >
              <div className="text-sm tracking-[0.2em] mb-2">ENCRYPTION_LEVEL</div>
              <div className="text-4xl font-black text-cyan-400">100%</div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - Experimental Layout */}
        <section 
          className="min-h-screen px-6 lg:px-12 py-32 relative" 
          data-section="1"
          data-testid="features-section"
        >
          {/* Section Title - Deconstructed */}
          <motion.div 
            className="text-center mb-32"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-6xl lg:text-8xl font-black tracking-tighter mb-8"
              style={{ fontFamily: 'Inter, sans-serif' }}
              initial={{ opacity: 0, rotateX: 90 }}
              whileInView={{ opacity: 1, rotateX: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <span className="text-white">SYS</span>
              <span className="text-red-400">TEM</span>
              <span className="text-cyan-400">_</span>
              <span className="text-blue-400">CORE</span>
            </motion.h2>
            
            <motion.div
              className="text-lg tracking-[0.4em] opacity-60 uppercase"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 0.6, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
            >
              NEURAL ARCHITECTURE
            </motion.div>
          </motion.div>

          {/* Features - Asymmetric Grid */}
          <div className="max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="relative mb-32 lg:mb-48"
                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: index * 0.2 }}
                viewport={{ once: true }}
                data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-').replace(/\n/g, '-')}`}
              >
                <div 
                  className={`grid lg:grid-cols-2 gap-16 items-center ${
                    index % 2 === 0 ? '' : 'lg:grid-flow-col-dense'
                  }`}
                >
                  {/* Content */}
                  <motion.div 
                    className={`relative ${index % 2 === 0 ? '' : 'lg:col-start-2'}`}
                    style={{
                      transform: `translate(${feature.position.x}px, ${feature.position.y}px)`
                    }}
                  >
                    <motion.div 
                      className="text-sm tracking-[0.3em] opacity-40 mb-4 uppercase"
                      style={{ color: feature.color }}
                    >
                      {feature.subtitle}
                    </motion.div>
                    
                    <motion.h3 
                      className="text-4xl lg:text-6xl font-black leading-none mb-8 whitespace-pre-line"
                      style={{ color: feature.color }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {feature.title}
                    </motion.h3>
                    
                    <motion.p 
                      className="text-lg lg:text-xl text-gray-300 leading-relaxed mb-8 max-w-lg"
                      initial={{ opacity: 0.6 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.8 }}
                      viewport={{ once: true }}
                    >
                      {feature.description}
                    </motion.p>

                    <motion.button
                      className="border border-white/30 px-8 py-3 text-sm tracking-[0.2em] uppercase hover:border-white/60 transition-all duration-300"
                      whileHover={{ x: 10 }}
                      style={{
                        background: `linear-gradient(90deg, ${feature.color}20 0%, transparent 100%)`
                      }}
                    >
                      ANALYZE_PROTOCOL →
                    </motion.button>
                  </motion.div>

                  {/* Visual Element */}
                  <motion.div 
                    className={`relative h-96 ${index % 2 === 0 ? '' : 'lg:col-start-1'}`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <motion.div
                      className="absolute inset-0 border-2 opacity-30"
                      style={{ borderColor: feature.color }}
                      animate={{
                        rotateZ: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                    
                    <motion.div
                      className="absolute inset-4 flex items-center justify-center"
                      style={{
                        background: `radial-gradient(circle, ${feature.color}30 0%, transparent 70%)`
                      }}
                    >
                      <motion.div
                        className="relative"
                        animate={{
                          rotateY: [0, 360]
                        }}
                        transition={{
                          duration: 15,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      >
                        <feature.shape 
                          className="w-32 h-32"
                          style={{ color: feature.color }}
                        />
                        <feature.icon 
                          className="w-16 h-16 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white"
                        />
                      </motion.div>
                    </motion.div>

                    {/* Floating Data Points */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full opacity-60"
                        style={{
                          backgroundColor: feature.accent,
                          top: `${20 + Math.random() * 60}%`,
                          left: `${20 + Math.random() * 60}%`,
                        }}
                        animate={{
                          y: [0, -20, 0],
                          opacity: [0.6, 1, 0.6],
                          scale: [1, 1.5, 1]
                        }}
                        transition={{
                          duration: 2 + Math.random() * 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Data Stream Section - Creative Visualization */}
        <section 
          className="min-h-screen px-6 lg:px-12 py-32 relative overflow-hidden" 
          data-section="2"
          data-testid="file-types-section"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, rgba(255, 107, 107, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(78, 205, 196, 0.05) 0%, transparent 50%)
            `
          }}
        >
          <motion.div
            className="text-center mb-32"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <motion.h3 
              className="text-5xl lg:text-7xl font-black mb-8"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <span className="text-white">DATA</span>
              <span className="text-cyan-400">_</span>
              <span className="text-red-400">STREAM</span>
            </motion.h3>
            
            <motion.div
              className="text-lg tracking-[0.4em] opacity-60 uppercase"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 0.6, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
            >
              UNIVERSAL FORMAT SUPPORT
            </motion.div>
          </motion.div>

          {/* Flowing Data Stream */}
          <div className="relative max-w-6xl mx-auto">
            <motion.div
              className="flex justify-center items-center gap-16 flex-wrap"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {fileTypes.map((type, index) => (
                <motion.div
                  key={type.label}
                  className="relative group"
                  initial={{ opacity: 0, y: 100 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100 
                  }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    scale: 1.2,
                    rotateZ: 10,
                    y: -20
                  }}
                  data-testid={`file-type-${type.label.toLowerCase()}`}
                >
                  {/* Connection Lines */}
                  {index < fileTypes.length - 1 && (
                    <motion.div
                      className="absolute top-1/2 left-full w-16 h-0.5 bg-gradient-to-r from-white/30 to-transparent hidden lg:block"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: index * 0.1 + 0.5 }}
                      viewport={{ once: true }}
                    />
                  )}

                  {/* Data Node */}
                  <motion.div 
                    className="w-24 h-24 border-2 border-white/30 bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer relative overflow-hidden"
                    style={{
                      clipPath: index % 2 === 0 ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                    }}
                    whileHover={{
                      borderColor: ['#FF6B6B', '#4ECDC4', '#45B7D1'][index % 3],
                      boxShadow: `0 0 30px ${['#FF6B6B', '#4ECDC4', '#45B7D1'][index % 3]}50`
                    }}
                    animate={{
                      borderColor: [
                        'rgba(255, 255, 255, 0.3)',
                        ['#FF6B6B', '#4ECDC4', '#45B7D1'][index % 3] + '80',
                        'rgba(255, 255, 255, 0.3)'
                      ]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.5,
                      ease: "easeInOut"
                    }}
                  >
                    <type.icon 
                      className="w-8 h-8 text-white group-hover:scale-125 transition-transform duration-300" 
                    />
                    
                    {/* Scanning Effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.3,
                        ease: "linear"
                      }}
                    />
                  </motion.div>

                  {/* Label */}
                  <motion.div
                    className="mt-6 text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.8 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-sm font-mono tracking-[0.2em] text-white/80 uppercase">
                      {type.label}
                    </span>
                    <div className="text-xs text-white/40 mt-1 font-mono">
                      PROTOCOL_ACTIVE
                    </div>
                  </motion.div>

                  {/* Floating Particles */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full opacity-40"
                      style={{
                        top: `${20 + Math.random() * 60}%`,
                        left: `${20 + Math.random() * 60}%`,
                      }}
                      animate={{
                        y: [0, -30, 0],
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1, 1.5, 1]
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </motion.div>
              ))}
            </motion.div>

            {/* Central Processing Hub */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 -z-10"
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 0.3, scale: 1 }}
              transition={{ duration: 1, delay: 1 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="w-full h-full border border-white/20 rounded-full"
                animate={{
                  rotateZ: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Brain className="w-8 h-8 text-white/60 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section - Artistic Conclusion */}
        <section 
          className="min-h-screen flex items-center justify-center px-6 relative" 
          data-section="3"
          data-testid="cta-section"
        >
          <div className="max-w-4xl mx-auto text-center relative">
            {/* Glitch Effect Title */}
            <motion.div
              className="relative mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <motion.h2
                className="text-6xl lg:text-8xl font-black leading-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
                animate={{
                  textShadow: [
                    '0 0 0 transparent',
                    '2px 0 0 #FF6B6B, -2px 0 0 #4ECDC4',
                    '0 0 0 transparent'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <span className="text-white">INIT</span>
                <span className="text-red-400">IATE</span>
                <br />
                <span className="text-cyan-400">CONN</span>
                <span className="text-blue-400">ECTION</span>
              </motion.h2>
              
              {/* Glitch Lines */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{
                  opacity: [0, 0.7, 0],
                  scaleX: [1, 1.02, 1]
                }}
                transition={{
                  duration: 0.1,
                  repeat: Infinity,
                  repeatDelay: 5,
                  times: [0, 0.5, 1]
                }}
              >
                <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-white opacity-50" />
                <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-cyan-400 opacity-50" />
              </motion.div>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="text-xl lg:text-2xl text-white/80 mb-16 tracking-[0.1em]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 0.8, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              viewport={{ once: true }}
            >
              ESTABLISH NEURAL LINK TO INFINITE KNOWLEDGE
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              className="flex flex-col lg:flex-row items-center justify-center gap-8 mb-16"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="relative group"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Button 
                  onClick={handleGetStarted}
                  className="bg-transparent border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-black px-16 py-6 text-xl font-light tracking-[0.2em] uppercase transition-all duration-500 relative overflow-hidden"
                  data-testid="cta-get-started"
                >
                  <motion.div
                    className="absolute inset-0 bg-red-400"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "0%" }}
                    transition={{ duration: 0.3 }}
                  />
                  <span className="relative z-10">ENGAGE_SYSTEM</span>
                </Button>
                
                {/* Pulse Ring */}
                <motion.div
                  className="absolute inset-0 border-2 border-red-400 pointer-events-none"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0, 0.5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              </motion.div>
            </motion.div>

            {/* System Status */}
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center opacity-60"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 0.6, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              viewport={{ once: true }}
            >
              {[
                { label: 'NEURAL_NODES', value: 'ACTIVE' },
                { label: 'SECURITY_LEVEL', value: 'MAXIMUM' },
                { label: 'PROCESSING_POWER', value: 'UNLIMITED' },
                { label: 'CONNECTION_STATUS', value: 'READY' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="border border-white/20 p-4 font-mono"
                  whileHover={{ 
                    borderColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][index],
                    backgroundColor: `${['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][index]}10`
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-xs tracking-[0.2em] mb-2 uppercase opacity-60">
                    {stat.label}
                  </div>
                  <div 
                    className="text-sm font-bold"
                    style={{ color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][index] }}
                  >
                    {stat.value}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Background Matrix Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-xs font-mono text-green-400"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [0, -50]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "linear"
                }}
              >
                {Math.random().toString(36).substr(2, 8).toUpperCase()}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer - Minimal System Info */}
        <footer className="px-6 lg:px-12 py-8 border-t border-white/10 bg-black/50 backdrop-blur-sm" data-testid="footer">
          <div className="flex flex-col sm:flex-row justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-4 sm:mb-0 font-mono">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-white/60 tracking-[0.2em] uppercase">
                KNOWLEDGEVAULT_SYSTEM_V2.5.0
              </span>
            </div>
            
            <div className="text-xs text-white/40 font-mono tracking-wider">
              © 2025 NEURAL_CORPORATION. ALL_RIGHTS_RESERVED.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;