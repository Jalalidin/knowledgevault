import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import UploadZone from "@/components/UploadZone";
import KnowledgeCard from "@/components/KnowledgeCard";
import SearchModal from "@/components/SearchModal";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const getFileType = (mimeType?: string): string => {
    if (!mimeType) return "document";
    
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.includes("pdf") || mimeType.includes("document")) return "document";
    if (mimeType.startsWith("text/")) return "text";
    
    return "document";
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      for (const file of Array.from(files)) {
        let processedContent;
        
        // Process file with AI before uploading (for images)
        if (file.type.startsWith("image/")) {
          try {
            // Convert image to base64 for AI processing
            const base64Image = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1]; // Remove data:image/...;base64, prefix
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            
            // Process image with AI
            const aiResponse = await apiRequest("POST", "/api/process-image", {
              base64Image,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type
            });
            
            const aiResult = await aiResponse.json();
            processedContent = aiResult;
          } catch (aiError) {
            console.error("AI processing failed:", aiError);
            // Fallback to basic processing
            processedContent = {
              title: file.name,
              summary: `Image file: ${file.name}`,
              tags: ["image", "upload"],
              category: "Images"
            };
          }
        } else {
          // For non-image files, use basic processing
          processedContent = {
            title: file.name,
            summary: `Uploaded file: ${file.name}`,
            tags: ["upload"],
            category: getFileType(file.type) === "document" ? "Documents" : "Files"
          };
        }
        
        // Get upload URL
        const uploadResponse = await apiRequest("POST", "/api/objects/upload");
        const { uploadURL } = await uploadResponse.json();

        // Upload file to cloud storage
        const uploadFileResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadFileResponse.ok) {
          throw new Error("Failed to upload file");
        }

        // Set object ACL after successful upload
        const aclResponse = await apiRequest("POST", "/api/set-object-acl", {
          objectURL: uploadURL
        });
        
        const { objectPath } = await aclResponse.json();
        
        // Create enhanced knowledge item with AI-processed data
        const knowledgeItemData = {
          title: processedContent.title,
          summary: processedContent.summary,
          content: file.type.startsWith("text/") ? "" : processedContent.summary,
          type: getFileType(file.type),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileUrl: uploadURL,
          objectPath: objectPath,
          isProcessed: true,
          tags: processedContent.tags || ["upload"],
          metadata: {
            category: processedContent.category,
            thumbnailUrl: file.type.startsWith("image/") ? objectPath : undefined,
            analyzed: true,
            processingState: 'completed',
            ...(processedContent.metadata || {})
          }
        };

        await createKnowledgeItemMutation.mutateAsync(knowledgeItemData);
      }
      
      toast({
        title: files.length === 1 ? "File processed! 🧠" : `${files.length} files processed! 🧠`,
        description: "Your files have been uploaded and analyzed with AI.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload and process files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      
      <Navigation onSearch={handleSearch} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clean Hero Section */}
        <div className="mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-brain text-white text-2xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Knowledge Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Upload, organize, and search your content with AI
              </p>
            </div>
            
            {/* Clean Upload Zone */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
              />
              <div className={`min-h-32 border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer group ${
                isDragOver 
                  ? "border-primary bg-primary/5 dark:bg-primary/10" 
                  : isProcessing
                  ? "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-wait"
                  : "border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary bg-gray-50 dark:bg-gray-800/50"
              }`}
                   onDrop={handleDrop}
                   onDragOver={handleDragOver}
                   onDragLeave={handleDragLeave}
                   onClick={isProcessing ? undefined : handleFileSelect}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="flex flex-col items-center p-4 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-w-xs">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-3">
                        <i className="fas fa-cloud-upload-alt text-white text-lg"></i>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">Files & Documents</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">PDF, Images, Audio, Video</p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    {isProcessing ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-base font-medium text-gray-900 dark:text-white">Processing files...</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">AI is analyzing your content</p>
                      </div>
                    ) : isDragOver ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center">
                          <i className="fas fa-cloud-upload-alt text-white text-xl"></i>
                        </div>
                        <p className="text-base font-medium text-primary">Drop files to upload</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Release to start processing</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-base font-medium text-gray-900 dark:text-white mb-1">Drag & Drop Files Here</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Or click to browse and select files</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">AI will automatically analyze and organize your content</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Clean Text Input */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Textarea
                    placeholder="Enter text content, paste a link, or describe what you want to save..."
                    className="min-h-24 resize-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary p-3"
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
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={handleTextSubmit}
                    disabled={!textContent.trim() || isProcessing}
                    className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-2"
                  >
                    {isProcessing ? (
                      <div className="flex items-center space-x-2">
                        <div className="spinner w-4 h-4"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-plus"></i>
                        <span>Add</span>
                      </div>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleFileSelect}
                    variant="outline"
                    className="rounded-lg px-6 py-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-upload mr-2"></i>
                        Upload Files
                      </>
                    )}
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
                    <i className="fas fa-brain mr-1 text-primary"></i>
                    AI-powered
                  </span>
                </div>
                
                <Button 
                  variant="ghost"
                  onClick={() => setShowSearchModal(true)}
                  className="text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg"
                >
                  <i className="fas fa-search mr-2"></i>
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Knowledge Items Header */}
        {knowledgeItems && knowledgeItems.length > 0 && (
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Knowledge Base</h2>
              <Badge variant="secondary" className="font-medium px-3 py-1">
                {knowledgeItems.length} {knowledgeItems.length === 1 ? 'item' : 'items'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Clean Quick Search */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search knowledge..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  onFocus={() => setShowSearchModal(true)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <i className="fas fa-search text-gray-400 text-sm"></i>
                </div>
              </div>
              
              {/* Clean View Toggle */}
              <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className={`px-3 py-1 rounded-md ${
                    viewMode === "card" 
                      ? "bg-primary text-white" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <i className="fas fa-th mr-2"></i>
                  Masonry
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1 rounded-md ${
                    viewMode === "list" 
                      ? "bg-primary text-white" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <i className="fas fa-list mr-2"></i>
                  List
                </Button>
                <Button
                  variant={viewMode === "categories" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("categories")}
                  className={`px-3 py-1 rounded-md ${
                    viewMode === "categories" 
                      ? "bg-primary text-white" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
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
              <div key={i} className="masonry-item bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4" style={{height: `${200 + Math.random() * 200}px`} as React.CSSProperties}>
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
                <div className="flex space-x-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
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
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-database text-3xl text-gray-400"></i>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                No Content Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Start building your knowledge base by adding content above.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload files, add text, or paste links to get started.
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
