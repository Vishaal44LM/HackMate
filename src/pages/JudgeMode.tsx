import { useState, useEffect } from "react";
import { Brain, Cpu, Database, Layers, FlaskConical, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initializeNLPEngine, getEngineState, generateIdeasWithNLP, classifyThemeWithExplanation, getPreprocessingExplanation } from "@/lib/nlp/inference/nlpEngine";
import { runAllTests, generateEvaluationReport, EvaluationSummary } from "@/lib/nlp/evaluation/testCases";
import { Input } from "@/components/ui/input";
import BackToRoomBanner from "@/components/BackToRoomBanner";

const JudgeMode = () => {
  const [engineState, setEngineState] = useState(getEngineState());
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);
  const [testTheme, setTestTheme] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['problem', 'approach']));

  useEffect(() => {
    const state = initializeNLPEngine();
    setEngineState(state);
  }, []);

  const runEvaluation = () => {
    const results = runAllTests();
    setEvaluation(results);
  };

  const testClassification = () => {
    if (!testTheme.trim()) return;
    const classification = classifyThemeWithExplanation(testTheme);
    const preprocessing = getPreprocessingExplanation(testTheme);
    const generation = generateIdeasWithNLP(testTheme);
    setTestResult({ classification, preprocessing, generation });
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string; title: string; icon: any }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-semibold">{title}</span>
      </div>
      {expandedSections.has(id) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <BackToRoomBanner />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Technical Deep Dive</span>
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Judge Mode: AI Explainability
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understand exactly how our custom NLP system works—no black boxes, complete transparency
            </p>
          </div>

          {/* Engine Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                NLP Engine Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{engineState.vocabularySize}</div>
                  <div className="text-sm text-muted-foreground">Vocabulary Terms</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{engineState.documentCount}</div>
                  <div className="text-sm text-muted-foreground">Training Documents</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{engineState.categoryCount}</div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{engineState.ideaCount}</div>
                  <div className="text-sm text-muted-foreground">Curated Ideas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
              <TabsTrigger value="demo">Live Demo</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-4">
                <SectionHeader id="problem" title="The Problem Being Solved" icon={Database} />
                {expandedSections.has('problem') && (
                  <Card>
                    <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
                      <p><strong>Problem:</strong> Hackathon participants struggle to generate relevant, innovative project ideas quickly. Traditional solutions either require expensive API calls to large language models or provide generic, unhelpful suggestions.</p>
                      <p><strong>Our Solution:</strong> A custom NLP system that runs entirely in the browser, using mathematical algorithms (TF-IDF, cosine similarity, centroid classification) to match user themes to a curated dataset of hackathon ideas.</p>
                    </CardContent>
                  </Card>
                )}

                <SectionHeader id="approach" title="Why This AI Approach is Novel" icon={Brain} />
                {expandedSections.has('approach') && (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold text-destructive mb-2">❌ Typical API Wrapper</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Sends prompt to GPT/Claude</li>
                            <li>• No control over reasoning</li>
                            <li>• Expensive per-request costs</li>
                            <li>• Black-box responses</li>
                            <li>• Requires internet connection</li>
                          </ul>
                        </div>
                        <div className="p-4 border border-primary rounded-lg">
                          <h4 className="font-semibold text-primary mb-2">✅ Our Custom NLP</h4>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Runs 100% client-side</li>
                            <li>• Every decision explainable</li>
                            <li>• Zero API costs</li>
                            <li>• Transparent similarity scores</li>
                            <li>• Works offline</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <SectionHeader id="trained" title="What is Trained vs Inferred" icon={Layers} />
                {expandedSections.has('trained') && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" /> Pre-computed (Training Phase)
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• <strong>Vocabulary:</strong> {engineState.vocabularySize} unique terms extracted from curated dataset</li>
                            <li>• <strong>IDF Values:</strong> Importance weights for each term based on document frequency</li>
                            <li>• <strong>Category Centroids:</strong> Average TF-IDF vectors representing each category</li>
                            <li>• <strong>Idea Embeddings:</strong> Vector representations of all {engineState.ideaCount} template ideas</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-secondary" /> Computed at Runtime (Inference)
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• <strong>Query Vectorization:</strong> User's theme converted to TF-IDF vector</li>
                            <li>• <strong>Similarity Calculation:</strong> Cosine similarity to all ideas and centroids</li>
                            <li>• <strong>Classification:</strong> Nearest centroid determines category</li>
                            <li>• <strong>Ranking:</strong> Ideas sorted by similarity score</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="architecture" className="space-y-4">
              <Card>
                <CardHeader><CardTitle>System Architecture</CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────────┐
│                          UI LAYER                                    │
│  JudgeMode.tsx | IdeaGenerator.tsx | Other Pages                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                       INFERENCE LAYER                                │
│  src/lib/nlp/inference/nlpEngine.ts                                 │
│  • initializeNLPEngine()  • generateIdeasWithNLP()                  │
│  • classifyThemeWithExplanation()  • calculateSimilarity()          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                         MODEL LAYER                                  │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐       │
│  │ TF-IDF       │  │ Similarity      │  │ Classifier       │       │
│  │ Vectorizer   │  │ Engine          │  │ (Centroid-based) │       │
│  └──────────────┘  └─────────────────┘  └──────────────────┘       │
│  src/lib/nlp/model/                                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    PREPROCESSING LAYER                               │
│  src/lib/nlp/preprocessing/textPreprocessor.ts                      │
│  • tokenize()  • removeStopwords()  • stem()  • preprocess()        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  src/lib/nlp/data/hackathonDataset.ts                               │
│  • ${engineState.ideaCount} curated ideas across ${engineState.categoryCount} categories                        │
│  • Keywords, tech stacks, difficulty levels                         │
└─────────────────────────────────────────────────────────────────────┘`}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Mathematical Foundations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">TF-IDF (Term Frequency-Inverse Document Frequency)</h4>
                    <code className="text-sm">TF-IDF(t,d,D) = TF(t,d) × IDF(t,D)</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      Where TF(t,d) = count(t in d) / |d| and IDF(t,D) = log((|D|+1)/(df(t)+1))+1
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Cosine Similarity</h4>
                    <code className="text-sm">cos(A,B) = (A·B) / (||A|| × ||B||)</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      Measures angle between vectors. 1 = identical, 0 = orthogonal, -1 = opposite
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="demo" className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Test the NLP System</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={testTheme}
                      onChange={(e) => setTestTheme(e.target.value)}
                      placeholder="Enter a hackathon theme to test..."
                      className="flex-1"
                    />
                    <Button onClick={testClassification}>Analyze</Button>
                  </div>
                  {testResult && (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Preprocessing Steps</h4>
                        <p className="text-sm"><strong>Original:</strong> {testResult.preprocessing.original}</p>
                        <p className="text-sm"><strong>Tokens:</strong> [{testResult.preprocessing.tokenized.join(', ')}]</p>
                        <p className="text-sm"><strong>After Stopwords:</strong> [{testResult.preprocessing.afterStopwords.join(', ')}]</p>
                        <p className="text-sm"><strong>After Stemming:</strong> [{testResult.preprocessing.afterStemming.join(', ')}]</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Classification Result</h4>
                        <p className="text-sm"><strong>Category:</strong> {testResult.classification.category}</p>
                        <p className="text-sm"><strong>Confidence:</strong> {(testResult.classification.confidence * 100).toFixed(1)}%</p>
                        <pre className="text-xs mt-2 whitespace-pre-wrap">{testResult.classification.explanation}</pre>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Top Matched Ideas</h4>
                        {testResult.generation.ideas.slice(0, 3).map((idea: any, i: number) => (
                          <div key={i} className="mb-2 p-2 bg-background rounded">
                            <p className="font-medium">{idea.title}</p>
                            <p className="text-sm text-muted-foreground">Confidence: {(idea.confidence * 100).toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evaluation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Evaluation Suite</span>
                    <Button onClick={runEvaluation} variant="outline">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Run Tests
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {evaluation ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">{(evaluation.categoryAccuracy * 100).toFixed(0)}%</div>
                          <div className="text-sm text-muted-foreground">Accuracy</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-green-500">{evaluation.passedTests}</div>
                          <div className="text-sm text-muted-foreground">Passed</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-red-500">{evaluation.failedTests}</div>
                          <div className="text-sm text-muted-foreground">Failed</div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-primary">{(evaluation.averageConfidence * 100).toFixed(0)}%</div>
                          <div className="text-sm text-muted-foreground">Avg Confidence</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {evaluation.results.map((result) => (
                          <div key={result.testCase.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            {result.categoryCorrect ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{result.testCase.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Expected: {result.testCase.expectedCategory} | Got: {result.actualCategory} | Confidence: {(result.confidence * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Click "Run Tests" to evaluate the NLP system</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default JudgeMode;
