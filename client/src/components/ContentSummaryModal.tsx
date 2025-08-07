import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { KnowledgeItemWithTags } from "@shared/schema";

interface ContentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: KnowledgeItemWithTags | null;
}

export default function ContentSummaryModal({ isOpen, onClose, item }: ContentSummaryModalProps) {
  if (!item) return null;

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
        duration: metadata.duration,
        domain: metadata.domain
      };
    }
    return null;
  };

  const getFileIcon = (type: string, mimeType?: string) => {
    switch (type) {
      case "document":
        if (mimeType?.includes("pdf")) return "fas fa-file-pdf text-red-600";
        return "fas fa-file-alt text-blue-600";
      case "image":
        return "fas fa-image text-green-600";
      case "audio":
        return "fas fa-headphones text-purple-600";
      case "video":
        return "fas fa-video text-red-600";
      case "link":
        return "fas fa-link text-cyan-600";
      default:
        return "fas fa-sticky-note text-gray-600";
    }
  };

  const getFileSize = (size?: number) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenOriginal = () => {
    if (item.type === "link" && item.fileUrl) {
      window.open(item.fileUrl, "_blank");
    } else if (item.objectPath) {
      window.open(item.objectPath, "_blank");
    }
    onClose();
  };

  const thumbnailUrl = getThumbnailUrl();
  const videoInfo = getVideoInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3 text-xl">
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {item.title}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{formatDistanceToNow(new Date(item.createdAt || new Date()))} ago</span>
                <span className="uppercase font-medium">{item.type}</span>
                {item.fileSize && <span>{getFileSize(item.fileSize)}</span>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="pt-6 space-y-6">
          {/* Thumbnail/Preview */}
          {thumbnailUrl && (
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl relative overflow-hidden">
              <img 
                src={thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
              
              {/* Platform badge */}
              {videoInfo?.platform && (
                <div className="absolute top-4 left-4">
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
                <div className="absolute bottom-4 right-4">
                  <Badge className="bg-black/70 text-white border-0">
                    {videoInfo.duration}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Content Summary */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Content Summary
            </h3>
            {item.summary ? (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {item.summary}
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No summary available for this content.
              </p>
            )}
          </div>

          {/* Metadata */}
          {item.metadata && typeof item.metadata === 'object' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Content Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {videoInfo?.domain && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Source:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{videoInfo.domain}</span>
                  </div>
                )}
                {videoInfo?.platform && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Platform:</span>
                    <span className="ml-2 text-gray-900 dark:text-white capitalize">{videoInfo.platform}</span>
                  </div>
                )}
                {item.fileName && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">File Name:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{item.fileName}</span>
                  </div>
                )}
                {item.mimeType && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{item.mimeType}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {item.knowledgeItemTags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.knowledgeItemTags.map((itemTag, index) => (
                  <Badge 
                    key={itemTag.tag.id} 
                    variant="secondary" 
                    className="text-sm"
                  >
                    {itemTag.tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Content Text */}
          {item.content && item.type === "text" && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Full Content
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  {item.content}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button 
              onClick={handleOpenOriginal}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
            >
              <i className="fas fa-external-link-alt mr-2"></i>
              {item.type === "video" || (item.type === "link" && videoInfo) ? "Watch Video" : "Open Original"}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-8"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}