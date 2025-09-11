import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import SearchModal from "@/components/SearchModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  MessageSquare, 
  FileText, 
  Image, 
  Link, 
  AudioWaveform, 
  Video,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  Clock,
  Plus,
  CheckSquare,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { KnowledgeItemWithTags } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // UI State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "type">("recent");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Upload State
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<Record<string, "uploading" | "processing" | "ready">>({});
  const [textContent, setTextContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch knowledge items
  const { data: knowledgeItems = [], isLoading, refetch } = useQuery<KnowledgeItemWithTags[]>({
    queryKey: ["/api/knowledge-items"],
  });

  // Process text mutation
  const processTextMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/process-text", { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-items"] });
      setTextContent("");
      toast({ title: "Text processed successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to process text", variant: "destructive" });
    }
  });

  // Create knowledge item mutation
  const createKnowledgeItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/knowledge-items", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-items"] });
      setProcessingStatus(prev => ({ ...prev, [data.id]: "ready" }));
      refetch();
    },
  });

  // Delete knowledge item mutation
  const deleteKnowledgeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/knowledge-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-items"] });
      toast({ title: "Item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete item", variant: "destructive" });
    }
  });

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchModal(true);
  };

  // Handle file type detection
  const getFileType = (mimeType?: string): string => {
    if (!mimeType) return "document";
    
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.includes("pdf") || mimeType.includes("document")) return "document";
    if (mimeType.startsWith("text/")) return "text";
    
    return "document";
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    
    try {
      for (const file of Array.from(files)) {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        setProcessingStatus(prev => ({ ...prev, [tempId]: "uploading" }));

        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();
        
        setProcessingStatus(prev => ({ ...prev, [tempId]: "processing" }));

        // Create knowledge item
        const itemData = {
          title: file.name,
          type: getFileType(file.type),
          fileUrl: result.url,
          metadata: {
            originalName: file.name,
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
          },
        };

        await createKnowledgeItemMutation.mutateAsync(itemData);
        
        delete processingStatus[tempId];
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle text processing
  const handleTextProcess = async () => {
    if (!textContent.trim()) return;
    processTextMutation.mutate(textContent.trim());
  };

  // Handle drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files) handleFileUpload(files);
  };

  // Handle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(filteredAndSortedItems.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Chat with selected items
  const handleChatWithSelection = () => {
    if (selectedItems.size === 0) {
      toast({ title: "Please select items to chat with", variant: "destructive" });
      return;
    }
    
    // Navigate to chat with selected items as context
    const itemIds = Array.from(selectedItems).join(',');
    setLocation(`/chat?context=${encodeURIComponent(itemIds)}`);
  };

  // Ask about single item
  const handleAskAboutItem = (itemId: string) => {
    setLocation(`/chat?context=${encodeURIComponent(itemId)}`);
  };

  // Filter and sort items
  const filteredAndSortedItems = knowledgeItems
    .filter(item => {
      if (filterType === "all") return true;
      return item.type === filterType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "type":
          return a.type.localeCompare(b.type);
        case "recent":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

  // Get type icon
  const getTypeIcon = (type: string, className = "h-4 w-4") => {
    switch (type) {
      case "text": return <FileText className={className} />;
      case "image": return <Image className={className} />;
      case "audio": return <AudioWaveform className={className} />;
      case "video": return <Video className={className} />;
      case "link": return <Link className={className} />;
      default: return <FileText className={className} />;
    }
  };

  // Get processing status badge
  const getStatusBadge = (item: KnowledgeItemWithTags) => {
    const status = processingStatus[item.id];
    if (status) {
      const statusConfig = {
        uploading: { color: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" />, text: "Uploading" },
        processing: { color: "secondary", icon: <Clock className="h-3 w-3" />, text: "Processing" },
        ready: { color: "default", icon: <CheckCircle className="h-3 w-3" />, text: "Ready" },
      };
      const config = statusConfig[status];
      return (
        <Badge variant={config.color as any} className="text-xs">
          {config.icon}
          <span className="ml-1">{config.text}</span>
        </Badge>
      );
    }
    
    return (
      <Badge variant={item.isProcessed ? "default" : "secondary"} className="text-xs">
        {item.isProcessed ? (
          <>
            <CheckCircle className="h-3 w-3" />
            <span className="ml-1">Ready</span>
          </>
        ) : (
          <>
            <Clock className="h-3 w-3" />
            <span className="ml-1">Processing</span>
          </>
        )}
      </Badge>
    );
  };

  const uniqueTypes = Array.from(new Set(knowledgeItems.map(item => item.type)));

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="page-title">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground">
            Upload, organize, and chat with your knowledge using AI
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8" data-testid="upload-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Add Knowledge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="upload-zone"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Upload Files</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports: Images, Documents, Audio, Video, Text files
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                data-testid="button-browse-files"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                data-testid="file-input"
              />
            </div>

            <Separator />

            {/* Text Input */}
            <div className="space-y-4">
              <h4 className="font-medium">Add Text Content</h4>
              <Textarea
                placeholder="Paste or type text content here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[120px]"
                data-testid="textarea-content"
              />
              <Button
                onClick={handleTextProcess}
                disabled={!textContent.trim() || processTextMutation.isPending}
                data-testid="button-process-text"
              >
                {processTextMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Text
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Controls & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Select value={sortBy} onValueChange={(value: "recent" | "title" | "type") => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && (
              <>
                <Badge variant="secondary" className="px-3 py-1">
                  {selectedItems.size} selected
                </Badge>
                <Button
                  onClick={handleChatWithSelection}
                  size="sm"
                  data-testid="button-chat-with-selection"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat with Selection
                </Button>
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  data-testid="button-clear-selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {knowledgeItems.length > 0 && selectedItems.size === 0 && (
              <Button
                onClick={selectAllItems}
                variant="outline"
                size="sm"
                data-testid="button-select-all"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </Button>
            )}
          </div>
        </div>

        {/* Knowledge Items */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-16" data-testid="empty-state">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No knowledge items yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload files or add text content to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedItems.map((item) => (
                <Card
                  key={item.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${
                    selectedItems.has(item.id) 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  }`}
                  data-testid={`knowledge-item-${item.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`checkbox-${item.id}`}
                        />
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(item)}
                      </div>
                    </div>
                    <CardTitle className="text-base truncate" title={item.title}>
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {item.summary && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {item.summary}
                      </p>
                    )}
                    
                    {/* Tags */}
                    {item.knowledgeItemTags && item.knowledgeItemTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {item.knowledgeItemTags.slice(0, 3).map((tagRel) => (
                          <Badge key={tagRel.tag.id} variant="outline" className="text-xs">
                            {tagRel.tag.name}
                          </Badge>
                        ))}
                        {item.knowledgeItemTags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.knowledgeItemTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAboutItem(item.id);
                        }}
                        size="sm"
                        disabled={!item.isProcessed}
                        data-testid={`button-ask-about-${item.id}`}
                      >
                        <MessageSquare className="h-3 w-3 mr-2" />
                        Ask about this
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle view/edit
                          }}
                          data-testid={`button-view-${item.id}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteKnowledgeItemMutation.mutate(item.id);
                          }}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {item.createdAt && new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        initialQuery={searchQuery}
      />
    </div>
  );
}