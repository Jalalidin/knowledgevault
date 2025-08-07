import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ContentSummaryModal from "@/components/ContentSummaryModal";
import type { KnowledgeItemWithTags } from "@shared/schema";

interface KnowledgeCardProps {
  item: KnowledgeItemWithTags;
  viewMode: "card" | "list";
  onUpdate: () => void;
}

export default function KnowledgeCard({ item, viewMode, onUpdate }: KnowledgeCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  
  // Check if item is being processed
  const isProcessing = item.metadata && typeof item.metadata === 'object' && 
    (item.metadata as any).processingState === 'analyzing';
  const processingFailed = item.metadata && typeof item.metadata === 'object' && 
    (item.metadata as any).processingState === 'failed';

  const getFileIcon = (type: string, mimeType?: string) => {
    switch (type) {
      case "document":
        if (mimeType?.includes("pdf")) return "fas fa-file-pdf file-icon-pdf";
        return "fas fa-file-alt file-icon-doc";
      case "image":
        return "fas fa-image file-icon-image";
      case "audio":
        return "fas fa-headphones file-icon-audio";
      case "video":
        return "fas fa-video file-icon-video";
      case "link":
        return "fas fa-link file-icon-link";
      default:
        return "fas fa-sticky-note file-icon-text";
    }
  };

  const getFileSize = (size?: number) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTagColor = (index: number) => {
    const colors = [
      "tag-blue", "tag-green", "tag-purple", "tag-red", "tag-yellow",
      "tag-orange", "tag-cyan", "tag-pink", "tag-indigo", "tag-gray"
    ];
    return colors[index % colors.length];
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/knowledge-items/${item.id}`);
      toast({
        title: "Item deleted",
        description: "Knowledge item has been deleted successfully.",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete the knowledge item.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = () => {
    setShowSummaryModal(true);
  };

  if (viewMode === "list") {
    return (
      <Card className={`knowledge-card floating-card border-0 overflow-hidden transition-all duration-500 hover:shadow-2xl group ${
        isProcessing ? 'processing-card neon-glow' : ''
      } ${
        processingFailed ? 'error-card' : ''
      }`}>
        <CardContent className="p-5">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
              item.type === "document" ? "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/25" :
              item.type === "image" ? "bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/25" :
              item.type === "audio" ? "bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-500/25" :
              item.type === "video" ? "bg-gradient-to-br from-red-400 to-pink-600 shadow-red-500/25" :
              item.type === "link" ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/25" :
              "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/25"
            } shadow-lg`}>
              <i className={`${getFileIcon(item.type, item.mimeType || undefined)} text-white text-lg`}></i>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold text-lg truncate transition-colors duration-300 ${
                isProcessing ? 'gradient-text' :
                processingFailed ? 'text-amber-600 dark:text-amber-400' :
                'text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'
              }`}>
                {item.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                {item.summary}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs">
                <span className="text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fas fa-clock mr-1"></i>
                  {formatDistanceToNow(new Date(item.createdAt || new Date()))} ago
                </span>
                {item.fileSize && (
                  <span className="text-gray-500 dark:text-gray-400 flex items-center">
                    <i className="fas fa-database mr-1"></i>
                    {getFileSize(item.fileSize)}
                  </span>
                )}
                {isProcessing && (
                  <div className="flex items-center space-x-1 text-blue-500">
                    <div className="pulse-loader"></div>
                    <span className="text-xs font-medium">Processing</span>
                  </div>
                )}
                {processingFailed && (
                  <div className="flex items-center space-x-1 text-amber-500">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span className="text-xs font-medium">Incomplete</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {item.knowledgeItemTags.slice(0, 2).map((itemTag, index) => (
                <Badge 
                  key={itemTag.tag.id} 
                  className={`${getTagColor(index)} transform hover:scale-110 transition-transform duration-200`}
                >
                  {itemTag.tag.name}
                </Badge>
              ))}
              {item.knowledgeItemTags.length > 2 && (
                <Badge className="tag-gray transform hover:scale-110 transition-transform duration-200">
                  +{item.knowledgeItemTags.length - 2}
                </Badge>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 bg-white/10 dark:bg-gray-800/50 hover:bg-white/20 dark:hover:bg-gray-700 rounded-full">
                  <i className="fas fa-ellipsis-v text-gray-600 dark:text-gray-300"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                <DropdownMenuItem onClick={handleView} className="hover:bg-purple-100 dark:hover:bg-purple-900/20">
                  <i className="fas fa-eye mr-2 text-purple-600"></i>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  disabled={isDeleting}
                  className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <i className="fas fa-trash mr-2"></i>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract thumbnail URL from metadata or fallback to object path
  const getThumbnailUrl = () => {
    if (item.metadata && typeof item.metadata === 'object') {
      const metadata = item.metadata as any;
      if (metadata.thumbnailUrl) return metadata.thumbnailUrl;
    }
    return item.objectPath;
  };

  const getVideoInfo = () => {
    if (item.metadata && typeof item.metadata === 'object') {
      const metadata = item.metadata as any;
      return {
        platform: metadata.platform,
        videoId: metadata.videoId,
        duration: metadata.duration
      };
    }
    return null;
  };

  const thumbnailUrl = getThumbnailUrl();
  const videoInfo = getVideoInfo();

  return (
    <>
      <Card className={`masonry-item knowledge-card floating-card relative overflow-hidden border-0 group transition-all duration-500 hover:shadow-2xl ${
        isProcessing ? 'processing-card neon-glow' : ''
      } ${
        processingFailed ? 'error-card' : ''
      }`} style={{ animationDelay: `${Math.random() * 2}s` } as React.CSSProperties}>
        {/* Processing overlay for items being analyzed */}
        {isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl z-10 pointer-events-none">
            <div className="absolute top-3 right-3">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg">
                <div className="pulse-loader w-3 h-3"></div>
                <span className="gradient-text">✨ AI Processing...</span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-b-2xl">
                <div className="h-full bg-gradient-to-r from-purple-400 to-blue-400 animate-pulse opacity-75"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error overlay for failed processing */}
        {processingFailed && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              Incomplete
            </Badge>
          </div>
        )}
        
        {/* Single thumbnail preview for images and videos */}
        {thumbnailUrl && (item.type === "image" || item.type === "video" || (item.type === "link" && videoInfo)) && (
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-t-2xl relative group cursor-pointer overflow-hidden" onClick={handleView}>
            <img 
              src={thumbnailUrl}
              alt={item.title}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1 ${
                isProcessing ? 'opacity-75 blur-sm' : 'group-hover:brightness-110'
              }`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
            
            {/* Hover overlay with view button */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-transparent rounded-t-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
              <Button
                className="w-20 h-20 rounded-full p-0 morphism-button border-2 border-white/20 transform scale-75 group-hover:scale-100 transition-all duration-300"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-xl">
                  <i className="fas fa-play text-white text-xl transform group-hover:scale-110 transition-transform duration-200"></i>
                </div>
              </Button>
            </div>
            
            {/* Platform badge */}
            {videoInfo?.platform && (
              <div className="absolute top-3 left-3">
                <Badge className={`${
                  videoInfo.platform === 'youtube' ? 'bg-gradient-to-r from-red-600 to-red-700 shadow-red-500/30' :
                  videoInfo.platform === 'vimeo' ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-blue-500/30' :
                  'bg-gradient-to-r from-gray-800 to-gray-900 shadow-gray-500/30'
                } text-white border-0 font-semibold px-3 py-1 rounded-full shadow-lg backdrop-blur-sm`}>
                  <i className={`${
                    videoInfo.platform === 'youtube' ? 'fab fa-youtube' :
                    videoInfo.platform === 'vimeo' ? 'fab fa-vimeo' :
                    'fas fa-video'
                  } mr-1`}></i>
                  {videoInfo.platform.charAt(0).toUpperCase() + videoInfo.platform.slice(1)}
                </Badge>
              </div>
            )}
            
            {/* Duration badge */}
            {videoInfo?.duration && (
              <div className="absolute bottom-3 right-3">
                <Badge className="bg-black/80 text-white border-0 text-xs font-mono font-semibold px-2 py-1 rounded-lg backdrop-blur-sm shadow-lg">
                  <i className="fas fa-clock mr-1"></i>
                  {videoInfo.duration}
                </Badge>
              </div>
            )}
          </div>
        )}
        
        {/* Processing animation for items without thumbnails */}
        {isProcessing && !thumbnailUrl && (
          <div className="aspect-video bg-gradient-to-br from-purple-100 via-blue-100 to-cyan-100 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-cyan-900/30 rounded-t-2xl relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-blue-400/20 to-cyan-400/20 animate-pulse"></div>
            <div className="text-center space-y-6 z-10">
              <div className="w-20 h-20 mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-ping opacity-20"></div>
                <div className="absolute inset-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center">
                  <i className="fas fa-brain text-purple-600 text-lg"></i>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-lg font-bold gradient-text">✨ AI Analysis in Progress</div>
                <div className="flex space-x-2 justify-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                  <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '400ms'}}></div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Extracting insights & generating summary...</p>
              </div>
            </div>
          </div>
        )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
              item.type === "document" ? "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/25" :
              item.type === "image" ? "bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/25" :
              item.type === "audio" ? "bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-500/25" :
              item.type === "video" ? "bg-gradient-to-br from-red-400 to-pink-600 shadow-red-500/25" :
              item.type === "link" ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/25" :
              "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/25"
            } shadow-lg`}>
              <i className={`${getFileIcon(item.type, item.mimeType || undefined)} text-white text-lg`}></i>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-lg font-bold block truncate transition-colors duration-300 ${
                isProcessing ? 'gradient-text' :
                processingFailed ? 'text-amber-600 dark:text-amber-400' :
                'text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'
              }`}>
                {item.title}
              </h3>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  <i className="fas fa-clock mr-1"></i>
                  {formatDistanceToNow(new Date(item.createdAt || new Date()))} ago
                </span>
                {isProcessing && (
                  <div className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400">
                    <div className="pulse-loader w-3 h-3"></div>
                    <span className="font-medium">Processing</span>
                  </div>
                )}
                {processingFailed && (
                  <div className="flex items-center space-x-1 text-sm text-amber-500">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span className="font-medium">Incomplete</span>
                  </div>
                )}
                {!isProcessing && !processingFailed && (
                  <div className="flex items-center space-x-1 text-sm text-emerald-500">
                    <i className="fas fa-shield-check"></i>
                    <span className="font-medium">Secured</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 flex-shrink-0 bg-white/10 dark:bg-gray-800/50 hover:bg-white/20 dark:hover:bg-gray-700 rounded-full">
                <i className="fas fa-ellipsis-v text-gray-600 dark:text-gray-300"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
              <DropdownMenuItem onClick={handleView} className="hover:bg-purple-100 dark:hover:bg-purple-900/20">
                <i className="fas fa-eye mr-2 text-purple-600"></i>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <i className="fas fa-trash mr-2"></i>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {item.summary && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-4 leading-relaxed font-medium">
            {item.summary}
          </p>
        )}
        
        {/* Enhanced metadata display */}
        {item.metadata && typeof item.metadata === 'object' && (() => {
          const metadata = item.metadata as Record<string, any>;
          return (
            <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {metadata.domain && (
                <div className="flex items-center space-x-1 mb-1">
                  <i className="fas fa-globe w-3"></i>
                  <span>{String(metadata.domain)}</span>
                </div>
              )}
              {metadata.platform && (
                <div className="flex items-center space-x-1 mb-1">
                  <i className="fas fa-video w-3"></i>
                  <span className="capitalize">{String(metadata.platform)} Video</span>
                </div>
              )}
            </div>
          );
        })()}
        
        {item.knowledgeItemTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {item.knowledgeItemTags.slice(0, 3).map((itemTag, index) => (
              <Badge 
                key={itemTag.tag.id} 
                className={`${getTagColor(index)} transform hover:scale-110 transition-all duration-200 cursor-pointer`}
              >
                {itemTag.tag.name}
              </Badge>
            ))}
            {item.knowledgeItemTags.length > 3 && (
              <Badge className="tag-gray transform hover:scale-110 transition-all duration-200">
                +{item.knowledgeItemTags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3 text-xs">
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg font-mono font-semibold text-gray-600 dark:text-gray-400">
              {item.type.toUpperCase()}
            </span>
            {item.fileSize && (
              <span className="text-gray-500 dark:text-gray-400 flex items-center">
                <i className="fas fa-hdd mr-1"></i>
                {getFileSize(item.fileSize)}
              </span>
            )}
          </div>
          <Button 
            onClick={handleView}
            className="bg-primary hover:bg-primary/90 text-white transform hover:scale-105 transition-all duration-200 font-semibold px-4 py-2 rounded-full shadow-lg"
          >
            <i className="fas fa-arrow-right mr-2"></i>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
    
    <ContentSummaryModal 
      isOpen={showSummaryModal} 
      onClose={() => setShowSummaryModal(false)} 
      item={item} 
    />
    </>
  );
}
