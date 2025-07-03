# Knowly: AI-Powered Q&A Platform

Knowly is a modern, full-stack question-and-answer platform designed for communities to share knowledge, ask questions, and grow together. It features a clean, responsive interface and is enhanced with AI capabilities for a smarter user experience.

## ✨ Key Features

-   **User Authentication**: Secure user registration and login with email OTP verification.
-   **Q&A Functionality**: Users can post questions with titles, descriptions, and tags. They can also post detailed answers.
-   **Voting System**: Upvote/downvote both questions and answers to highlight the most valuable content.
-   **Search & Discovery**: Full-text search for questions by keywords and the ability to browse questions by specific tags.
-   **AI-Powered Tag Suggestions**: Genkit is used to analyze question content and suggest relevant tags, simplifying the posting process.
-   **User Profiles**: Comprehensive user profiles displaying their questions, answers, and bookmarked questions. Users can edit their bio and profile picture.
-   **Bookmarking**: Users can save interesting questions for later reference.
-   **Responsive Design**: A clean, modern UI built with ShadCN and Tailwind CSS that works beautifully on all devices.
-   **Light & Dark Mode**: Theme support for user preference.

## 🚀 Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **UI**: [React](https://react.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Component Library**: [ShadCN UI](https://ui.shadcn.com/)
-   **AI Integration**: [Google's Genkit](https://firebase.google.com/docs/genkit)
-   **Database**: [MongoDB](https://www.mongodb.com/) (with MongoDB Atlas)
-   **Schema Validation**: [Zod](https://zod.dev/)
-   **Form Management**: [React Hook Form](https://react-hook-form.com/)
-   **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)

## 🔧 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
-   Access to a MongoDB database instance (local or cloud-hosted via [MongoDB Atlas](https://www.mongodb.com/atlas)).

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/dhaval4133/knowly.git
    cd knowly
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    -   Create a file named `.env.local` in the root of your project.
    -   Fill in the required values as shown below.

    ```env
    # .env.local

    # MongoDB Connection Details
    # Get this from your MongoDB Atlas dashboard or local setup
    MONGODB_URI=your_mongodb_connection_string
    MONGODB_DB_NAME=your_database_name

    # Google AI API Key for Genkit features
    # Get this from Google AI Studio: https://aistudio.google.com/
    GOOGLE_API_KEY=your_google_ai_api_key
    ```

### Running the Application

This project requires two separate terminal sessions to run both the Next.js frontend and the Genkit AI backend simultaneously.

1.  **Terminal 1: Start the Next.js development server:**
    ```bash
    npm run dev
    ```
    Your application should now be running on [http://localhost:9002](http://localhost:9002).

2.  **Terminal 2: Start the Genkit development server:**
    ```bash
    npm run genkit:dev
    ```
    This starts the AI flow server that the Next.js app communicates with for features like tag suggestion.

## 📄 License

This project is open-source and you are welcome to use it. Consider adding an MIT License when you publish it.
