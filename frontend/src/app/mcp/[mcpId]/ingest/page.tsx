'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileUp, Link as LinkIcon, Terminal, Loader2, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// *** Use Environment Variable for Backend API URL ***
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8080'; // Default remains for local dev if var not set

// Interface for the source response
interface IngestedSource {
    source: string;
}

export default function IngestContextPage() {
    const params = useParams();
    const router = useRouter();
    const mcpId = params.mcpId as string;
    const { getToken, isLoaded } = useAuth();

    // State for ingestion
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState<string>('');
    const [isIngestingFile, setIsIngestingFile] = useState(false);
    const [isIngestingUrl, setIsIngestingUrl] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [ingestMessage, setIngestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // *** NEW State for Ingested Sources ***
    const [ingestedSources, setIngestedSources] = useState<string[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(true);
    const [sourceError, setSourceError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setFile(event.target.files[0]);
            setIngestMessage(null);
        } else {
            setFile(null);
        }
    };

    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.target.value);
        setIngestMessage(null);
    };

    // --- Fetch Ingested Sources --- 
    const fetchIngestedSources = useCallback(async () => {
        if (!mcpId || !isLoaded) return;
        
        setIsLoadingSources(true);
        setSourceError(null);
        console.log(`Fetching sources for MCP ID: ${mcpId}`);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            const response = await fetch(`${API_URL}/ingest/sources/${mcpId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to fetch sources: ${response.statusText}`);
            }

            const data: IngestedSource[] = await response.json();
            setIngestedSources(data.map(item => item.source)); // Extract source strings
            console.log("Fetched sources:", data.map(item => item.source));

        } catch (err: any) {
            console.error("Failed to fetch ingested sources:", err);
            setSourceError(err.message || 'An error occurred while fetching sources.');
        } finally {
            setIsLoadingSources(false);
        }
    }, [mcpId, getToken, isLoaded]);

    // Fetch sources on mount
    useEffect(() => {
        fetchIngestedSources();
    }, [fetchIngestedSources]);

    const handleFileUpload = async () => {
        if (!file || !mcpId) {
            setIngestMessage({ type: 'error', text: 'Please select a file and ensure MCP ID is valid.' });
            return;
        }
        if (!isLoaded) {
             setIngestMessage({ type: 'error', text: 'Authentication not ready yet.' });
             return;
        }
        
        setIsIngestingFile(true);
        setIngestMessage(null);
        setUploadProgress(10);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            const formData = new FormData();
            formData.append('file', file);
            
            setUploadProgress(50); 

            const response = await fetch(`${API_URL}/ingest/upload/file/${mcpId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });
            
            setUploadProgress(100);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `File upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            setIngestMessage({ type: 'success', text: result.message || 'File ingested successfully!' });
            setFile(null);
            const fileInput = document.getElementById('context-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = ''; 
            fetchIngestedSources(); // *** Refresh list after upload ***

        } catch (err: any) {
            console.error("File Upload Error:", err);
            setIngestMessage({ type: 'error', text: err.message || 'An unexpected error occurred during file upload.' });
        } finally {
            setIsIngestingFile(false);
            setUploadProgress(0);
        }
    };

    const handleUrlSubmit = async () => {
        if (!url || !mcpId || !/^https?:\/\//.test(url)) {
            setIngestMessage({ type: 'error', text: 'Please enter a valid URL (starting with http:// or https://) and ensure MCP ID is valid.' });
            return;
        }
         if (!isLoaded) {
             setIngestMessage({ type: 'error', text: 'Authentication not ready yet.' });
             return;
        }

        setIsIngestingUrl(true);
        setIngestMessage(null);
        setUploadProgress(10);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            
            setUploadProgress(50);

            const payload = { url: url, mcp_id: parseInt(mcpId) };

            const response = await fetch(`${API_URL}/ingest/upload/url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            
            setUploadProgress(100);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `URL ingestion failed: ${response.statusText}`);
            }

            const result = await response.json();
            setIngestMessage({ type: 'success', text: result.message || 'URL ingested successfully!' });
            setUrl('');
            fetchIngestedSources(); // *** Refresh list after submit ***

        } catch (err: any) {
            console.error("URL Ingestion Error:", err);
            setIngestMessage({ type: 'error', text: err.message || 'An unexpected error occurred during URL ingestion.' });
        } finally {
            setIsIngestingUrl(false);
            setUploadProgress(0);
        }
    };

    return (
        <main className="container mx-auto p-4 md:p-8">
             <h1 className="text-3xl font-bold mb-6">Ingest Context for MCP <span className='font-mono px-1 rounded text-primary'>#{mcpId}</span></h1>
             <Card>
                <CardHeader>
                    <CardTitle>Add Context Sources</CardTitle>
                    <CardDescription>
                        Upload documents (PDF, DOCX, TXT) or add URLs. This context will be used when generating the MCP definition.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* File Upload Section */} 
                    <div className="border p-4 rounded-md space-y-3">
                        <Label htmlFor='context-file-input' className="text-base font-semibold block">Upload File</Label>
                        <p className="text-sm text-muted-foreground">Select PDF, DOCX, or TXT files.</p>
                        <div className="flex items-center space-x-2">
                            <Input 
                                id="context-file-input"
                                type="file" 
                                onChange={handleFileChange} 
                                accept=".pdf,.docx,.txt" 
                                disabled={isIngestingFile || isIngestingUrl} 
                                className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                             <Button onClick={handleFileUpload} disabled={isIngestingFile || isIngestingUrl || !file}>
                                 {isIngestingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileUp className="mr-2 h-4 w-4" />} 
                                 Upload File
                             </Button>
                        </div>
                        {file && !(isIngestingFile || isIngestingUrl) && <p className="text-xs text-muted-foreground pt-1">Selected: {file.name}</p>}
                    </div>
                    {/* URL Upload Section */} 
                     <div className="border p-4 rounded-md space-y-3">
                        <Label htmlFor='context-url-input' className="text-base font-semibold block">Add URL</Label>
                        <p className="text-sm text-muted-foreground">Enter a web page URL to scrape for context.</p>
                        <div className="flex space-x-2">
                             <Input 
                                id="context-url-input"
                                type="url" 
                                placeholder="https://example.com/page"
                                value={url} 
                                onChange={handleUrlChange} 
                                disabled={isIngestingFile || isIngestingUrl} 
                                className="flex-grow"
                              />
                             <Button onClick={handleUrlSubmit} disabled={isIngestingFile || isIngestingUrl || !url}>
                                 {isIngestingUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LinkIcon className="mr-2 h-4 w-4" /> }
                                 Add URL
                             </Button>
                        </div>
                    </div>

                     {/* Progress Bar */} 
                    {(isIngestingFile || isIngestingUrl) && <Progress value={uploadProgress} className="w-full mt-2 h-2" />}

                    {/* Status Messages */} 
                    {ingestMessage && (
                        <Alert variant={ingestMessage.type === 'error' ? 'destructive' : 'default'} className="mt-4">
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>{ingestMessage.type === 'error' ? 'Ingestion Error' : 'Ingestion Success'}</AlertTitle>
                            <AlertDescription>{ingestMessage.text}</AlertDescription>
                        </Alert>
                    )}
                    
                    {/* Placeholder for listing sources - NOW IMPLEMENTED */}
                    <div className="border p-4 rounded-md bg-muted/30 mt-6">
                        <h4 className="font-semibold mb-2 flex items-center"><List className="h-4 w-4 mr-2"/> Ingested Sources</h4>
                        {/* Loading State */} 
                        {isLoadingSources && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading sources...
                             </div>
                        )}
                        {/* Error State */} 
                        {sourceError && (
                            <Alert variant="destructive" className="mt-2">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Error Loading Sources</AlertTitle>
                                <AlertDescription>{sourceError}</AlertDescription>
                            </Alert>
                        )}
                        {/* Content Display */} 
                        {!isLoadingSources && !sourceError && (
                            ingestedSources.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1 text-sm max-h-48 overflow-y-auto py-1"> {/* Added scroll */} 
                                    {ingestedSources.map((source, index) => (
                                        // Use full URL/filename as key if unique, otherwise index
                                        <li key={`${source}-${index}`} className="truncate text-muted-foreground" title={source}>
                                            {source}
                                            {/* TODO: Add a delete button per source? */}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground itallic">No context sources have been ingested for this MCP yet.</p>
                            )
                        )}
                    </div>

                    {/* Navigation */} 
                    <div className="text-center pt-6 border-t mt-6">
                        <Button 
                            onClick={() => router.push(`/mcp/${mcpId}/edit`)} 
                            disabled={isIngestingFile || isIngestingUrl} 
                            size="lg"
                        >
                             Proceed to Edit MCP Definition
                         </Button>
                     </div>
                 </CardContent>
            </Card>
        </main>
    );
} 