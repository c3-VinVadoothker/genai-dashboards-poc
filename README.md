# GenAI Dashboards POC

A comprehensive AI-powered dashboard creation and management system built with Next.js, React, and Google's Gemini AI. This application enables users to create, manage, and interact with data visualizations through natural language conversations.

## 🚀 Core Functionality Overview

### 1. **AI-Powered Dashboard Creation**
- **Purpose**: Generate data visualizations and dashboards using natural language
- **Flow**: 
  1. User inputs natural language request in chat interface
  2. Gemini AI analyzes request and generates appropriate chart code
  3. System creates React components with Recharts library
  4. Dashboards are automatically saved and displayed on canvas

### 2. **Intelligent Chat Interface**
- **Purpose**: Natural language interaction for dashboard creation and data analysis
- **Flow**:
  1. User types request in chat panel
  2. Semantic agent classifies request type (CREATE_DASHBOARD, READ_DATA, etc.)
  3. Appropriate agent handles the request
  4. Response includes generated code, data functions, and visualizations
  5. Chat history is persisted in localStorage

### 3. **Advanced Filtering System**
- **Purpose**: Multi-level filtering across dashboards and data
- **Flow**:
  1. Global filters apply across all dashboards
  2. Dashboard-level filters for individual components
  3. Inline filters within each dashboard component
  4. Filter state persisted in sessionStorage
  5. Real-time filtering with visual feedback

### 4. **Dashboard Management**
- **Purpose**: Organize, save, and manage created dashboards
- **Flow**:
  1. Dashboards are auto-saved when created
  2. Saved dashboards displayed as iframe components
  3. Drag-and-drop positioning on canvas
  4. Edit/View mode toggle for different interaction modes

## 🏗️ Architecture & Components

### **Frontend Components**

#### **Main Dashboard (`dashboard.tsx`)**
- **Purpose**: Main application container and state management
- **Key Features**:
  - Chat panel integration
  - Component canvas management
  - State persistence (localStorage)
  - Workflow templates

#### **Chat Panel (`components/chat-panel.tsx`)**
- **Purpose**: AI conversation interface for dashboard creation
- **Key Features**:
  - Message history with markdown rendering
  - Thread management (create, load, delete)
  - Real-time AI responses
  - Dashboard preview functionality
  - Auto-save chat state

#### **Dashboard Canvas (`components/dashboard-canvas.tsx`)**
- **Purpose**: Main workspace for dashboard components
- **Key Features**:
  - Drag-and-drop component positioning
  - Edit/View mode toggle
  - Filter panel integration
  - Saved dashboard iframe rendering
  - Session storage for state persistence

#### **Filter Panel (`components/dashboard-filter-panel.tsx`)**
- **Purpose**: Advanced filtering interface
- **Key Features**:
  - Global vs Dashboard filter modes
  - Quick filters and advanced filter groups
  - Date range, numeric range, and categorical filters
  - Filter compatibility analysis
  - Session storage persistence

#### **Dashboard Components (`components/dashboard-component.tsx`)**
- **Purpose**: Individual dashboard component rendering
- **Key Features**:
  - Multiple component types (KPI, Chart, Saved Component)
  - Inline filtering
  - Real-time data updates
  - Component menu (delete, edit)

#### **Saved Dashboard Iframe (`components/saved-dashboard-iframe.tsx`)**
- **Purpose**: Render saved dashboards as embedded iframes
- **Key Features**:
  - Responsive sizing
  - Drag-and-drop positioning
  - Click to open in new tab
  - Edit mode interactions

### **Backend API Routes**

#### **AI Integration (`app/api/gemini/route.ts`)**
- **Purpose**: Google Gemini AI integration
- **Key Features**:
  - Chart type selection
  - React component generation
  - Data function creation
  - Error handling and logging

#### **Data APIs (`app/api/data/`)**
- **Purpose**: Serve wind turbine and telemetry data
- **Endpoints**:
  - `/api/data/turbines` - Wind turbine information
  - `/api/data/telemetry` - Real-time telemetry data
  - `/api/data/metadata` - Data schema information

#### **Dashboard Management (`app/api/dashboard/`)**
- **Purpose**: CRUD operations for dashboards
- **Endpoints**:
  - `/api/dashboard/save` - Save new dashboard
  - `/api/dashboard/load` - Load existing dashboard
  - `/api/dashboard/[id]/data` - Get dashboard data
  - `/api/dashboard/[id]/metrics` - Get dashboard metrics

#### **Saved Dashboards (`app/api/saved-dashboards/`)**
- **Purpose**: Manage saved dashboard instances
- **Endpoints**:
  - `/api/saved-dashboards` - List all saved dashboards
  - `/api/saved-dashboard/[id]/data` - Get saved dashboard data

#### **Chat Management (`app/api/chat/`)**
- **Purpose**: Chat thread persistence
- **Endpoints**:
  - `/api/chat/threads/load` - Load chat threads
  - `/api/chat/threads/save` - Save chat thread
  - `/api/chat/threads/delete` - Delete chat thread

### **Core Services**

#### **Data Service (`lib/data-service.ts`)**
- **Purpose**: Centralized data access and caching
- **Key Features**:
  - Wind turbine data management
  - Telemetry data retrieval
  - Statistical calculations
  - Data caching for performance

#### **Filter Service (`lib/filter-service.ts`)**
- **Purpose**: Advanced data filtering logic
- **Key Features**:
  - Multi-type filter support (date, numeric, categorical)
  - Filter group logic (AND/OR)
  - Real-time data filtering
  - Filter validation and optimization

#### **Chat Service (`lib/chat-service.ts`)**
- **Purpose**: Chat state management and persistence
- **Key Features**:
  - Thread management
  - Message history
  - Auto-save functionality
  - State synchronization

