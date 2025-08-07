import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import UploadZone from "@/components/UploadZone";
import KnowledgeCard from "@/components/KnowledgeCard";
import SearchModal from "@/components/SearchModal";
import UploadModal from "@/components/UploadModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { KnowledgeItemWithTags } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"card" | "list" | "categories">("card");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: knowledgeItems, isLoading, refetch } = useQuery<KnowledgeItemWithTags[]>({
    queryKey: ["/api/knowledge-items"],
  });

  const processTextMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/process-text", { content });
      return response.json();
    },
  });

  const createKnowledgeItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/knowledge-items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-items"] });
      refetch();
    },
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchModal(true);
  };

  const handleUploadSuccess = () => {
    refetch();
    setShowUploadModal(false);
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;

    // Check if it's a URL
    const urlRegex = /^(https?:\/\/)([\w-]+\.)+[\w-]+(\/[\w.\/-]*)?/;
    const isUrl = urlRegex.test(textContent.trim());

    setIsProcessing(true);
    try {
      if (isUrl) {
        // Process as link
        const response = await apiRequest("POST", "/api/process-link", { url: textContent.trim() });
        const { processedContent } = await response.json();
        
        const knowledgeItemData = {
          ...processedContent,
          content: textContent.trim(),
          type: "link",
          fileUrl: textContent.trim(),
          isProcessed: true,
          tags: processedContent.tags,
        };

        await createKnowledgeItemMutation.mutateAsync(knowledgeItemData);
        
        toast({
          title: "Link saved! 🔗",
          description: "Your link has been added to your knowledge vault.",
        });
      } else {
        // Process as text
        const { processedContent } = await processTextMutation.mutateAsync(textContent);
        
        const knowledgeItemData = {
          ...processedContent,
          content: textContent,
          type: "text",
          isProcessed: true,
          tags: processedContent.tags,
        };

        await createKnowledgeItemMutation.mutateAsync(knowledgeItemData);
        
        toast({
          title: "Text added! 📝",
          description: "Your text has been processed and added to your vault.",
        });
      }
      
      setTextContent("");
    } catch (error) {
      toast({
        title: "Oops! Something went wrong",
        description: "Failed to process your content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Simplified background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
      </div>
      
      <Navigation onSearch={handleSearch} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Hero Input Area */}
        <div className="mb-12">
          <div className="floating-card bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-0 p-8 backdrop-blur-xl relative overflow-hidden">
            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/3 via-blue-500/3 to-cyan-500/3 rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl floating-icon relative">
                  <i className="fas fa-sparkles text-3xl text-white"></i>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-plus text-white text-xs"></i>
                  </div>
                </div>
                <h1 className="text-4xl font-bold gradient-text mb-3">
                  Build Your Knowledge Universe
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                  🌟 Drop anything, discover everything
                </p>
              </div>
            
            {/* Innovative Drop Zone */}
            <div className="relative">
              <div className="min-h-60 border-3 border-dashed border-gray-300 dark:border-gray-600 rounded-3xl p-10 text-center hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-500 bg-gray-50/80 dark:bg-gray-800/80 cursor-pointer group relative overflow-hidden"
                   onDrop={(e) => {
                     e.preventDefault();
                     const files = Array.from(e.dataTransfer.files);
                     if (files.length > 0) {
                       setShowUploadModal(true);
                     }
                   }}
                   onDragOver={(e) => e.preventDefault()}
                   onDragEnter={(e) => e.preventDefault()}
                   onClick={() => setShowUploadModal(true)}
              >
                {/* Simplified background pattern */}
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="absolute top-4 left-4 w-8 h-8 border-2 border-purple-400 rounded-lg"></div>
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-2 border-blue-400 rounded-full"></div>
                </div>
                
                <div className="relative z-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center p-6 rounded-2xl morphism-button group-hover:scale-105 transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl group-hover:shadow-2xl transition-shadow">
                        <i className="fas fa-cloud-upload-alt text-white text-xl"></i>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">📁 Files & Docs</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">PDF, Images, Audio, Video</p>
                    </div>
                    
                    <div className="flex flex-col items-center p-6 rounded-2xl morphism-button group-hover:scale-105 transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl group-hover:shadow-2xl transition-shadow">
                        <i className="fas fa-pen-fancy text-white text-xl"></i>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">✍️ Text & Notes</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ideas, articles, thoughts</p>
                    </div>
                    
                    <div className="flex flex-col items-center p-6 rounded-2xl morphism-button group-hover:scale-105 transition-all duration-300">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl group-hover:shadow-2xl transition-shadow">
                        <i className="fas fa-globe-americas text-white text-xl"></i>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">🌐 Web Content</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Links, videos, articles</p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text mb-2">✨ Drag & Drop Magic ✨</p>
                    <p className="text-base text-gray-600 dark:text-gray-300">AI will instantly analyze and organize everything for you</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Advanced Chat Input */}
            <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-600">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="✨ Share your thoughts, paste a link, or describe what you want to save...\n\nI'll use AI to understand and organize it perfectly! 🤖"
                    className="min-h-32 resize-none bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 text-base p-4"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        if (textContent.trim()) {
                          handleTextSubmit();
                        }
                      }
                    }}
                  />
                  {/* Floating character count */}
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg">
                    {textContent.length} chars
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim() || isProcessing}
                    className="morphism-button bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl px-8 py-4 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-semibold"
                    size="lg"
                  >
                    {isProcessing ? (
                      <div className="flex items-center space-x-2">
                        <div className="pulse-loader w-4 h-4"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-rocket"></i>
                        <span>Launch</span>
                      </div>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => setShowUploadModal(true)}
                    className="morphism-button border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 rounded-2xl px-8 py-4 transform hover:scale-105 transition-all duration-300 font-semibold"
                    size="lg"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    More Options
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-5 text-sm">
                <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                  <span className="flex items-center">
                    <i className="fas fa-keyboard mr-1"></i>
                    Cmd/Ctrl + Enter to send
                  </span>
                  <span className="flex items-center">
                    <i className="fas fa-brain mr-1 text-purple-500"></i>
                    AI-powered organization
                  </span>
                </div>
                
                <Button 
                  variant="ghost"
                  onClick={() => setShowSearchModal(true)}
                  className="morphism-button hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium px-4 py-2 rounded-xl"
                >
                  <i className="fas fa-search mr-2"></i>
                  Search Knowledge
                </Button>
              </div>
            </div>
            </div>
          </div>
        </div>
        
        {/* Knowledge Items Header */}
        {knowledgeItems && knowledgeItems.length > 0 && (
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold gradient-text">Your Knowledge Universe</h2>
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 font-semibold px-4 py-2 rounded-full shadow-lg">
                🎆 {knowledgeItems.length} {knowledgeItems.length === 1 ? 'item' : 'items'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Enhanced Quick Search */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="🔍 Discover knowledge..."
                  className="w-72 pl-12 pr-4 py-3 morphism-button border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 text-base font-medium"
                  onFocus={() => setShowSearchModal(true)}
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <i className="fas fa-search text-purple-500 text-lg"></i>
                </div>
              </div>
              
              {/* Modern View Toggle */}
              <div className="flex morphism-button border border-gray-200 dark:border-gray-600 rounded-2xl p-1 shadow-lg">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                    viewMode === "card" 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <i className="fas fa-th mr-2"></i>
                  Masonry
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                    viewMode === "list" 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <i className="fas fa-list mr-2"></i>
                  List
                </Button>
                <Button
                  variant={viewMode === "categories" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("categories")}
                  className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                    viewMode === "categories" 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <i className="fas fa-layer-group mr-2"></i>
                  Categories
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Display */}
        {isLoading ? (
          <div className="masonry-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="masonry-item floating-card bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-4 border-0" style={{height: `${200 + Math.random() * 200}px`} as React.CSSProperties}>
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-1/2 rounded-lg" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : knowledgeItems && knowledgeItems.length > 0 ? (
          viewMode === "categories" ? (
            <CategorizedView 
              items={knowledgeItems}
              expandedCategories={expandedCategories}
              setExpandedCategories={setExpandedCategories}
              onUpdate={refetch}
            />
          ) : (
            <div className={viewMode === "card" ? "masonry-grid" : "space-y-4"}>
              {knowledgeItems.map((item, index) => (
                <KnowledgeCard 
                  key={item.id} 
                  item={item} 
                  viewMode={viewMode}
                  onUpdate={refetch}
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <div className="max-w-lg mx-auto">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-3xl flex items-center justify-center mx-auto relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-blue-400/20 animate-pulse"></div>
                  <i className="fas fa-rocket text-6xl text-purple-600 dark:text-purple-400 relative z-10"></i>
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center animate-bounce">
                  <i className="fas fa-sparkles text-white text-2xl"></i>
                </div>
              </div>
              
              <h3 className="text-3xl font-bold gradient-text mb-4">
                Ready to Launch Your Knowledge? 🚀
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                Drop files, share links, or type thoughts above to get started!
              </p>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                ✨ AI will organize everything automatically ✨
              </p>
            </div>
          </div>
        )}
        
        {/* Modals */}
        <SearchModal 
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          initialQuery={searchQuery}
        />
        
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      </div>
    </div>
  );
}

// Categorized View Component
interface CategorizedViewProps {
  items: KnowledgeItemWithTags[];
  expandedCategories: Set<string>;
  setExpandedCategories: (categories: Set<string>) => void;
  onUpdate: () => void;
}

function CategorizedView({ items, expandedCategories, setExpandedCategories, onUpdate }: CategorizedViewProps) {
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group items by content type
  const itemsByType = items.reduce((acc, item) => {
    const type = item.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, KnowledgeItemWithTags[]>);

  // Group items by category (extracted from metadata or default based on type)
  const itemsByCategory = items.reduce((acc, item) => {
    let category = 'Uncategorized';
    
    // Try to get category from metadata first
    if (item.metadata && typeof item.metadata === 'object') {
      const metadata = item.metadata as any;
      if (metadata.category) {
        category = metadata.category;
      }
    }
    
    // Fallback to type-based categorization
    if (category === 'Uncategorized') {
      switch (item.type) {
        case 'document': category = 'Documents'; break;
        case 'image': category = 'Images'; break;
        case 'audio': category = 'Audio'; break;
        case 'video': category = 'Videos'; break;
        case 'link': category = 'Web Content'; break;
        case 'text': category = 'Notes'; break;
        default: category = 'Other';
      }
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, KnowledgeItemWithTags[]>);

  // Group items by tags
  const itemsByTag = items.reduce((acc, item) => {
    item.knowledgeItemTags.forEach(tagItem => {
      const tagName = tagItem.tag.name;
      if (!acc[tagName]) acc[tagName] = [];
      acc[tagName].push(item);
    });
    return acc;
  }, {} as Record<string, KnowledgeItemWithTags[]>);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return 'fas fa-file-alt text-blue-600';
      case 'image': return 'fas fa-image text-green-600';
      case 'audio': return 'fas fa-headphones text-purple-600';
      case 'video': return 'fas fa-video text-red-600';
      case 'link': return 'fas fa-link text-cyan-600';
      case 'text': return 'fas fa-sticky-note text-yellow-600';
      default: return 'fas fa-file text-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'document': return 'Documents';
      case 'image': return 'Images';
      case 'audio': return 'Audio';
      case 'video': return 'Videos';
      case 'link': return 'Links';
      case 'text': return 'Notes';
      default: return 'Other';
    }
  };

  return (
    <div className="space-y-8">
      {/* Content Types Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <i className="fas fa-layer-group mr-2 text-blue-600"></i>
          By Content Type
        </h3>
        <div className="space-y-4">
          {Object.entries(itemsByType).map(([type, typeItems]) => {
            const categoryKey = `type-${type}`;
            const isExpanded = expandedCategories.has(categoryKey);
            
            return (
              <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <i className={`${getTypeIcon(type)} text-lg`}></i>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getTypeLabel(type)}
                    </span>
                    <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-600">
                      {typeItems.length}
                    </Badge>
                  </div>
                  <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400`}></i>
                </button>
                
                {isExpanded && (
                  <div className="p-4 bg-white dark:bg-gray-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {typeItems.map((item) => (
                        <KnowledgeCard 
                          key={item.id} 
                          item={item} 
                          viewMode="card"
                          onUpdate={onUpdate}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Categories Section */}
      {Object.keys(itemsByCategory).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <i className="fas fa-folder mr-2 text-orange-600"></i>
            By Category
          </h3>
          <div className="space-y-4">
            {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
              const categoryKey = `category-${category}`;
              const isExpanded = expandedCategories.has(categoryKey);
              
              return (
                <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(categoryKey)}
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-folder text-lg text-orange-600"></i>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category}
                      </span>
                      <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-600">
                        {categoryItems.length}
                      </Badge>
                    </div>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400`}></i>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 bg-white dark:bg-gray-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryItems.map((item) => (
                          <KnowledgeCard 
                            key={item.id} 
                            item={item} 
                            viewMode="card"
                            onUpdate={onUpdate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags Section */}
      {Object.keys(itemsByTag).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <i className="fas fa-tags mr-2 text-purple-600"></i>
            By Tags
          </h3>
          <div className="space-y-4">
            {Object.entries(itemsByTag).map(([tag, tagItems]) => {
              const tagKey = `tag-${tag}`;
              const isExpanded = expandedCategories.has(tagKey);
              
              return (
                <div key={tag} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(tagKey)}
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-tag text-lg text-purple-600"></i>
                      <span className="font-medium text-gray-900 dark:text-white">
                        #{tag}
                      </span>
                      <Badge variant="secondary" className="bg-gray-200 dark:bg-gray-600">
                        {tagItems.length}
                      </Badge>
                    </div>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-gray-400`}></i>
                  </button>
                  
                  {isExpanded && (
                    <div className="p-4 bg-white dark:bg-gray-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tagItems.map((item) => (
                          <KnowledgeCard 
                            key={item.id} 
                            item={item} 
                            viewMode="card"
                            onUpdate={onUpdate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
