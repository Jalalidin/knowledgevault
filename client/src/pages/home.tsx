import { useState } from "react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation onSearch={handleSearch} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chat-like Input Area */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="fas fa-brain text-2xl text-white"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What would you like to add to your vault?
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Drop files, paste text, or share links - I'll organize everything for you
              </p>
            </div>
            
            {/* Drop Zone */}
            <div className="relative">
              <div className="min-h-48 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 bg-gradient-to-br from-gray-50/50 to-blue-50/30 dark:from-slate-700/50 dark:to-slate-600/30"
                   onDrop={(e) => {
                     e.preventDefault();
                     // Handle file drop
                     const files = Array.from(e.dataTransfer.files);
                     if (files.length > 0) {
                       setShowUploadModal(true);
                     }
                   }}
                   onDragOver={(e) => e.preventDefault()}
                   onDragEnter={(e) => e.preventDefault()}
                   onClick={() => setShowUploadModal(true)}
                   className="cursor-pointer group"
              >
                <div className="space-y-6">
                  <div className="flex justify-center space-x-8">
                    <div className="flex flex-col items-center p-4 rounded-xl bg-white/50 dark:bg-slate-700/50 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                        <i className="fas fa-upload text-white"></i>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drop Files</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">or click to browse</p>
                    </div>
                    
                    <div className="flex flex-col items-center p-4 rounded-xl bg-white/50 dark:bg-slate-700/50 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                        <i className="fas fa-keyboard text-white"></i>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Paste Text</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ctrl+V anywhere</p>
                    </div>
                    
                    <div className="flex flex-col items-center p-4 rounded-xl bg-white/50 dark:bg-slate-700/50 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                        <i className="fas fa-link text-white"></i>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Share Links</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">paste any URL</p>
                    </div>
                  </div>
                  
                  <div className="text-gray-500 dark:text-gray-400">
                    <p className="text-lg font-medium mb-2">👋 Just drop it here!</p>
                    <p className="text-sm">Supports: Documents • Images • Audio • Video • Links • Text</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chat-like Input */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-600">
              <div className="flex gap-3">
                <Textarea
                  placeholder="💭 Type your thoughts, paste text, or drop a link here...\n\nOr just drag and drop files above! I'll help organize everything for you."
                  className="flex-1 min-h-24 resize-none bg-gray-50 dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-base"
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
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim() || isProcessing}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 shadow-md"
                  >
                    {isProcessing ? (
                      <div className="spinner w-4 h-4"></div>
                    ) : (
                      <i className="fas fa-arrow-right"></i>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowUploadModal(true)}
                    className="border border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl px-6 py-3"
                  >
                    <i className="fas fa-paperclip"></i>
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 text-sm text-gray-500 dark:text-gray-400">
                <span>📝 Cmd/Ctrl + Enter to send</span>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearchModal(true)}
                  className="text-xs hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <i className="fas fa-search mr-1"></i>
                  Search vault
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Knowledge Items Header */}
        {knowledgeItems && knowledgeItems.length > 0 && (
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Knowledge</h2>
              <Badge variant="secondary" className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                {knowledgeItems.length} items
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Quick Search */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Quick search..."
                  className="w-64 pl-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500/20"
                  onFocus={() => setShowSearchModal(true)}
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className="px-3 py-2 text-sm"
                >
                  <i className="fas fa-th"></i>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="px-3 py-2 text-sm"
                >
                  <i className="fas fa-list"></i>
                </Button>
                <Button
                  variant={viewMode === "categories" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("categories")}
                  className="px-3 py-2 text-sm"
                >
                  <i className="fas fa-folder"></i>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full rounded-lg" />
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
            <div className={viewMode === "card" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 knowledge-grid" 
              : "space-y-6"
            }>
              {knowledgeItems.map((item) => (
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
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-arrow-up text-3xl text-gray-400 dark:text-slate-400"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Start by dropping something above! ☝️
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your knowledge items will appear here once you add them.
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

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
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
