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
import type { KnowledgeItemWithTags } from "@shared/schema";

interface KnowledgeCardProps {
  item: KnowledgeItemWithTags;
  viewMode: "card" | "list";
  onUpdate: () => void;
}

export default function KnowledgeCard({ item, viewMode, onUpdate }: KnowledgeCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (item.type === "link" && item.fileUrl) {
      window.open(item.fileUrl, "_blank");
    } else if (item.objectPath) {
      window.open(item.objectPath, "_blank");
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="knowledge-card">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              item.type === "document" ? "bg-red-100 dark:bg-red-900/30" :
              item.type === "image" ? "bg-yellow-100 dark:bg-yellow-900/30" :
              item.type === "audio" ? "bg-purple-100 dark:bg-purple-900/30" :
              item.type === "video" ? "bg-red-100 dark:bg-red-900/30" :
              item.type === "link" ? "bg-cyan-100 dark:bg-cyan-900/30" :
              "bg-green-100 dark:bg-green-900/30"
            }`}>
              <i className={getFileIcon(item.type, item.mimeType || undefined)}></i>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {item.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                {item.summary}
              </p>
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDistanceToNow(new Date(item.createdAt || new Date()))} ago</span>
                {item.fileSize && <span>{getFileSize(item.fileSize)}</span>}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {item.knowledgeItemTags.slice(0, 2).map((itemTag, index) => (
                <Badge 
                  key={itemTag.tag.id} 
                  variant="secondary" 
                  className={`text-xs ${getTagColor(index)}`}
                >
                  {itemTag.tag.name}
                </Badge>
              ))}
              {item.knowledgeItemTags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{item.knowledgeItemTags.length - 2}
                </Badge>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <i className="fas fa-ellipsis-h"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleView}>
                  <i className="fas fa-eye mr-2"></i>
                  View
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  disabled={isDeleting}
                  className="text-destructive"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Delete
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
    <Card className="knowledge-card">
      {/* Enhanced image preview with thumbnail support */}
      {(item.type === "image" || (item.type === "link" && thumbnailUrl)) && thumbnailUrl && (
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-xl relative group">
          <img 
            src={thumbnailUrl} 
            alt={item.title}
            className="w-full h-full object-cover rounded-t-xl transition-transform group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
          {item.type === "link" && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-black/50 text-white border-0">
                <i className="fas fa-external-link-alt mr-1 text-xs"></i>
                Link
              </Badge>
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced video preview with thumbnail and platform info */}
      {(item.type === "video" || (item.type === "link" && videoInfo)) && (
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-t-xl relative group">
          {thumbnailUrl ? (
            <>
              <img 
                src={thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover rounded-t-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-t-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-16 h-16 rounded-full p-0 shadow-lg"
                  onClick={handleView}
                >
                  <i className="fas fa-play ml-1 text-xl"></i>
                </Button>
              </div>
              {/* Platform badge */}
              {videoInfo?.platform && (
                <div className="absolute top-2 left-2">
                  <Badge className={`${
                    videoInfo.platform === 'youtube' ? 'bg-red-600' :
                    videoInfo.platform === 'vimeo' ? 'bg-blue-600' :
                    'bg-black/50'
                  } text-white border-0`}>
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
                <div className="absolute bottom-2 right-2">
                  <Badge className="bg-black/70 text-white border-0 text-xs">
                    {videoInfo.duration}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-800 rounded-t-xl flex items-center justify-center">
                <i className="fas fa-video text-4xl text-white/70"></i>
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-30 rounded-t-xl flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-12 h-12 rounded-full p-0"
                  onClick={handleView}
                >
                  <i className="fas fa-play ml-1"></i>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              item.type === "document" ? "bg-red-100 dark:bg-red-900/30" :
              item.type === "image" ? "bg-yellow-100 dark:bg-yellow-900/30" :
              item.type === "audio" ? "bg-purple-100 dark:bg-purple-900/30" :
              item.type === "video" ? "bg-red-100 dark:bg-red-900/30" :
              item.type === "link" ? "bg-cyan-100 dark:bg-cyan-900/30" :
              "bg-green-100 dark:bg-green-900/30"
            }`}>
              <i className={getFileIcon(item.type, item.mimeType || undefined)}></i>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                {item.title}
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(item.createdAt || new Date()))} ago
                </span>
                <i className="fas fa-shield-alt text-accent text-xs" title="Encrypted"></i>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                <i className="fas fa-ellipsis-h"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleView}>
                <i className="fas fa-eye mr-2"></i>
                View
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="text-destructive"
              >
                <i className="fas fa-trash mr-2"></i>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {item.summary && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3 leading-relaxed">
            {item.summary}
          </p>
        )}
        
        {/* Enhanced metadata display */}
        {item.metadata && typeof item.metadata === 'object' && (
          <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {(item.metadata as any).domain && (
              <div className="flex items-center space-x-1 mb-1">
                <i className="fas fa-globe w-3"></i>
                <span>{String((item.metadata as any).domain)}</span>
              </div>
            )}
            {(item.metadata as any).platform && (
              <div className="flex items-center space-x-1 mb-1">
                <i className="fas fa-video w-3"></i>
                <span className="capitalize">{String((item.metadata as any).platform)} Video</span>
              </div>
            )}
          </div>
        )}
        
        {item.knowledgeItemTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {item.knowledgeItemTags.slice(0, 3).map((itemTag, index) => (
              <Badge 
                key={itemTag.tag.id} 
                variant="secondary" 
                className={`text-xs font-medium ${getTagColor(index)}`}
              >
                {itemTag.tag.name}
              </Badge>
            ))}
            {item.knowledgeItemTags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{item.knowledgeItemTags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {item.type.toUpperCase()}
            {item.fileSize && ` • ${getFileSize(item.fileSize)}`}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleView}
            className="text-primary hover:text-primary/80"
          >
            View →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
