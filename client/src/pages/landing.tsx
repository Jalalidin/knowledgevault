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
      title: "Smart Upload",
      description: "Drag & drop any file type - PDFs, images, videos, links. Our AI automatically extracts content, generates summaries, and organizes everything intelligently.",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      icon: Search,
      title: "Natural Search", 
      description: "Find anything instantly with natural language. Ask questions like 'my contract from last month' or 'photos from vacation' and get exactly what you need.",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your documents are encrypted end-to-end. Only you can access your knowledge vault. We never read, analyze, or share your personal information.",
      color: "from-purple-500 to-purple-600", 
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
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
      className="min-h-screen bg-white text-gray-900 overflow-hidden relative" 
      data-testid="landing-page"
      style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(34, 197, 94, 0.05) 0%, transparent 50%),
          linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)
        `
      }}
    >
      {/* Dynamic Cursor Follower */}
      <motion.div
        className="fixed top-0 left-0 w-6 h-6 pointer-events-none z-50"
        style={{
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%"
        }}
      >
        <div className="w-full h-full bg-blue-500/20 rounded-full backdrop-blur-sm" />
      </motion.div>

      {/* Subtle Background Elements */}
      <motion.div
        style={{ y: y1, rotate: rotate1 }}
        className="absolute top-20 left-20 w-32 h-32 opacity-5"
        animate={{
          scale: [1, 1.1, 1],
          rotateZ: [0, 360]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <FileText className="w-full h-full text-blue-500" />
      </motion.div>
      
      <motion.div
        style={{ y: y2, rotate: rotate2 }}
        className="absolute top-40 right-10 w-24 h-24 opacity-5"
        animate={{
          scale: [1.1, 0.9, 1.1],
          rotateZ: [360, 0]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Image className="w-full h-full text-purple-500" />
      </motion.div>

      <motion.div
        style={{ y: y3 }}
        className="absolute bottom-20 left-1/2 w-28 h-28 opacity-5"
        animate={{
          rotateZ: [0, 180, 360],
          scale: [0.9, 1.1, 0.9]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Upload className="w-full h-full text-green-500" />
      </motion.div>

      {/* Floating Document Icons */}
      {[FileText, Image, Video, Volume2, ExternalLink].map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute opacity-5"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${10 + Math.random() * 80}%`,
            width: `${16 + Math.random() * 24}px`,
            height: `${16 + Math.random() * 24}px`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, Math.random() * 25 - 12.5, 0],
            rotate: [0, 180, 360],
            opacity: [0.05, 0.15, 0.05]
          }}
          transition={{
            duration: 8 + Math.random() * 8,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut"
          }}
        >
          <Icon className="w-full h-full text-blue-500" />
        </motion.div>
      ))}

      <div className="relative z-10">
        {/* Clean Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 p-6 lg:px-12">
          <motion.div 
            className="flex items-center justify-between max-w-7xl mx-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.div 
              className="flex items-center gap-3"
              data-testid="logo"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"
                animate={{ 
                  rotateZ: isPlaying ? [0, 360] : 0,
                }}
                transition={{ 
                  duration: 20, 
                  repeat: isPlaying ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <Brain className="w-5 h-5 text-white" />
              </motion.div>
              
              <div className="text-left">
                <h1 className="text-xl font-bold text-gray-900">
                  KnowledgeVault
                </h1>
                <div className="text-xs text-gray-500">
                  Document Intelligence
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-center gap-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Button 
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all duration-300"
                data-testid="nav-get-started"
              >
                Get Started
              </Button>
            </motion.div>
          </motion.div>
        </nav>

        {/* Hero Section - Clean & Clear */}
        <section 
          className="min-h-screen flex items-center justify-center px-6 relative pt-20"
          data-section="0"
        >
          <div className="max-w-7xl mx-auto text-center relative">
            
            {/* Main Title */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.h1 
                className="text-5xl lg:text-7xl font-bold leading-tight text-gray-900 mb-4"
                data-testid="hero-title"
              >
                Your Personal
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Knowledge Vault
                </span>
              </motion.h1>
              
              <motion.p
                className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                data-testid="hero-description"
              >
                Store, organize, and instantly find any document, image, video, or link with AI-powered search and automatic categorization.
              </motion.p>
            </motion.div>

            {/* Visual Demo */}
            <motion.div
              className="mb-12 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { icon: FileText, label: "Documents", count: "1,247", color: "text-blue-500 bg-blue-50" },
                    { icon: Image, label: "Images", count: "856", color: "text-green-500 bg-green-50" },
                    { icon: Video, label: "Videos", count: "124", color: "text-purple-500 bg-purple-50" },
                    { icon: ExternalLink, label: "Links", count: "432", color: "text-orange-500 bg-orange-50" }
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className={`w-16 h-16 mx-auto mb-3 rounded-xl ${item.color} flex items-center justify-center`}>
                        <item.icon className="w-8 h-8" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">{item.count}</div>
                      <div className="text-sm text-gray-600">{item.label}</div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Search className="w-4 h-4" />
                    <span className="italic">"Find my presentation about quarterly results"</span>
                    <Sparkles className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="hero-get-started"
              >
                Start Organizing
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-4 text-lg border-2 border-gray-300 hover:border-gray-400 rounded-xl transition-all duration-300"
                onClick={handleTryDemo}
                data-testid="hero-demo"
              >
                <MessageSquare className="mr-2 w-5 h-5" />
                Try Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div 
              className="flex justify-center gap-8 lg:gap-16 text-center opacity-60"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              data-testid="hero-stats"
            >
              <div>
                <div className="text-2xl font-bold text-blue-600">50+</div>
                <div className="text-sm text-gray-600">File Types</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">∞</div>
                <div className="text-sm text-gray-600">Storage</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600">Private</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - Clean & Functional */}
        <section 
          className="py-20 px-6 lg:px-12 bg-gray-50" 
          data-section="1"
          data-testid="features-section"
        >
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                From simple file storage to AI-powered organization, KnowledgeVault adapts to how you work
              </p>
            </motion.div>

            {/* Features Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group"
                  data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full border border-gray-100">
                    <motion.div 
                      className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
                    </motion.div>
                    
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">
                      {feature.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* File Types Section - Clear & Visual */}
        <section 
          className="py-20 px-6 lg:px-12" 
          data-section="2"
          data-testid="file-types-section"
        >
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
                Works With Everything
              </h3>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Upload any file type and KnowledgeVault will automatically understand, organize, and make it searchable
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {fileTypes.map((type, index) => (
                <motion.div
                  key={type.label}
                  className="text-center group cursor-pointer"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1
                  }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  data-testid={`file-type-${type.label.toLowerCase()}`}
                >
                  <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-gray-100">
                    <type.icon className={`w-10 h-10 ${type.color} group-hover:scale-110 transition-transform duration-300`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                    {type.label}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Auto-indexed
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Demo Search */}
            <motion.div
              className="mt-16 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4 text-gray-500">
                  <Search className="w-5 h-5" />
                  <span className="text-sm font-medium">Example natural language searches:</span>
                </div>
                <div className="space-y-2">
                  {[
                    "Show me vacation photos from last summer",
                    "Find my tax documents from 2024",
                    "Videos about machine learning",
                    "Articles I saved about productivity"
                  ].map((query, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="italic">"{query}"</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section - Clean & Compelling */}
        <section 
          className="py-20 px-6 lg:px-12 bg-gradient-to-br from-blue-50 to-indigo-100" 
          data-section="3"
          data-testid="cta-section"
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Ready to Transform Your Digital Life?
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Join thousands of professionals who have revolutionized how they organize and access their knowledge with AI-powered search and automatic organization.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  data-testid="cta-get-started"
                >
                  Start for Free
                  <Zap className="ml-2 w-5 h-5" />
                </Button>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-green-600" />
                    No credit card required
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-green-600" />
                    Free forever plan
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">50+</div>
                  <div className="text-sm text-gray-600">File Types Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">AES-256</div>
                  <div className="text-sm text-gray-600">Encryption</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">∞</div>
                  <div className="text-sm text-gray-600">Storage</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer - Clean & Professional */}
        <footer className="px-6 lg:px-12 py-8 border-t border-gray-200 bg-white" data-testid="footer">
          <div className="flex flex-col sm:flex-row justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-4 sm:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">KnowledgeVault</span>
            </div>
            
            <div className="text-sm text-gray-600">
              © 2025 KnowledgeVault. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;