#### **Saved Dashboards Service (`lib/saved-dashboards-service.ts`)**
- **Purpose**: Saved dashboard CRUD operations
- **Key Features**:
  - Dashboard positioning and sizing
  - Optimal layout calculation
  - Duplicate prevention
  - Update management

### **AI Agents**

#### **Gemini Semantic Agent (`lib/agents/gemini-semantic-agent.ts`)**
- **Purpose**: Intelligent request classification and processing
- **Key Features**:
  - Request type classification (CREATE_DASHBOARD, READ_DATA, etc.)
  - Dashboard code generation
  - Data query function creation
  - Context-aware responses

#### **Dashboard Query Agent (`lib/agents/dashboard-query-agent.ts`)**
- **Purpose**: Handle dashboard reading and analysis requests
- **Key Features**:
  - Dashboard discovery
  - Content analysis
  - Query interpretation

#### **Dashboard Update Agent (`lib/agents/dashboard-update-agent.ts`)**
- **Purpose**: Handle dashboard modification requests
- **Key Features**:
  - Component updates
  - Layout modifications
  - Data source changes

#### **Dashboard Delete Agent (`lib/agents/dashboard-delete-agent.ts`)**
- **Purpose**: Handle dashboard removal requests
- **Key Features**:
  - Safe deletion
  - Confirmation handling
  - Cleanup operations

#### **Data Query Agent (`lib/agents/data-query-agent.ts`)**
- **Purpose**: Handle raw data analysis requests
- **Key Features**:
  - Data exploration
  - Statistical analysis
  - Query generation

## 🔄 User Flows

### **Dashboard Creation Flow**
1. User opens chat panel
2. Types natural language request (e.g., "Show turbine status by location")
3. Semantic agent classifies request as CREATE_DASHBOARD
4. Gemini AI generates React component code and data function
5. System creates dashboard component on canvas
6. Dashboard is automatically saved
7. User can interact with the visualization

### **Filtering Flow**
1. User opens filter panel
2. Selects filter mode (Global or Dashboard)
3. Adds filter groups with AND/OR logic
4. Configures filter criteria (date ranges, values, categories)
5. Filters are applied in real-time
6. Filter state is saved to sessionStorage
7. Visual feedback shows filtered results

### **Dashboard Management Flow**
1. User creates multiple dashboards
2. Dashboards are auto-saved as iframe components
3. User can drag and drop to reposition
4. Click to open in full view
5. Edit mode allows component manipulation
6. View mode provides clean presentation

### **Chat Thread Management Flow**
1. User starts new conversation
2. Chat thread is automatically created
3. Messages are saved in real-time
4. User can switch between threads
5. Thread history is persisted
6. Threads can be deleted or renamed

## 🎨 UI/UX Features

### **Responsive Design**
- Mobile-friendly interface
- Adaptive layouts
- Touch-friendly interactions

### **Theme Support**
- Light/Dark mode
- Consistent design system
- Accessible color schemes

### **Interactive Elements**
- Drag-and-drop functionality
- Hover effects and tooltips
- Loading states and animations
- Real-time updates

### **State Persistence**
- Session storage for filters and view mode
- Local storage for chat state
- Automatic save functionality
- State restoration on reload

## 📊 Data Sources

### **Wind Turbine Data**
- Turbine information (ID, model, location, status)
- Geographic coordinates
- Commission dates
- Operational status

### **Telemetry Data**
- Real-time power output
- Wind speed measurements
- Rotor RPM data
- Temperature readings
- Timestamp information

## 🛠️ Technical Stack

### **Frontend**
- Next.js 15.2.4 (React 19)
- TypeScript
- Tailwind CSS
- Radix UI components
- Recharts for visualizations
- Lucide React icons

### **Backend**
- Next.js API routes
- Google Gemini AI integration
- File-based data storage
- Session/Local storage

### **AI/ML**
- Google Generative AI (Gemini 2.5 Pro)
- Semantic classification
- Code generation
- Natural language processing

### **Data Visualization**
- Recharts library
- Multiple chart types (Bar, Line, Scatter, Pie, Area)
- Responsive containers
- Interactive tooltips

## 🔧 Development Features

### **Debugging Tools**
- Console logging throughout
- Debug terminal in dashboard view
- Error handling and reporting
- Performance monitoring

### **Code Quality**
- TypeScript strict mode
- ESLint configuration
- Consistent code formatting
- Error boundaries

### **Performance**
- Data caching
- Debounced saves
- Lazy loading
- Optimized re-renders

## 🚀 Getting Started

1. **Installation**
   ```bash
   npm install
   ```

2. **Environment Setup**
   - Set `GEMINI_KEY` environment variable
   - Configure data file paths

3. **Development**
   ```bash
   npm run dev
   ```

4. **Build**
   ```bash
   npm run build
   npm start
   ```

## 📝 Key Features Summary

- **AI-Powered Dashboard Creation**: Natural language to visualization
- **Advanced Filtering**: Multi-level, persistent filtering system
- **Real-time Data**: Live telemetry and turbine data
- **Chat Interface**: Conversational AI for dashboard management
- **State Persistence**: Automatic saving and restoration
- **Responsive Design**: Mobile-friendly interface
- **Drag-and-Drop**: Intuitive component positioning
- **Multiple Chart Types**: Bar, line, scatter, pie, area charts
- **Thread Management**: Organized chat conversations
- **Theme Support**: Light/dark mode
- **Error Handling**: Robust error management
- **Performance**: Optimized for speed and efficiency

This application represents a comprehensive solution for AI-powered dashboard creation and management, combining modern web technologies with advanced AI capabilities to provide an intuitive and powerful data visualization platform.
