# KnowledgeVault - AI Personal Knowledge Manager

## Overview

KnowledgeVault is an AI-powered web-based personal knowledge management system designed for students and professionals. The application allows users to upload, organize, and search through diverse content types including text, images, audio, video, documents, and web links. The system uses AI to automatically categorize, summarize, and tag content, making it easily searchable and retrievable through natural language queries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **File Uploads**: Uppy.js with AWS S3 integration for file handling

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with middleware for authentication and logging
- **File Processing**: Multer for multipart file uploads
- **Development**: Hot module replacement via Vite integration

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (Neon serverless)
- **Schema**: Relational design with users, knowledge items, tags, and many-to-many relationships
- **Sessions**: PostgreSQL-backed session storage for authentication

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Strategy**: Passport.js with custom OpenID strategy
- **Session Management**: Express sessions with PostgreSQL store
- **Security**: HTTP-only cookies with secure flags and CSRF protection

### AI Processing Pipeline
- **Provider**: OpenAI GPT-4o for content analysis
- **Capabilities**: 
  - Text content processing and summarization
  - Image analysis and description
  - Audio transcription
  - Document content extraction
  - Automatic tagging and categorization
  - Natural language search

### File Storage System
- **Primary Storage**: Google Cloud Storage with Replit sidecar integration
- **Access Control**: Custom ACL system with object-level permissions
- **Upload Strategy**: Direct-to-cloud uploads with presigned URLs
- **File Types**: Support for documents, images, audio, video, and generic files

### Search Architecture
- **Search Method**: AI-powered semantic search using OpenAI embeddings
- **Query Processing**: Natural language queries processed through GPT-4o
- **Results**: Ranked results with content snippets and metadata
- **Filtering**: Tag-based and content-type filtering capabilities

## External Dependencies

### Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Google Cloud Storage**: Object storage via Replit integration
- **OpenAI API**: GPT-4o model for content processing and search
- **Replit Services**: Authentication and cloud storage sidecar

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Production bundling for server code

### Key Libraries
- **Frontend**: React, TanStack Query, Wouter, Shadcn/ui, Uppy
- **Backend**: Express, Passport, Multer, OpenAI SDK
- **Database**: Drizzle ORM, Neon serverless driver
- **Utilities**: Zod for validation, date-fns for formatting