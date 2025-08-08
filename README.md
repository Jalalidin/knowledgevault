# 🧠 KnowledgeVault - AI Personal Knowledge Manager

> Transform any content into searchable, organized knowledge with the power of AI

KnowledgeVault is an intelligent web-based personal knowledge management system designed for students, researchers, and professionals. Upload, organize, and search through diverse content types including documents, images, audio, video, and web links. Our AI automatically categorizes, summarizes, and tags your content, making it instantly searchable through natural language queries.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen)](https://replit.com/@your-username/knowledgevault)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Smart Content Processing**: Automatic summarization and categorization using GPT-4o
- **Semantic Search**: Natural language queries across all your content
- **Auto-Tagging**: Intelligent tag generation for effortless organization
- **Content Analysis**: Extract insights from images, audio, video, and documents

### 📁 Universal Content Support
- **Documents**: PDF, Word, text files with content extraction
- **Images**: Visual analysis and description generation  
- **Audio**: Transcription and content summarization
- **Video**: Analysis of video content and metadata extraction
- **Web Links**: Automatic article extraction and video processing
- **Text Notes**: Direct text input with AI enhancement

### 🔍 Advanced Search & Organization
- **Natural Language Search**: Ask questions like "Find my machine learning notes from last month"
- **Tag-Based Filtering**: Organize content with intelligent tagging
- **Content Type Filtering**: Filter by documents, images, videos, etc.
- **Visual Browse Mode**: Card and list view options
- **Real-time Results**: Instant search as you type

### 🎨 Modern Interface
- **Dark/Light Mode**: Seamless theme switching
- **Responsive Design**: Perfect experience across all devices
- **Drag & Drop Upload**: Intuitive file management
- **Real-time Updates**: Live content processing feedback
- **Beautiful UI**: Built with Tailwind CSS and Radix UI components

## 🏗️ Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe component development
- **Vite** for lightning-fast development and building
- **Tailwind CSS** for utility-first styling with dark mode support
- **Shadcn/ui** component library built on Radix UI primitives
- **TanStack Query** for powerful server state management
- **Wouter** for lightweight client-side routing
- **Uppy.js** for advanced file upload handling

### Backend
- **Node.js** with Express.js for robust API development
- **TypeScript** for end-to-end type safety
- **Passport.js** with OpenID Connect for secure authentication
- **RESTful API** design with comprehensive middleware

### Database & Storage
- **PostgreSQL** with Neon serverless hosting
- **Drizzle ORM** for type-safe database operations
- **Google Cloud Storage** for scalable file storage
- **Session Management** with PostgreSQL-backed sessions

### AI & Processing
- **OpenAI GPT-4o** for content analysis and natural language processing
- **Semantic Search** using OpenAI embeddings
- **Multi-modal Processing** for text, images, audio, and video
- **Real-time Content Analysis** with streaming responses

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key
- Google Cloud Storage (via Replit)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/knowledgevault.git
   cd knowledgevault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Database
   DATABASE_URL=your_postgresql_connection_string
   
   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key
   
   # Session Security
   SESSION_SECRET=your_secure_session_secret
   
   # Object Storage (Replit provides these)
   PRIVATE_OBJECT_DIR=/your-bucket/private
   PUBLIC_OBJECT_SEARCH_PATHS=/your-bucket/public
   DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
   
   # Authentication (Replit provides these)
   REPLIT_DOMAINS=your-replit-domain.replit.app
   REPL_ID=your-repl-id
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000` to start using KnowledgeVault!

## 📖 Usage

### Adding Content

#### 📄 File Upload
1. **Drag & Drop**: Simply drag files into the upload zone
2. **Click to Browse**: Click the upload area to select files
3. **Batch Upload**: Upload multiple files simultaneously
4. **Auto-Processing**: AI automatically analyzes and categorizes content

#### ✍️ Text Notes  
1. **Direct Input**: Type or paste text content
2. **AI Enhancement**: Automatic title generation and summarization
3. **Smart Tagging**: Intelligent tag suggestions
4. **Rich Content**: Support for formatted text and long-form content

#### 🌐 Web Content
1. **URL Input**: Paste any web link or video URL
2. **Content Extraction**: Automatic article and video analysis
3. **Metadata Capture**: Thumbnail, duration, and platform detection
4. **Real-time Processing**: Live updates as content is analyzed

### Searching & Browsing

#### 🔍 Natural Language Search
```
"Find my Python tutorials from last week"
"Show me all machine learning PDFs" 
"What notes do I have about React hooks?"
"Find videos about data science"
```

#### 🏷️ Tag-Based Organization
- Browse content by automatically generated tags
- Filter by content type (documents, images, videos, etc.)
- Combine multiple tags for precise filtering

#### 📊 View Modes
- **Card View**: Visual grid layout with thumbnails
- **List View**: Compact list with detailed metadata
- **Search Highlighting**: Matched terms highlighted in results

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user information
- `GET /api/login` - Initiate OAuth login flow
- `GET /api/logout` - End user session

### Knowledge Items
- `GET /api/knowledge-items` - List all knowledge items
- `POST /api/knowledge-items` - Create new knowledge item
- `PUT /api/knowledge-items/:id` - Update existing item
- `DELETE /api/knowledge-items/:id` - Delete knowledge item

### Content Processing
- `POST /api/process-text` - Process text content with AI
- `POST /api/process-link` - Analyze web links and videos
- `POST /api/objects/upload` - Get upload URL for files

### Search
- `GET /api/search?q=query` - Search knowledge base
- `GET /api/tags` - List available tags

### File Management
- `GET /objects/:path` - Serve private files (authenticated)
- `GET /public-objects/:path` - Serve public assets

## 🏛️ Architecture

### Frontend Architecture
```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Shadcn UI components
│   │   ├── Navigation.tsx
│   │   ├── KnowledgeCard.tsx
│   │   └── ObjectUploader.tsx
│   ├── pages/           # Route components
│   │   ├── home.tsx
│   │   ├── search.tsx
│   │   └── landing.tsx
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and helpers
│   └── App.tsx          # Main application
```

### Backend Architecture
```
server/
├── index.ts            # Express app setup
├── routes.ts           # API route definitions  
├── db.ts               # Database connection
├── storage.ts          # Data access layer
├── replitAuth.ts       # Authentication middleware
├── objectStorage.ts    # File storage service
└── openai.ts           # AI processing service
```

### Database Schema
```
shared/
└── schema.ts           # Drizzle ORM schemas
    ├── users           # User accounts
    ├── knowledgeItems  # Content items
    ├── tags            # Content tags
    └── knowledgeItemTags # Many-to-many relations
```

## 🤝 Contributing

We welcome contributions to KnowledgeVault! Here's how you can help:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Guidelines
- **Code Style**: We use TypeScript with strict mode enabled
- **Testing**: Add tests for new features
- **Documentation**: Update README and code comments
- **Commits**: Use conventional commit messages

### Areas for Contribution
- 🐛 **Bug Fixes**: Help us identify and fix issues
- ✨ **New Features**: Implement new content types or AI capabilities
- 🎨 **UI/UX**: Improve the user interface and experience
- 📚 **Documentation**: Enhance guides and API documentation
- 🔧 **Performance**: Optimize search and processing speed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing powerful AI capabilities
- **Replit** for hosting and authentication services
- **The Open Source Community** for the amazing tools and libraries

## 🔗 Links

- [Live Demo](https://replit.com/@your-username/knowledgevault)
- [Documentation](https://github.com/your-username/knowledgevault/wiki)
- [Issue Tracker](https://github.com/your-username/knowledgevault/issues)
- [Discussions](https://github.com/your-username/knowledgevault/discussions)

---

<div align="center">

**Built with ❤️ by the KnowledgeVault Team**

*Turn information into insights, one upload at a time*

</div>