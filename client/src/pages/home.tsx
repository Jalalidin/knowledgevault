import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import UploadZone from "@/components/UploadZone";
import KnowledgeCard from "@/components/KnowledgeCard";
import SearchModal from "@/components/SearchModal";
import UploadModal from "@/components/UploadModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Navigation onSearch={handleSearch} />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Your Personal <span className="text-yellow-300">Knowledge Vault</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Organize, search, and discover your knowledge with AI-powered intelligence
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => setShowUploadModal(true)}
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-8 py-3 text-lg shadow-lg"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Knowledge
              </Button>
              <Button 
                onClick={() => setShowSearchModal(true)}
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg"
              >
                <i className="fas fa-search mr-2"></i>
                Search Everything
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 -mt-8 relative z-10">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
               onClick={() => setShowUploadModal(true)}>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <i className="fas fa-upload text-white text-lg"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Files</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Documents, images, audio, and videos</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
               onClick={() => setShowUploadModal(true)}>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
              <i className="fas fa-edit text-white text-lg"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Add Text</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Notes, ideas, and written content</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
               onClick={() => setShowUploadModal(true)}>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <i className="fas fa-link text-white text-lg"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Save Links</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Websites, articles, and resources</p>
          </div>
        </div>
        
        {/* Stats & Actions Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Collection</h2>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <i className="fas fa-database mr-1"></i>
                    {knowledgeItems?.length || 0} items
                  </Badge>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <i className="fas fa-shield-alt mr-1"></i>
                    Encrypted
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Quick search..."
                  className="w-64 pl-10 bg-gray-50 dark:bg-slate-700 border-0 focus:ring-2 focus:ring-blue-500"
                  onFocus={() => setShowSearchModal(true)}
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
              
              {/* View toggle */}
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className="px-4 py-2 rounded-lg"
                >
                  <i className="fas fa-th mr-2"></i>
                  Cards
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="px-4 py-2 rounded-lg"
                >
                  <i className="fas fa-list mr-2"></i>
                  List
                </Button>
              </div>
            </div>
          </div>
        </div>

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
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-brain text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to build your knowledge vault?
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Start by adding your first piece of knowledge. Upload documents, save interesting links, or write down your thoughts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => setShowUploadModal(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Your First Item
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => setShowUploadModal(true)}
                className="px-8 py-3 text-lg border-2"
              >
                <i className="fas fa-lightbulb mr-2"></i>
                Learn How
              </Button>
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
