/**
 * DATA LAYER: Curated Hackathon Ideas Dataset
 * 
 * This dataset serves as the knowledge base for our custom NLP system.
 * Each entry contains:
 * - category: The hackathon theme/domain
 * - ideas: Array of project ideas with structured metadata
 * 
 * The dataset is curated from common hackathon themes and winning projects.
 */

export interface IdeaEntry {
  id: string;
  title: string;
  problem: string;
  solution: string;
  techStack: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  keywords: string[];
  category: string;
}

export interface CategoryData {
  category: string;
  keywords: string[];
  ideas: IdeaEntry[];
}

export const hackathonDataset: CategoryData[] = [
  {
    category: "healthcare",
    keywords: ["health", "medical", "patient", "doctor", "hospital", "wellness", "fitness", "mental health", "disease", "diagnosis", "treatment", "medicine", "care", "telemedicine", "healthcare"],
    ideas: [
      {
        id: "health-1",
        title: "MediTrack AI",
        problem: "Patients struggle to track medications and symptoms consistently, leading to poor health outcomes",
        solution: "A smart medication tracker that uses pattern recognition to identify symptom-medication correlations and provides personalized health insights",
        techStack: ["React", "IndexedDB", "TensorFlow.js", "PWA"],
        difficulty: "Medium",
        keywords: ["medication", "tracking", "symptoms", "health", "patterns", "insights"],
        category: "healthcare"
      },
      {
        id: "health-2",
        title: "MindfulMoments",
        problem: "Mental health support is expensive and inaccessible for many people",
        solution: "An AI-powered mental wellness app that provides CBT-based exercises, mood tracking, and early warning detection for mental health deterioration",
        techStack: ["React Native", "Firebase", "Sentiment Analysis", "Push Notifications"],
        difficulty: "Medium",
        keywords: ["mental health", "wellness", "mood", "therapy", "CBT", "support"],
        category: "healthcare"
      },
      {
        id: "health-3",
        title: "SymptomSense",
        problem: "People often delay seeking medical attention due to uncertainty about symptom severity",
        solution: "A symptom checker that uses decision tree classification to assess urgency and provide appropriate care recommendations",
        techStack: ["React", "Decision Trees", "Medical APIs", "Supabase"],
        difficulty: "Hard",
        keywords: ["symptoms", "diagnosis", "medical", "urgency", "triage", "health"],
        category: "healthcare"
      }
    ]
  },
  {
    category: "education",
    keywords: ["learning", "student", "teacher", "school", "course", "study", "education", "training", "skill", "knowledge", "classroom", "online learning", "tutoring", "academic"],
    ideas: [
      {
        id: "edu-1",
        title: "StudyBuddy AI",
        problem: "Students lack personalized study plans that adapt to their learning pace and style",
        solution: "An adaptive learning platform that analyzes study patterns and creates personalized revision schedules using spaced repetition algorithms",
        techStack: ["React", "LocalStorage", "Spaced Repetition Algorithm", "Charts"],
        difficulty: "Medium",
        keywords: ["study", "learning", "personalized", "schedule", "revision", "adaptive"],
        category: "education"
      },
      {
        id: "edu-2",
        title: "PeerLearn",
        problem: "Students often learn better from peers but finding study partners with complementary skills is difficult",
        solution: "A peer matching system that uses skill embeddings to find optimal study partners based on complementary strengths and weaknesses",
        techStack: ["React", "Supabase", "Cosine Similarity", "Real-time Chat"],
        difficulty: "Medium",
        keywords: ["peer", "matching", "study", "collaboration", "skills", "learning"],
        category: "education"
      },
      {
        id: "edu-3",
        title: "ConceptMapper",
        problem: "Complex topics are hard to understand without seeing relationships between concepts",
        solution: "A visual learning tool that automatically generates concept maps from text using NLP keyword extraction and relationship detection",
        techStack: ["React", "D3.js", "TF-IDF", "Graph Algorithms"],
        difficulty: "Hard",
        keywords: ["concepts", "visualization", "learning", "relationships", "maps", "understanding"],
        category: "education"
      }
    ]
  },
  {
    category: "environment",
    keywords: ["climate", "sustainability", "green", "eco", "carbon", "recycling", "environment", "pollution", "renewable", "energy", "waste", "conservation", "nature", "planet"],
    ideas: [
      {
        id: "env-1",
        title: "CarbonTracker",
        problem: "Individuals don't understand their personal carbon footprint or how to reduce it",
        solution: "A carbon footprint calculator that tracks daily activities and provides actionable recommendations using rule-based classification",
        techStack: ["React", "Charts", "Rule Engine", "PWA"],
        difficulty: "Easy",
        keywords: ["carbon", "footprint", "tracking", "sustainability", "environment", "reduction"],
        category: "environment"
      },
      {
        id: "env-2",
        title: "WasteWise",
        problem: "People are confused about proper recycling and waste sorting practices",
        solution: "An image classification app that identifies waste items and provides sorting instructions using on-device ML models",
        techStack: ["React", "TensorFlow.js", "Camera API", "IndexedDB"],
        difficulty: "Hard",
        keywords: ["waste", "recycling", "sorting", "classification", "environment", "green"],
        category: "environment"
      },
      {
        id: "env-3",
        title: "EcoCommute",
        problem: "Commuters want to reduce environmental impact but lack information about green alternatives",
        solution: "A route planner that calculates carbon emissions for different transport options and suggests eco-friendly alternatives",
        techStack: ["React", "Maps API", "Emission Calculations", "Route Optimization"],
        difficulty: "Medium",
        keywords: ["commute", "transport", "carbon", "emissions", "routes", "green"],
        category: "environment"
      }
    ]
  },
  {
    category: "finance",
    keywords: ["money", "budget", "investment", "finance", "banking", "savings", "expense", "financial", "payment", "transaction", "wealth", "stock", "crypto", "economy"],
    ideas: [
      {
        id: "fin-1",
        title: "SpendSmart",
        problem: "People struggle to understand their spending patterns and create sustainable budgets",
        solution: "A smart budgeting app that uses clustering algorithms to categorize expenses and identify spending patterns automatically",
        techStack: ["React", "K-Means Clustering", "Charts", "Supabase"],
        difficulty: "Medium",
        keywords: ["budget", "spending", "patterns", "finance", "tracking", "categories"],
        category: "finance"
      },
      {
        id: "fin-2",
        title: "SplitFair",
        problem: "Splitting expenses fairly in groups is complicated and often leads to conflicts",
        solution: "An intelligent expense splitter that considers income levels, consumption, and fairness algorithms for equitable splits",
        techStack: ["React", "Fairness Algorithms", "Real-time Sync", "Push Notifications"],
        difficulty: "Easy",
        keywords: ["split", "expenses", "fair", "group", "sharing", "money"],
        category: "finance"
      },
      {
        id: "fin-3",
        title: "InvestIQ",
        problem: "Beginner investors lack knowledge to make informed investment decisions",
        solution: "An educational investment simulator that teaches fundamental analysis through gamified learning and risk assessment",
        techStack: ["React", "Stock APIs", "Risk Scoring", "Gamification"],
        difficulty: "Hard",
        keywords: ["investment", "learning", "stocks", "risk", "education", "finance"],
        category: "finance"
      }
    ]
  },
  {
    category: "productivity",
    keywords: ["task", "productivity", "time", "workflow", "efficiency", "management", "organize", "schedule", "todo", "project", "team", "collaboration", "work", "automation"],
    ideas: [
      {
        id: "prod-1",
        title: "FocusFlow",
        problem: "Remote workers struggle with distractions and maintaining consistent productivity",
        solution: "A focus management app that tracks work patterns, identifies peak productivity hours, and schedules deep work sessions accordingly",
        techStack: ["React", "Pattern Analysis", "Notifications", "LocalStorage"],
        difficulty: "Medium",
        keywords: ["focus", "productivity", "time", "patterns", "work", "concentration"],
        category: "productivity"
      },
      {
        id: "prod-2",
        title: "TaskPrioritizer",
        problem: "People struggle to prioritize tasks effectively leading to missed deadlines and stress",
        solution: "An intelligent task manager that uses weighted scoring to prioritize tasks based on urgency, importance, effort, and dependencies",
        techStack: ["React", "Priority Algorithms", "Drag-and-Drop", "Supabase"],
        difficulty: "Easy",
        keywords: ["tasks", "priority", "management", "deadlines", "planning", "organize"],
        category: "productivity"
      },
      {
        id: "prod-3",
        title: "MeetingMinimizer",
        problem: "Excessive meetings reduce productive work time and employee satisfaction",
        solution: "A meeting analyzer that evaluates meeting necessity, suggests async alternatives, and tracks meeting ROI using NLP on agendas",
        techStack: ["React", "Text Analysis", "Calendar APIs", "Analytics"],
        difficulty: "Medium",
        keywords: ["meetings", "time", "efficiency", "async", "productivity", "analysis"],
        category: "productivity"
      }
    ]
  },
  {
    category: "social",
    keywords: ["community", "social", "connect", "network", "people", "communication", "sharing", "friends", "events", "local", "neighborhood", "volunteer", "charity", "help"],
    ideas: [
      {
        id: "soc-1",
        title: "NeighborNet",
        problem: "Urban communities lack connection, leading to isolation and missed opportunities for mutual help",
        solution: "A hyperlocal community platform that matches neighbors for skill sharing, item lending, and local events using interest clustering",
        techStack: ["React", "Geolocation", "Clustering", "Real-time Chat"],
        difficulty: "Medium",
        keywords: ["community", "neighbors", "local", "sharing", "connection", "help"],
        category: "social"
      },
      {
        id: "soc-2",
        title: "VolunteerMatch",
        problem: "Volunteers struggle to find opportunities that match their skills and availability",
        solution: "A volunteer matching platform that uses skill embeddings to connect volunteers with organizations needing their specific expertise",
        techStack: ["React", "Supabase", "Skill Matching", "Calendar Integration"],
        difficulty: "Medium",
        keywords: ["volunteer", "matching", "skills", "charity", "help", "community"],
        category: "social"
      },
      {
        id: "soc-3",
        title: "EventBuddy",
        problem: "People want to attend events but don't have companions with similar interests",
        solution: "An event companion finder that matches attendees based on interest similarity and social compatibility scores",
        techStack: ["React", "Similarity Matching", "Event APIs", "Chat"],
        difficulty: "Easy",
        keywords: ["events", "companion", "matching", "social", "interests", "friends"],
        category: "social"
      }
    ]
  },
  {
    category: "accessibility",
    keywords: ["accessibility", "disability", "inclusive", "assistive", "blind", "deaf", "mobility", "accessible", "barrier", "support", "aid", "universal", "design"],
    ideas: [
      {
        id: "acc-1",
        title: "AccessMap",
        problem: "People with mobility challenges lack reliable information about venue accessibility",
        solution: "A crowdsourced accessibility mapping platform that rates venues on specific accessibility features with verified community reviews",
        techStack: ["React", "Maps API", "Supabase", "Community Verification"],
        difficulty: "Medium",
        keywords: ["accessibility", "mobility", "maps", "venues", "wheelchair", "inclusive"],
        category: "accessibility"
      },
      {
        id: "acc-2",
        title: "SignBridge",
        problem: "Communication barriers exist between deaf and hearing individuals in everyday situations",
        solution: "A real-time sign language to text converter using on-device gesture recognition and NLP for contextual understanding",
        techStack: ["React", "MediaPipe", "TensorFlow.js", "Text-to-Speech"],
        difficulty: "Hard",
        keywords: ["sign language", "deaf", "communication", "translation", "accessibility", "gesture"],
        category: "accessibility"
      },
      {
        id: "acc-3",
        title: "ReadEasy",
        problem: "People with dyslexia struggle to read standard text formats on websites and documents",
        solution: "A browser extension that reformats text using dyslexia-friendly fonts, spacing, and color schemes with personalized settings",
        techStack: ["React", "Browser Extension", "Text Processing", "Accessibility APIs"],
        difficulty: "Easy",
        keywords: ["dyslexia", "reading", "accessibility", "text", "formatting", "inclusive"],
        category: "accessibility"
      }
    ]
  },
  {
    category: "food",
    keywords: ["food", "recipe", "cooking", "meal", "nutrition", "diet", "restaurant", "delivery", "ingredients", "kitchen", "grocery", "eating", "health food", "cuisine"],
    ideas: [
      {
        id: "food-1",
        title: "PantryChef",
        problem: "People waste food because they don't know what to cook with available ingredients",
        solution: "A recipe recommender that matches available ingredients to recipes using ingredient similarity and substitution algorithms",
        techStack: ["React", "Recipe API", "Similarity Matching", "LocalStorage"],
        difficulty: "Easy",
        keywords: ["recipe", "ingredients", "cooking", "food", "waste", "matching"],
        category: "food"
      },
      {
        id: "food-2",
        title: "NutriBalance",
        problem: "People struggle to maintain balanced nutrition without tedious calorie counting",
        solution: "A visual nutrition tracker that uses image recognition to estimate nutrients and suggests balance improvements",
        techStack: ["React", "TensorFlow.js", "Nutrition APIs", "Charts"],
        difficulty: "Hard",
        keywords: ["nutrition", "diet", "health", "food", "balance", "tracking"],
        category: "food"
      },
      {
        id: "food-3",
        title: "MealPrepper",
        problem: "Meal planning is time-consuming and often results in repetitive or unbalanced meals",
        solution: "An intelligent meal planner that creates weekly plans based on preferences, nutrition goals, and grocery optimization",
        techStack: ["React", "Optimization Algorithms", "Recipe APIs", "Calendar"],
        difficulty: "Medium",
        keywords: ["meal", "planning", "nutrition", "grocery", "weekly", "optimization"],
        category: "food"
      }
    ]
  }
];

// Flatten all ideas for easy access
export const allIdeas: IdeaEntry[] = hackathonDataset.flatMap(cat => cat.ideas);

// Get all unique keywords from dataset
export const allKeywords: string[] = [...new Set(
  hackathonDataset.flatMap(cat => [...cat.keywords, ...cat.ideas.flatMap(idea => idea.keywords)])
)];

// Category keyword map for quick lookup
export const categoryKeywordMap: Map<string, string[]> = new Map(
  hackathonDataset.map(cat => [cat.category, cat.keywords])
);
