"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from 'next/link';
import { Paperclip, Figma, Globe, ArrowUp, BotMessageSquare, Library, LayoutDashboard, Calculator, CalendarCheck2, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { getToken } = useAuth();

  const handleChipClick = (chipPrompt: string) => {
    setPrompt(chipPrompt);
  };

  const handleSubmitPrompt = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      // Just get the default session token without specifying a template
      const token = await getToken();
      console.log("Default token obtained");

      if (!token) {
        router.push('/sign-in');
        return;
      }

      // *** Use Environment Variable for Backend API URL ***
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8080'; // Default remains for local dev if var not set
      console.log("Sending request to:", backendUrl);

      try {
        const response = await fetch(`${backendUrl}/prompt/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt: prompt }),
        });

        console.log("Response status:", response.status);
        
        if (response.ok) {
          const result = await response.json();
          const mcpId = result.mcp_id;
          console.log("Basic MCP created successfully with ID:", mcpId);
          router.push(`/mcp/${mcpId}/ingest`);
        } else {
          const errorText = await response.text();
          console.error("Failed to initiate MCP:", response.status, errorText);
          alert(`Error: ${errorText || 'Failed to start MCP creation.'}`);
        }
      } catch (fetchError) {
        console.error("Fetch error details:", fetchError);
        alert("Could not connect to backend server. Please check that it's running.");
      }
    } catch (error) {
      console.error("An error occurred:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 text-center">
      
      <h1 className="text-4xl md:text-5xl font-bold mb-2 flex items-center justify-center">
        <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
          Lets Build Your 
        </span>
        <BotMessageSquare className="inline-block h-10 w-10 text-white mx-2" />
        <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
           MCP
        </span>
      </h1>
      <p className="text-lg md:text-xl text-gray-300 mb-8">
        Idea to MCP in seconds, with your personal AI assistant
      </p>

      <div className="w-full max-w-2xl bg-slate-200 dark:bg-slate-700 p-4 rounded-lg shadow-lg border border-slate-300 dark:border-slate-600 relative min-h-[150px] flex flex-col">
        <Textarea 
          placeholder="Ask IntelliMCP to create a regulatory checker that..." 
          className="flex-grow resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-2 bg-transparent pl-2 pr-20 text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ paddingBottom: '40px' }}
          disabled={isLoading}
        />
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleSubmitPrompt}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" /> 
            ) : (
              <ArrowRight className="h-4 w-4 text-purple-500" />
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-2xl">
         <Button 
           size="sm" 
           className="bg-primary/80 hover:bg-primary text-primary-foreground text-xs px-2"
           onClick={() => handleChipClick("Create an MCP to act as a Legal Document Analyzer that...")}
           disabled={isLoading}
         >
           <Library className="h-3 w-3 mr-1 opacity-80" /> Legal Document Analyzer
         </Button>
         <Button 
           size="sm" 
           className="bg-primary/80 hover:bg-primary text-primary-foreground text-xs px-2"
           onClick={() => handleChipClick("Create an MCP to check documents against a TRM framework...")}
           disabled={isLoading}
          >
           <LayoutDashboard className="h-3 w-3 mr-1 opacity-80" /> TRM Checker
         </Button>
          <Button 
            size="sm" 
            className="bg-primary/80 hover:bg-primary text-primary-foreground text-xs px-2"
            onClick={() => handleChipClick("Create an MCP to classify products using HS Codes based on descriptions...")}
            disabled={isLoading}
           >
           <Calculator className="h-3 w-3 mr-1 opacity-80" /> HS Code Classifier
         </Button>
         <Button 
           size="sm" 
           className="bg-primary/80 hover:bg-primary text-primary-foreground text-xs px-2"
           onClick={() => handleChipClick("Create an MCP to audit system configurations for compliance standards...")}
           disabled={isLoading}
          >
           <CalendarCheck2 className="h-3 w-3 mr-1 opacity-80" /> Compliance Auditor
         </Button>
      </div>
    </div>
  );
}
