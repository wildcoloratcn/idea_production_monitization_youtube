"use client";

import Image from "next/image";
import { useState } from "react";

interface BookPage {
  paragraph: string;
  imageUrl: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [bookPages, setBookPages] = useState<BookPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState("");

  const generateBook = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    setError("");
    setBookPages([]);
    setCurrentStep("Generating story...");

    try {
      // Step 1: Generate the story first
      const storyResponse = await fetch("/api/generate_story", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          genre: "",
          length: "short", // About 200 words
        }),
      });

      if (!storyResponse.ok) {
        const storyErrorData = await storyResponse.json();
        throw new Error(`Story generation failed: ${storyErrorData.error}`);
      }

      const storyData = await storyResponse.json();
      if (!storyData.success || !storyData.story) {
        throw new Error("Failed to generate story");
      }

      // Step 2: Split story into paragraphs
      const story = storyData.story;
      const paragraphs = story
        .split('\n\n')
        .filter((p: string) => p.trim().length > 0)
        .map((p: string) => p.trim());

      if (paragraphs.length === 0) {
        throw new Error("No paragraphs found in the generated story");
      }

      setCurrentStep(`Generating ${paragraphs.length} images for each paragraph...`);

      // Step 3: Generate images for each paragraph
      const imagePromises = paragraphs.map(async (paragraph: string, index: number) => {
        setCurrentStep(`Generating image ${index + 1} of ${paragraphs.length}...`);
        
        // Create a more descriptive prompt for the image based on the paragraph
        const imagePrompt = `${prompt}, scene: ${paragraph.substring(0, 100)}`;
        
        const imageResponse = await fetch("/api/text2img", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: imagePrompt,
          }),
        });

        if (!imageResponse.ok) {
          console.warn(`Failed to generate image for paragraph ${index + 1}`);
          return {
            paragraph,
            imageUrl: "", // Empty image URL if generation fails
          };
        }

        const imageData = await imageResponse.json();
        return {
          paragraph,
          imageUrl: imageData.success ? imageData.imageUrl : "",
        };
      });

      // Wait for all images to be generated
      const pages = await Promise.all(imagePromises);
      setBookPages(pages);
      setCurrentStep("Book generated successfully!");

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          AI Story Book Generator
        </h1>
        
        {/* Single Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-lg font-medium text-gray-700 mb-3">
                Enter your story idea:
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A magical forest where animals can talk"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-lg"
                disabled={isLoading}
              />
            </div>
            
            <button
              onClick={generateBook}
              disabled={isLoading || !prompt.trim()}
              className="w-full bg-indigo-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Creating Your Story Book..." : "Generate Story Book"}
            </button>
          </div>

          {/* Loading Status */}
          {isLoading && currentStep && (
            <div className="mt-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-3"></div>
                {currentStep}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Story Book Display */}
        {bookPages.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
              Your Story Book
            </h2>
            
            <div className="grid gap-8">
              {bookPages.map((page, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200"
                >
                  <div className="md:flex">
                    {/* Image Side */}
                    <div className="md:w-1/2">
                      {page.imageUrl ? (
                        <img
                          src={page.imageUrl}
                          alt={`Illustration for page ${index + 1}`}
                          className="w-full h-64 md:h-80 object-cover"
                        />
                      ) : (
                        <div className="w-full h-64 md:h-80 bg-gray-200 flex items-center justify-center">
                          <p className="text-gray-500">Image generation failed</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Text Side */}
                    <div className="md:w-1/2 p-8 flex flex-col justify-center">
                      <div className="mb-4">
                        <span className="inline-block bg-indigo-100 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full">
                          Page {index + 1}
                        </span>
                      </div>
                      <p className="text-gray-800 leading-relaxed text-lg">
                        {page.paragraph}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Download/Share Options */}
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  const fullStory = bookPages.map(page => page.paragraph).join('\n\n');
                  navigator.clipboard.writeText(fullStory);
                  alert('Full story copied to clipboard!');
                }}
                className="bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors mr-4"
              >
                Copy Full Story
              </button>
              
              <span className="text-gray-600">
                Generated {bookPages.length} pages
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
