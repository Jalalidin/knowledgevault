import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import UploadZone from "@/components/UploadZone";
import KnowledgeCard from "@/components/KnowledgeCard";
import SearchModal from "@/components/SearchModal";
import UploadModal from "@/components/UploadModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { KnowledgeItemWithTags } from "@shared/schema";

export default function Home() {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: knowledgeItems, isLoading, refetch } = useQuery<KnowledgeItemWithTags[]>({
    queryKey: ["/api/knowledge-items"],
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchModal(true);
  };

  const handleUploadSuccess = () => {
    refetch();
    setShowUploadModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation onSearch={handleSearch} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UploadZone onUploadClick={() => setShowUploadModal(true)} />
        
        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Knowledge</h2>
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-sm">
              {knowledgeItems?.length || 0} items
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="px-3 py-1"
              >
                <i className="fas fa-th"></i>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="px-3 py-1"
              >
                <i className="fas fa-list"></i>
              </Button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : knowledgeItems && knowledgeItems.length > 0 ? (
          <div className={viewMode === "card" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 knowledge-grid" 
            : "space-y-4"
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
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-brain text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No knowledge items yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start building your knowledge base by uploading files, adding text, or saving links
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <i className="fas fa-plus mr-2"></i>
              Add Your First Item
            </Button>
          </div>
        )}
      </div>

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
  );
}
