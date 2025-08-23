# 🎨 Art Inventory App

A modern, full-stack web application for managing art collections with ease. Built with Next.js 15, React 18, TypeScript, and Supabase.

## ✨ Features

- **🔐 User Authentication** - Secure sign-up and login system
- **📱 Responsive Design** - Mobile-first approach with modern UI
- **🖼️ Photo Management** - Upload and organize artwork photos via Vercel Blob
- **💰 Pricing Tracking** - Monitor estimated and sale prices
- **📍 Location Management** - Organize items by house zones
- **🔍 Search & Filter** - Find items quickly and efficiently
- **📊 Dashboard** - Overview of your entire collection

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **File Storage**: Vercel Blob
- **Deployment**: Vercel
- **Package Manager**: npm

## 🏗️ Project Structure

```
inventory-app/
├── app/                    # Next.js app directory
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── inventory/         # Inventory management
│   └── api/               # API routes
├── components/            # Reusable UI components
├── lib/                   # Utility libraries
├── scripts/               # Database setup scripts
└── public/                # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd inventory-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

1. Create a new Supabase project
2. Run the SQL scripts in the `scripts/` folder:
   - `001_create_inventory_schema.sql`
   - `002_create_profiles.sql`
   - `003_seed_sample_data.sql`

## 🌐 Deployment

This app is configured for easy deployment on Vercel:

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set environment variables**
4. **Deploy automatically**

## 📱 Screenshots

*Add screenshots of your app here*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Backend powered by [Supabase](https://supabase.com/)

## 🚀 Latest Updates

- **Photo uploads** now working with Vercel Blob
- **Improved error handling** for better user experience
- **Database integration** fully functional
- **Authentication flow** optimized and working
