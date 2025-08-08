import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface NavigationProps {
  onSearch: (query: string) => void;
}

export default function Navigation({ onSearch }: NavigationProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserInitials = () => {
    const typedUser = user as any;
    if (typedUser?.firstName && typedUser?.lastName) {
      return `${typedUser.firstName[0]}${typedUser.lastName[0]}`.toUpperCase();
    }
    if (typedUser?.email) {
      return typedUser.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                <i className="fas fa-brain text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  KnowledgeVault
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI-Powered Knowledge</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Search */}
            <div className="hidden lg:block">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search your knowledge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-96 xl:w-[480px] 2xl:w-[600px] pl-12 pr-12 h-12 bg-gray-50/50 dark:bg-slate-700/50 border-gray-200/50 dark:border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600"
                >
                  <i className="fas fa-microphone text-gray-400"></i>
                </Button>
              </form>
            </div>
            
            {/* Mobile search */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-10 w-10 p-0 rounded-xl"
              onClick={() => onSearch("")}
            >
              <i className="fas fa-search text-gray-600 dark:text-gray-400"></i>
            </Button>
            
            {/* Privacy indicator */}
            <div className="hidden sm:flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl border border-green-200/50 dark:border-green-800/50">
              <i className="fas fa-shield-alt text-green-600 dark:text-green-400 text-sm"></i>
              <span className="text-green-700 dark:text-green-400 text-sm font-medium">Encrypted</span>
            </div>
            
            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 p-2 h-12 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <Avatar className="w-9 h-9 ring-2 ring-blue-500/20">
                    <AvatarImage src={(user as any)?.profileImageUrl || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(user as any)?.firstName || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Premium</p>
                  </div>
                  <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border-0 shadow-xl bg-white dark:bg-slate-800">
                <DropdownMenuItem onClick={handleLogout} className="p-3 rounded-lg">
                  <i className="fas fa-sign-out-alt mr-3 text-gray-400"></i>
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
