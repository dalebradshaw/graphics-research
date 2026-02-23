/**
 * AI Summarizer - AI-powered transcript summarization using Claude
 */
import { promises as fs } from "fs";
import * as path from "path";
import { Anthropic } from "@anthropic-ai/sdk";
import { TranscriptCache } from "./transcript-caching.js";

export interface AISummarizerConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheEnabled?: boolean;
  cacheDir?: string;
  defaultSummaryLength?: "brief" | "medium" | "detailed";
}

export interface SummaryResult {
  videoId: string;
  summary: string;
  keyPoints: string[];
  technicalConcepts: string[];
  tutorials: Array<{
    title: string;
    timestamp?: string;
    description: string;
  }>;
  structuredNotes: string;
  cached: boolean;
  tokensUsed: number;
}

export interface SummaryError {
  videoId: string;
  error: string;
}

export type SummaryLength = "brief" | "medium" | "detailed";

const DEFAULT_CONFIG: Required<AISummarizerConfig> = {
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  model: "claude-3-5-sonnet-20241022",
  maxTokens: 4096,
  temperature: 0.3,
  cacheEnabled: true,
  cacheDir: ".summary-cache",
  defaultSummaryLength: "medium"
};

export class AISummarizer {
  private config: Required<AISummarizerConfig>;
  private client: Anthropic;
  private cache: TranscriptCache;

  constructor(config: AISummarizerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiKey) {
      throw new Error(
        "Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or pass it in config."
      );
    }

    this.client = new Anthropic({ apiKey: this.config.apiKey });
    this.cache = new TranscriptCache(this.config.cacheDir);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.config.cacheEnabled) {
      await this.cache.initialize();
    }
  }

  /**
   * Generate summary for a transcript
   */
  async summarize(
    videoId: string,
    transcript: string,
    options: {
      length?: SummaryLength;
      title?: string;
      category?: string;
      forceRefresh?: boolean;
    } = {}
  ): Promise<SummaryResult | SummaryError> {
    const length = options.length || this.config.defaultSummaryLength;

    if (!options.forceRefresh && this.config.cacheEnabled) {
      const cached = await this.cache.get<Omit<SummaryResult, "cached">>(`summary-${videoId}-${length}`);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    try {
      const result = await this._generateSummary(videoId, transcript, length, options.title, options.category);

      if (this.config.cacheEnabled) {
        await this.cache.set(`summary-${videoId}-${length}`, { ...result, cached: false });
      }

      return { ...result, cached: false };
    } catch (error) {
      return {
        videoId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async _generateSummary(
    videoId: string,
    transcript: string,
    length: SummaryLength,
    title?: string,
    category?: string
  ): Promise<Omit<SummaryResult, "cached">> {
    const lengthInstructions = {
      brief: "Provide a concise 2-3 sentence summary focusing on the main topic and key takeaway.",
      medium: "Provide a comprehensive summary with main points, key concepts, and practical applications.",
      detailed:
        "Provide an in-depth summary with detailed explanations, step-by-step breakdowns, and comprehensive coverage of all important topics."
    };

    const categoryContext = category
      ? `This video is categorized as "${category}". Focus on extracting information relevant to graphics programming, 3D development, and technical concepts.`
      : "Focus on extracting technical concepts, tutorials, and practical information relevant to graphics programming and 3D development.";

    const prompt = `You are an expert at analyzing video transcripts and extracting structured information for a graphics research knowledge base.

${categoryContext}

Video Title: ${title || "Unknown"}

${lengthInstructions[length]}

Please analyze the following transcript and provide a structured response in JSON format:

TRANSCRIPT:
${transcript.slice(0, 150000)}

Respond with a JSON object containing these fields:
- summary: A comprehensive summary of the video content
- keyPoints: An array of 5-10 key points or takeaways from the video
- technicalConcepts: An array of technical concepts, tools, or technologies mentioned
- tutorials: An array of tutorial segments found (each with title, optional timestamp, and description)
- structuredNotes: Well-formatted notes organized by topic with markdown formatting

JSON Response:`;

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [{ role: "user", content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let parsed: Partial<SummaryResult>;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content.text);
      }
    } catch {
      parsed = this._parseFallback(content.text);
    }

    return {
      videoId,
      summary: parsed.summary || "Summary not available",
      keyPoints: parsed.keyPoints || [],
      technicalConcepts: parsed.technicalConcepts || [],
      tutorials: parsed.tutorials || [],
      structuredNotes: parsed.structuredNotes || content.text,
      tokensUsed: response.usage.output_tokens + response.usage.input_tokens
    };
  }

  private _parseFallback(text: string): Partial<SummaryResult> {
    const lines = text.split("\n").filter((l) => l.trim());
    const keyPoints: string[] = [];
    const technicalConcepts: string[] = [];

    let inKeyPoints = false;
    let inConcepts = false;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("key point") || lower.includes("takeaway")) {
        inKeyPoints = true;
        inConcepts = false;
        continue;
      }
      if (lower.includes("technical concept") || lower.includes("tool") || lower.includes("technology")) {
        inKeyPoints = false;
        inConcepts = true;
        continue;
      }

      const cleanLine = line.replace(/^[-•*]\s*/, "").trim();
      if (cleanLine && inKeyPoints) keyPoints.push(cleanLine);
      if (cleanLine && inConcepts) technicalConcepts.push(cleanLine);
    }

    return {
      summary: lines.slice(0, 3).join(" "),
      keyPoints,
      technicalConcepts,
      structuredNotes: text
    };
  }

  /**
   * Summarize multiple transcripts in batch
   */
  async summarizeBatch(
    items: Array<{
      videoId: string;
      transcript: string;
      title?: string;
      category?: string;
    }>,
    options: {
      length?: SummaryLength;
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
      delayBetweenRequests?: number;
    } = {}
  ): Promise<(SummaryResult | SummaryError)[]> {
    const { concurrency = 2, onProgress, delayBetweenRequests = 2000 } = options;
    const results: (SummaryResult | SummaryError)[] = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map((item) =>
        this.summarize(item.videoId, item.transcript, {
          length: options.length,
          title: item.title,
          category: item.category
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (onProgress) {
        onProgress(Math.min(i + batch.length, items.length), items.length);
      }

      if (i + concurrency < items.length && delayBetweenRequests > 0) {
        await this._sleep(delayBetweenRequests);
      }
    }

    return results;
  }

  /**
   * Clear the summary cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AISummarizer;
