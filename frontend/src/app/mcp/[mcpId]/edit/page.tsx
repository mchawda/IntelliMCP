'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
// Remove Monaco Editor import for now
// import Editor, { Monaco, OnMount } from "@monaco-editor/react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2, Wand2, Pilcrow, StretchHorizontal, Component, PlayCircle, CheckCheck, Download, Sparkles, Info, PlusCircle, Trash2, TestTube2, Repeat, Rows } from "lucide-react"; // Add PlusCircle, Trash2, TestTube2, Repeat, Rows
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Define interface for a single example pair
interface McpExample {
    input: string;
    output: string;
}

// Define the expected structure of MCP JSON definition
interface McpDefinitionJson {
    system_prompt: string;
    input_schema_description: string;
    output_schema_description: string;
    constraints: string[];
    examples: McpExample[]; // Use McpExample interface
}

// *** Interface for Rephrase/Expand Request ***
interface TextFieldContextRequest {
    field_name: string; 
    selected_text: string; // Will contain full field text for now
    full_definition: McpDefinitionJson | null; // Send current definition as context
}

// *** Interface for Generate Component Request ***
interface GenerateComponentRequest {
    field_to_generate: string;
    current_definition: Partial<McpDefinitionJson> | null;
    mcp_goal: string | null;
    mcp_domain: string | null;
}

// Update McpData interface
interface McpData {
    id: number;
    name: string;
    domain: string;
    goal: string;
    roles: string;
    generated_content: string | null;
    constraints: string | null;
    definition_json: McpDefinitionJson | null;
    created_at: string;
    updated_at: string;
    owner_id: number;
}

// *** Add Interface for Test Run Response ***
interface TestRunResponse {
    llm_output: string;
    system_prompt_used: string;
}

// *** Use Environment Variable for Backend API URL ***
const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8080'; // Default remains for local dev if var not set

// Define component types for generation (can be removed later if generation targets specific fields)
// const componentTypes = [ ... ];

// Define fields eligible for text actions
const textActionFields = {
    system_prompt: "System Prompt",
    input_schema_description: "Input Schema Desc",
    output_schema_description: "Output Schema Desc"
};

export default function EditMcpPage() {
    const params = useParams();
    const router = useRouter();
    const { getToken, isLoaded } = useAuth();
    const mcpId = params.mcpId as string;

    // Remove Monaco editor ref
    // const editorRef = useRef<Parameters<OnMount>[0]>(null);

    const [mcpData, setMcpData] = useState<McpData | null>(null);
    // Remove old editor state
    // const [editedContent, setEditedContent] = useState<string>("");
    const [editedLegacyConstraints, setEditedLegacyConstraints] = useState<string>(""); // Keep for separate text area for now
    
    // State for Structured MCP Fields
    const [systemPrompt, setSystemPrompt] = useState<string>("");
    const [inputSchemaDesc, setInputSchemaDesc] = useState<string>("");
    const [outputSchemaDesc, setOutputSchemaDesc] = useState<string>("");
    const [fieldConstraints, setFieldConstraints] = useState<string>("");
    // *** CHANGE: State for Examples is now an array ***
    const [fieldExamples, setFieldExamples] = useState<McpExample[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // AI Assistance State (will need refactoring later)
    // ... (keep existing AI state for now, but features might break)
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    // ** Change suggestions state to store an array of strings **
    const [suggestions, setSuggestions] = useState<string[]>([]); // Array of strings
    const [constraintFeedback, setConstraintFeedback] = useState<{ feedback: string; violations: boolean } | null>(null);
    // const [generatedComponent, setGeneratedComponent] = useState<string | null>(null); // Keep commented if not used yet

    // Initial Generation State
    const [isGeneratingInitial, setIsGeneratingInitial] = useState(false);
    
    // Export state
    const [isExporting, setIsExporting] = useState(false);

    // *** NEW: Test Run State ***
    const [isTesting, setIsTesting] = useState(false);
    const [testInput, setTestInput] = useState<string>("");
    const [testOutput, setTestOutput] = useState<string | null>(null);
    const [testError, setTestError] = useState<string | null>(null);
    const [promptUsedInTest, setPromptUsedInTest] = useState<string | null>(null);
    // *************************

    // --- State and Refactoring Placeholders --- 
    // Need state for the dropdown selection
    const [componentToGenerate, setComponentToGenerate] = useState<string>("system_prompt"); 
    // Need state to display generated component if we don't auto-apply
    // const [generatedComponentResult, setGeneratedComponentResult] = useState<any>(null);

    // *** NEW: State for target field of Rephrase/Expand ***
    const [fieldToAction, setFieldToAction] = useState<keyof typeof textActionFields>("system_prompt");

    // Fetch MCP data function - UPDATED for examples
    const fetchMcpData = useCallback(async () => {
        if (!isLoaded || !mcpId) return;
        
        setIsLoading(true);
        setError(null);
        setSaveMessage(null);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            console.log(`Fetching data for MCP ID: ${mcpId}`);
            const response = await fetch(`${API_URL}/mcp/${mcpId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to fetch MCP data: ${response.statusText}`);
            }

            const data: McpData = await response.json();
            console.log("Fetched MCP data:", data);
            setMcpData(data);
            
            // ** Populate NEW state variables from definition_json **
            if (data.definition_json) {
                setSystemPrompt(data.definition_json.system_prompt || "");
                setInputSchemaDesc(data.definition_json.input_schema_description || "");
                setOutputSchemaDesc(data.definition_json.output_schema_description || "");
                // Join array fields into strings for Textareas
                setFieldConstraints((data.definition_json.constraints || []).join('\n')); 
                setFieldExamples(data.definition_json.examples || []);
            } else {
                 // Fallback or initial state if definition_json is null
                 setSystemPrompt("");
                 setInputSchemaDesc("");
                 setOutputSchemaDesc("");
                 setFieldConstraints("");
                 setFieldExamples([]);
            }
            
            // Keep legacy constraints separate for now
            setEditedLegacyConstraints(data.constraints || "");

        } catch (err: any) {
            console.error("Failed to fetch MCP data:", err);
            setError(err.message || 'An unexpected error occurred while fetching MCP data.');
        } finally {
            setIsLoading(false);
        }
    }, [mcpId, getToken, isLoaded]);

    // Fetch data on component mount
    useEffect(() => {
        fetchMcpData();
    }, [fetchMcpData]);
    
    // Remove old editor change handler
    // const handleEditorChange = ...

    const handleLegacyConstraintsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedLegacyConstraints(event.target.value);
        setSaveMessage(null);
    };

    // *** Handlers for Examples Array ***
    const handleExampleChange = (index: number, field: keyof McpExample, value: string) => {
        const updatedExamples = [...fieldExamples];
        updatedExamples[index] = { ...updatedExamples[index], [field]: value };
        setFieldExamples(updatedExamples);
        setSaveMessage(null); // Clear save message on edit
    };

    const handleAddExample = () => {
        setFieldExamples([...fieldExamples, { input: "", output: "" }]);
        setSaveMessage(null);
    };

    const handleRemoveExample = (index: number) => {
        const updatedExamples = fieldExamples.filter((_, i) => i !== index);
        setFieldExamples(updatedExamples);
        setSaveMessage(null);
    };
    // ***********************************

    // *** Update handleSaveChanges to use new state and save definition_json ***
    const handleSaveChanges = async () => {
        if (!mcpData || !mcpData.definition_json) {
            setError("Cannot save, MCP data or definition not loaded.");
            return;
        }

        setIsSaving(true);
        setError(null);
        setSaveMessage(null);
        console.log("Constructing definition_json from state for MCP ID:", mcpId);

        // Reconstruct the definition object using the array state
        const updatedDefinition: McpDefinitionJson = {
            system_prompt: systemPrompt,
            input_schema_description: inputSchemaDesc,
            output_schema_description: outputSchemaDesc,
            constraints: fieldConstraints.split('\n').filter(line => line.trim() !== ''),
            examples: fieldExamples, // Use the state array directly
        };
        
        const updatePayload = { definition_json: updatedDefinition };
        console.log("Update Payload:", JSON.stringify(updatePayload, null, 2));

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            const response = await fetch(`${API_URL}/mcp/${mcpId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updatePayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to save changes: ${response.statusText}`);
            }

            const updatedMcp: McpData = await response.json();
            console.log("Save successful, updated MCP:", updatedMcp);
            
            // Update local state with the response from backend
            setMcpData(updatedMcp);
            if (updatedMcp.definition_json) {
                setSystemPrompt(updatedMcp.definition_json.system_prompt || "");
                setInputSchemaDesc(updatedMcp.definition_json.input_schema_description || "");
                setOutputSchemaDesc(updatedMcp.definition_json.output_schema_description || "");
                setFieldConstraints((updatedMcp.definition_json.constraints || []).join('\n'));
                setFieldExamples(updatedMcp.definition_json.examples || []);
            }
            
            setSaveMessage("Changes saved successfully! Redirecting to dashboard...");

            // Redirect to dashboard after a short delay
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500); // 1.5 second delay to allow user to read the message

        } catch (err: any) {
            console.error("Failed to save MCP changes:", err);
            setError(err.message || "An unexpected error occurred while saving.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Generate Initial Content Handler - UPDATED ---
    const handleGenerateInitialContent = async () => {
        if (!mcpData || !mcpId) return;
        setIsGeneratingInitial(true);
        setError(null);
        setAiError(null);
        setSaveMessage(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            console.log(`Requesting initial generation for MCP ID: ${mcpId}`);
            const response = await fetch(`${API_URL}/generate/mcp/${mcpId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to generate initial content: ${response.statusText}`);
            }
            const result = await response.json(); // Backend now returns { definition_json: { ... } }
            console.log("Initial JSON definition generated successfully:", result.definition_json);
            
            // ** Update NEW state variables **
            const definition = result.definition_json;
            if (definition) {
                 setSystemPrompt(definition.system_prompt || "");
                 setInputSchemaDesc(definition.input_schema_description || "");
                 setOutputSchemaDesc(definition.output_schema_description || "");
                 setFieldConstraints((definition.constraints || []).join('\n'));
                 setFieldExamples(definition.examples || []);
                 // Update main McpData state as well
                 setMcpData(prevData => prevData ? { ...prevData, definition_json: definition } : null);
                 setSaveMessage("Initial content generated!");
            } else {
                throw new Error("Backend did not return a valid JSON definition.");
            }
        } catch (err: any) {
            console.error("Failed to generate initial MCP content:", err);
            setError(err.message || 'An unexpected error occurred during initial content generation.');
        } finally {
            setIsGeneratingInitial(false);
        }
    };

    // --- AI Assistance Handlers (Refactoring Rephrase/Expand for System Prompt) ---
    const handleSuggestImprovements = async () => {
        if (!mcpData?.definition_json) return;
        
        // Construct payload with structured data
        const payload = {
            system_prompt: systemPrompt,
            input_schema_description: inputSchemaDesc,
            output_schema_description: outputSchemaDesc,
            constraints: fieldConstraints.split('\n').filter(line => line.trim() !== ''),
            examples: fieldExamples, // Send the array
            mcp_goal: mcpData.goal,
            mcp_domain: mcpData.domain
        };

        setIsAiLoading(true);
        setSuggestions([]); // Clear previous suggestions (as array)
        setAiError(null);
        setConstraintFeedback(null); // Clear other AI results
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            const response = await fetch(`${API_URL}/ai/suggest_improvements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload), // Send structured payload
            });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || `Failed to get suggestions: ${response.statusText}`); }
            const result = await response.json();
            // ** Parse the suggestion string into an array **
            const parsedSuggestions = result.suggestions
                .split('\n') // Split by lines
                .map((line: string) => line.trim().replace(/^[-*]\s*/, '')) // Remove leading bullets/hyphens and trim
                .filter((line: string) => line.length > 0); // Remove empty lines
            setSuggestions(parsedSuggestions); // Set state with the array
        } catch (err: any) {
            console.error("AI Suggestion Error:", err);
            setAiError(err.message || "An unexpected error occurred while getting suggestions.");
        } finally {
            setIsAiLoading(false);
        }
    };
    
     const handleCheckConstraints = async () => {
        if (!mcpData?.definition_json) return;
        
        // Get constraints list from state
        const constraintsList = fieldConstraints.split('\n').filter(line => line.trim() !== '');
        if (!constraintsList.length) {
            setAiError("Please define some constraints first in the 'Constraints' field.");
            return;
        }

        // Need to decide what content to check against the constraints.
        // For now, let's check the system_prompt as an example.
        const contentToCheck = systemPrompt;
        if (!contentToCheck) {
             setAiError("System prompt is empty, nothing to check constraints against.");
             return;
        }
        
        const payload = {
            content_to_check: contentToCheck,
            constraints_list: constraintsList
        };

        // Assuming state exists for constraintFeedback & aiError
        setIsAiLoading(true);
        setAiError(null);
        setSuggestions([]); // Clear suggestions when checking constraints
        setConstraintFeedback(null); // Clear previous feedback
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            const response = await fetch(`${API_URL}/ai/check_constraints`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to check constraints: ${response.statusText}`);
            }
            const result = await response.json();
            setConstraintFeedback({ feedback: result.feedback, violations: result.violations_found }); // ** Set state instead of alert **
        } catch (err: any) {
             console.error(`AI Check Constraints Error:`, err);
             setAiError(err.message || `An unexpected error occurred during constraint check.`);
        } finally {
             setIsAiLoading(false);
        }
    };
    
    // Updated generic handler for Rephrase/Expand
    const handleAiTextAction = async (action: 'rephrase' | 'expand') => { 
        // Field to action is now taken from state
        const field = fieldToAction;
        
        let textToProcess: string | undefined;
        let contextDefinition = mcpData?.definition_json;
        
        // Get text from the correct state based on fieldToAction
        switch (field) {
            case 'system_prompt': textToProcess = systemPrompt; break;
            case 'input_schema_description': textToProcess = inputSchemaDesc; break;
            case 'output_schema_description': textToProcess = outputSchemaDesc; break;
            default: 
                 setAiError(`Invalid field selected for ${action}: ${field}`);
                 return;
        }

        if (!textToProcess || !contextDefinition) {
            setAiError(`Cannot ${action}: Missing content or definition for ${field}.`);
            return;
        }

        setIsAiLoading(true);
        setAiError(null);
        setSuggestions([]); 
        setConstraintFeedback(null);

        const payload: TextFieldContextRequest = {
            field_name: field,
            selected_text: textToProcess, // Sending full field content
            full_definition: contextDefinition
        };

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            console.log(`Requesting ${action} for ${field}...`);
            const response = await fetch(`${API_URL}/ai/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to ${action} text: ${response.statusText}`);
            }
            const result = await response.json();
            const newText = result.rephrased_text || result.expanded_text;

            // Update the correct state variable based on fieldToAction
            switch (field) {
                case 'system_prompt': setSystemPrompt(newText); break;
                case 'input_schema_description': setInputSchemaDesc(newText); break;
                case 'output_schema_description': setOutputSchemaDesc(newText); break;
            }

            setSaveMessage(`${action.charAt(0).toUpperCase() + action.slice(1)} successful for ${textActionFields[field]}.`);

        } catch (err: any) {
             console.error(`AI ${action} Error:`, err);
             setAiError(err.message || `An unexpected error occurred during ${action}.`);
        } finally {
             setIsAiLoading(false);
        }
    };

    // Update handlers to call the generic one without field param
    const handleRephrase = () => handleAiTextAction('rephrase');
    const handleExpand = () => handleAiTextAction('expand');

    // --- Refactored Generate Component Handler ---
    const handleGenerateComponent = async () => {
        if (!mcpData) return;

        setIsAiLoading(true);
        setAiError(null);
        setSuggestions([]); 
        setConstraintFeedback(null);
        // setGeneratedComponentResult(null); // Clear previous result if storing separately

        const currentDefinition = {
            system_prompt: systemPrompt,
            input_schema_description: inputSchemaDesc,
            output_schema_description: outputSchemaDesc,
            constraints: fieldConstraints.split('\n').filter(line => line.trim() !== ''),
            examples: fieldExamples,
        };

        const payload: GenerateComponentRequest = {
            field_to_generate: componentToGenerate,
            current_definition: currentDefinition,
            mcp_goal: mcpData.goal,
            mcp_domain: mcpData.domain,
        };

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            
            console.log(`Requesting generation for component: ${componentToGenerate}`);
            const response = await fetch(`${API_URL}/ai/generate_component`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to generate component: ${response.statusText}`);
            }

            const result = await response.json();
            const generatedData = result.generated_data;
            console.log(`Generated data for ${componentToGenerate}:`, generatedData);

            // Update the corresponding state variable
            switch (componentToGenerate) {
                case "system_prompt":
                    setSystemPrompt(generatedData as string);
                    break;
                case "input_schema_description":
                    setInputSchemaDesc(generatedData as string);
                    break;
                case "output_schema_description":
                    setOutputSchemaDesc(generatedData as string);
                    break;
                case "constraints":
                    // Expecting a list of strings
                    setFieldConstraints((generatedData as string[] || []).join('\n'));
                    break;
                case "examples":
                    // Expecting a list of {input, output} objects
                    setFieldExamples(generatedData as McpExample[] || []);
                    break;
                default:
                     console.warn("Generated component type not handled in frontend state update:", componentToGenerate);
            }
            
            setSaveMessage(`Component '${componentToGenerate}' generated successfully.`);
            // Optionally display generated data separately instead of auto-applying
            // setGeneratedComponentResult(generatedData);

        } catch (err: any) {
             console.error(`AI Generate Component Error:`, err);
             setAiError(err.message || `An unexpected error occurred during component generation.`);
        } finally {
             setIsAiLoading(false);
        }
    };

    // *** UPDATED Test Run Handler ***
    const handleTestRun = async () => {
        if (!mcpData || !testInput.trim()) {
            setTestError("Please enter some input to test.");
            return;
        }
        if (!mcpData.definition_json?.system_prompt) {
             setTestError("Cannot run test: System Prompt is missing in the definition.");
             return;
        }

        setIsTesting(true);
        setTestError(null);
        setTestOutput(null);
        setPromptUsedInTest(null);
        setAiError(null); // Clear other errors

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            console.log(`Sending test run request for MCP ID: ${mcpId}`);
            const response = await fetch(`${API_URL}/validate/test_run/${mcpId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ user_input: testInput }),
            });

             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Test run failed: ${response.statusText}`);
            }
            const result: TestRunResponse = await response.json(); // Use backend response model type
            console.log("Test run successful:", result);
            setTestOutput(result.llm_output);
            setPromptUsedInTest(result.system_prompt_used);

        } catch (err: any) {
             console.error(`MCP Test Run Error:`, err);
             setTestError(err.message || `An unexpected error occurred during the test run.`);
        } finally {
             setIsTesting(false);
        }
    };
    // *****************************
    
    const handleExportMarkdown = async () => {
        if (!mcpData) return;

        setIsExporting(true);
        setError(null);
        setSaveMessage(null);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            const response = await fetch(`${API_URL}/mcp/${mcpId}/export/markdown`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to fetch export data: ${response.statusText}`);
            }
            
            const blobData = await response.json();
            const blob = new Blob([blobData.content], { type: blobData.media_type || 'text/markdown' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = blobData.filename || `mcp_${mcpId}_export.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (err: any) {
            console.error(`MCP Export Error:`, err);
            setError(err.message || `An unexpected error occurred during export.`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportJson = async () => {
        if (!mcpData) return;
        
        setIsExporting(true); // Reuse existing loading state
        setError(null);
        setSaveMessage(null);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            console.log(`Fetching JSON export for MCP ID: ${mcpId}`);
            const response = await fetch(`${API_URL}/mcp/${mcpId}/export/json`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                // Try to parse error detail, otherwise use status text
                let errorDetail = `Failed to fetch JSON export: ${response.statusText}`;
                 try {
                     const errorData = await response.json();
                     errorDetail = errorData.detail || errorDetail;
                 } catch (parseError) { /* Ignore if response is not JSON */ }
                 throw new Error(errorDetail);
            }
            
            // Get filename from Content-Disposition header if possible
            const disposition = response.headers.get('Content-Disposition');
            let filename = `mcp_${mcpId}_definition.json`; // Default filename
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"])(.*?)\2|[^;\n]*)/;
                 const matches = filenameRegex.exec(disposition);
                 if (matches != null && matches[3]) { 
                     filename = matches[3];
                 }
             }

            // Get the JSON data as text first to create Blob
            const jsonText = await response.text();
            const blob = new Blob([jsonText], { type: 'application/json' });
            
            // Create download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (err: any) {
             console.error(`MCP JSON Export Error:`, err);
             setError(err.message || `An unexpected error occurred during JSON export.`);
        } finally {
             setIsExporting(false);
        }
    };

    const handleExportYaml = async () => {
        if (!mcpData) return;
        
        setIsExporting(true); 
        setError(null);
        setSaveMessage(null);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            console.log(`Fetching YAML export for MCP ID: ${mcpId}`);
            const response = await fetch(`${API_URL}/mcp/${mcpId}/export/yaml`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                let errorDetail = `Failed to fetch YAML export: ${response.statusText}`;
                 try { 
                     // Try to get detail as text first, as error might not be JSON
                     errorDetail = await response.text() || errorDetail;
                 } catch (textErr) { /* Ignore */ }
                 throw new Error(errorDetail);
            }
            
            const disposition = response.headers.get('Content-Disposition');
            let filename = `mcp_${mcpId}_definition.yaml`;
            if (disposition && disposition.includes('attachment')) {
                const filenameMatch = disposition.match(/filename="?([^;"]+)"?/i);
                if (filenameMatch && filenameMatch[1]) { filename = filenameMatch[1]; }
            }

            const yamlText = await response.text();
            const blob = new Blob([yamlText], { type: 'application/x-yaml' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (err: any) {
             console.error(`MCP YAML Export Error:`, err);
             setError(err.message || `An unexpected error occurred during YAML export.`);
        } finally {
             setIsExporting(false);
        }
    };

    // Remove handleEditorDidMount
    // const handleEditorDidMount = ...

    // --- Render Logic --- 
    if (isLoading) { return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Loading...</span></div>; }
    if (error && !mcpData) { return <div className="p-8"><Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>; }
    if (!mcpData) { return <div className="p-8 text-center">MCP not found.</div>; }

    return (
        <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12">
            <Card className="w-full max-w-5xl">
                <CardHeader className="pb-4">
                     <div className="flex justify-between items-start flex-wrap gap-y-2">
                         <div>
                              <CardTitle>Edit MCP: {mcpData.name} (ID: {mcpData.id})</CardTitle>
                              <CardDescription>Domain: {mcpData.domain}</CardDescription>
                          </div>
                          {/* Container for AI Action Buttons */} 
                          <div className="flex items-center space-x-2 flex-wrap gap-2">
                              {/* Generate Component Dropdown/Button */} 
                              <div className="flex items-center space-x-1">
                                 <Select 
                                     value={componentToGenerate} 
                                     onValueChange={setComponentToGenerate} 
                                     disabled={isAiLoading || isSaving}
                                 >
                                     <SelectTrigger className="h-9 text-xs w-[160px] sm:w-[180px] font-semibold"> {/* Responsive width */} 
                                         <SelectValue placeholder="Select Field" />
                                     </SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="system_prompt">System Prompt</SelectItem>
                                         <SelectItem value="input_schema_description">Input Schema Desc</SelectItem>
                                         <SelectItem value="output_schema_description">Output Schema Desc</SelectItem>
                                         <SelectItem value="constraints">Constraints (List)</SelectItem>
                                         <SelectItem value="examples">Examples (JSON List)</SelectItem>
                                     </SelectContent>
                                 </Select>
                                 <Button 
                                     variant="outline" size="sm" 
                                     onClick={handleGenerateComponent} 
                                     disabled={isAiLoading || isSaving || !mcpData?.definition_json}
                                     title={`Generate ${componentToGenerate.replace(/_/g, ' ')}`}
                                 >
                                     {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                     <span className="ml-1 hidden sm:inline">Generate</span> {/* Hide text on small screens */} 
                                 </Button>
                             </div>
                          </div>
                     </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    
                    {/* Conditional Button for Initial Generation - Use Primary Color? */} 
                     {(!mcpData?.definition_json && !isGeneratingInitial && !isLoading) && (
                         <div className="my-4 text-center p-6 border rounded-lg bg-muted/50">
                             <AlertTitle className="text-lg mb-2">Generate Protocol Definition</AlertTitle>
                             <AlertDescription className="mb-4">
                                 This MCP doesn't have a structured definition yet. Click below to generate the initial components based on the goal:
                                 <br /><em>"{mcpData?.goal}"</em>
                             </AlertDescription>
                             <Button 
                                 onClick={handleGenerateInitialContent}
                                 disabled={isGeneratingInitial}
                                 size="lg"
                                 // variant="primary" // Optional: Make this primary color
                             >
                                 <Sparkles className="mr-2 h-5 w-5" />
                                 Generate Initial Definition
                             </Button>
                         </div>
                     )}
                     {isGeneratingInitial && (
                         <div className="my-4 flex justify-center items-center text-lg">
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              <span>Generating definition...</span>
                          </div>
                     )}

                    {/* Display Structured Fields */} 
                    {mcpData?.definition_json && (
                        <div className="space-y-10"> {/* Increased spacing between major sections */}
                            {/* System Prompt */} 
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                                    <Label htmlFor="system-prompt" className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">System Prompt</Label>
                                </div>
                                <Textarea 
                                    id="system-prompt"
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    rows={10}
                                    className="font-mono text-sm"
                                    placeholder="Define the core instructions and persona for the AI..."
                                    disabled={isSaving || isGeneratingInitial}
                                />
                            </div>

                            {/* Input/Output Schemas */} 
                             <div className="space-y-2">
                                <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">Schema Descriptions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="input-schema" className="text-lg font-semibold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">Input Schema / Description</Label>
                                        <Textarea 
                                            id="input-schema"
                                            value={inputSchemaDesc}
                                            onChange={(e) => setInputSchemaDesc(e.target.value)}
                                            rows={8}
                                            className="font-mono text-sm"
                                            placeholder="Describe the expected input format or provide a JSON schema..."
                                            disabled={isSaving || isGeneratingInitial}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                         <Label htmlFor="output-schema" className="text-lg font-semibold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">Output Schema / Description</Label>
                                         <Textarea 
                                             id="output-schema"
                                             value={outputSchemaDesc}
                                             onChange={(e) => setOutputSchemaDesc(e.target.value)}
                                             rows={8}
                                             className="font-mono text-sm"
                                             placeholder="Describe the desired output format or provide a JSON schema..."
                                             disabled={isSaving || isGeneratingInitial}
                                         />
                                    </div>
                                </div>
                             </div>
                            
                            {/* Add Rephrase/Expand controls centrally */} 
                             <Separator />
                             <div className="flex items-center justify-start space-x-2 pt-4 flex-wrap gap-2">
                                <Label className="font-medium text-sm">AI Text Actions:</Label>
                                <Select 
                                    value={fieldToAction}
                                    onValueChange={(value) => setFieldToAction(value as keyof typeof textActionFields)} 
                                    disabled={isAiLoading || isSaving}
                                >
                                     <SelectTrigger className="h-9 text-xs w-[180px] font-semibold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(textActionFields).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                 <Button 
                                     variant="outline" size="sm" 
                                     onClick={handleRephrase} 
                                     disabled={isAiLoading || isSaving || !mcpData?.definition_json}
                                     title={`Rephrase selected field (${textActionFields[fieldToAction]})`}
                                 >
                                      {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
                                      <span className="ml-1 hidden sm:inline">Rephrase</span>
                                  </Button>
                                   <Button 
                                      variant="outline" size="sm" 
                                      onClick={handleExpand} 
                                      disabled={isAiLoading || isSaving || !mcpData?.definition_json}
                                      title={`Expand selected field (${textActionFields[fieldToAction]})`}
                                  >
                                       {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rows className="h-4 w-4" />}
                                       <span className="ml-1 hidden sm:inline">Expand</span>
                                   </Button>
                             </div>
                             <Separator />

                            {/* Constraints */} 
                            <div className="space-y-2">
                                 <div className="flex justify-between items-center mb-1">
                                     <Label htmlFor="constraints" className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">Constraints</Label>
                                     <Button 
                                         variant="outline" size="sm" 
                                         onClick={handleCheckConstraints} 
                                         disabled={isAiLoading || isSaving || !fieldConstraints.trim()}
                                     >
                                         {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                                         Check Constraints
                                     </Button>
                                 </div>
                                <Textarea 
                                    id="constraints"
                                    value={fieldConstraints}
                                    onChange={(e) => setFieldConstraints(e.target.value)}
                                    rows={6}
                                    className="font-mono text-sm"
                                    placeholder="List constraints, one per line (e.g., MUST NOT reveal PII, SHOULD respond politely)..."
                                    disabled={isSaving || isGeneratingInitial}
                                />
                                <p className="text-xs text-muted-foreground">Enter each constraint on a new line.</p>
                            </div>

                            <Separator /> {/* Add Separator */} 

                            {/* Examples Section */} 
                            <div className="space-y-4">
                                <Label className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">Examples</Label>
                                {fieldExamples.map((example, index) => (
                                    <div key={index} className="border p-4 rounded-md space-y-2 relative bg-muted/20">
                                        <Label htmlFor={`example-input-${index}`} className="text-sm font-medium">Example {index + 1} - Input</Label>
                                        <Textarea 
                                            id={`example-input-${index}`}
                                            value={example.input}
                                            onChange={(e) => handleExampleChange(index, 'input', e.target.value)}
                                            rows={3}
                                            className="font-mono text-xs"
                                            placeholder="User input for this example..."
                                            disabled={isSaving || isGeneratingInitial}
                                        />
                                        <Label htmlFor={`example-output-${index}`} className="text-sm font-medium">Example {index + 1} - Output</Label>
                                         <Textarea 
                                             id={`example-output-${index}`}
                                             value={example.output}
                                             onChange={(e) => handleExampleChange(index, 'output', e.target.value)}
                                             rows={3}
                                             className="font-mono text-xs"
                                             placeholder="Expected AI output for this example..."
                                             disabled={isSaving || isGeneratingInitial}
                                         />
                                         <Button 
                                             variant="ghost" 
                                             size="icon"
                                             className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                                             onClick={() => handleRemoveExample(index)}
                                             disabled={isSaving || isGeneratingInitial}
                                             aria-label="Remove Example"
                                         >
                                             <Trash2 className="h-4 w-4" />
                                         </Button>
                                    </div>
                                ))}
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddExample}
                                    disabled={isSaving || isGeneratingInitial}
                                    className="mt-2"
                                >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Add Example
                                </Button>
                            </div>
                            
                            <Separator /> {/* Add Separator */} 

                            {/* Test Run Section */} 
                            <div className="space-y-4">
                                 <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">Test Run</h3>
                                 <div className="space-y-2">
                                    <Label htmlFor="test-input">Test Input</Label>
                                    <Textarea 
                                        id="test-input"
                                        value={testInput}
                                        onChange={(e) => setTestInput(e.target.value)}
                                        rows={4}
                                        placeholder="Enter user input to test the MCP..."
                                        disabled={isTesting}
                                    />
                                </div>
                                <Button 
                                    onClick={handleTestRun}
                                    disabled={isTesting || !testInput.trim()}
                                >
                                    {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                                     Run Test
                                 </Button>
                                 
                                 {/* Test Output Area */} 
                                 {isTesting && (
                                    <div className="flex items-center text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking...
                                    </div>
                                 )}
                                 {testError && (
                                     <Alert variant="destructive">
                                         <Terminal className="h-4 w-4" />
                                         <AlertTitle>Test Run Error</AlertTitle>
                                         <AlertDescription>{testError}</AlertDescription>
                                     </Alert>
                                 )}
                                 {testOutput && (
                                     <div className="space-y-2 pt-2">
                                         <Label htmlFor="test-output" className="font-medium">Test Output</Label>
                                         <Textarea 
                                             id="test-output"
                                             value={testOutput}
                                             readOnly
                                             rows={6}
                                             className="bg-muted/50 font-mono text-sm"
                                         />
                                         {promptUsedInTest && (
                                            <details className="text-xs">
                                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show System Prompt Used</summary>
                                                <pre className="mt-1 p-2 border rounded-md bg-muted/20 text-muted-foreground whitespace-pre-wrap">{promptUsedInTest}</pre>
                                            </details>
                                         )}
                                     </div>
                                 )}
                            </div>
                        </div>
                    )}

                    {/* AI Results Display Area */}
                    {(suggestions.length > 0 || constraintFeedback) && (
                         <div className="space-y-4 mt-6 border-t pt-6">
                            <h4 className="text-lg font-semibold">AI Assistance Output</h4>
                            {/* Render Suggestions List with Copy Buttons */} 
                            {suggestions.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="font-medium text-muted-foreground">Suggestions:</Label>
                                    <ul className="list-none space-y-2 pl-0">
                                        {suggestions.map((suggestion, index) => (
                                            <li key={index} className="flex items-start justify-between p-3 border rounded-md bg-muted/30">
                                                <span className="flex-1 mr-2 text-sm">{suggestion}</span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => navigator.clipboard.writeText(suggestion).then(() => alert('Suggestion copied!'), () => alert('Failed to copy!'))}
                                                    className="h-7 px-2 text-xs"
                                                >
                                                    Copy
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Render Constraint Feedback Alert */} 
                             {constraintFeedback && (
                                 <Alert variant={constraintFeedback.violations ? 'destructive' : 'default'} className="mt-4">
                                     <CheckCheck className="h-4 w-4" />
                                     <AlertTitle>Constraint Check Feedback</AlertTitle>
                                     <AlertDescription className="whitespace-pre-wrap">{constraintFeedback.feedback}</AlertDescription>
                                 </Alert>
                             )}
                            {/* Add generatedComponent display here later */}
                        </div>
                     )}

                    {/* Error/Success Alerts */} 
                    {(aiError || error) && (
                         <Alert variant="destructive" className="mt-4">
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{aiError || error}</AlertDescription>
                         </Alert>
                     )}
                     {saveMessage && (
                         <Alert variant="default" className="mt-4">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Status</AlertTitle>
                            <AlertDescription>{saveMessage}</AlertDescription>
                         </Alert>
                     )}
                </CardContent>
                 <CardFooter className="flex justify-between items-center flex-wrap gap-4 pt-6 border-t">
                    <Button variant="outline" onClick={() => router.back()} disabled={isSaving || isExporting}>Back</Button>
                    {/* Group action buttons */} 
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                         {/* Add Suggest Improvements Button Here */} 
                         <Button 
                             variant="outline" 
                             size="sm" 
                             onClick={handleSuggestImprovements} 
                             disabled={isAiLoading || isSaving || !mcpData?.definition_json}
                             title="Suggest Improvements"
                         >
                              {isAiLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
                              Suggest
                         </Button>
                        <Button onClick={handleExportYaml} variant="secondary" size="sm" disabled={isSaving || isExporting || !mcpData?.definition_json}>
                             {isExporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                             Export YAML
                         </Button>
                        <Button onClick={handleExportJson} variant="secondary" size="sm" disabled={isSaving || isExporting || !mcpData}>
                             {isExporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                             Export JSON
                         </Button>
                        <Button onClick={handleExportMarkdown} variant="secondary" size="sm" disabled={isSaving || isExporting || !mcpData}>
                            <Download className="mr-1 h-4 w-4" />
                            Export Markdown
                        </Button>
                        {/* Make Save Changes Primary Color */} 
                        <Button 
                            onClick={handleSaveChanges} 
                            variant="default" // Use default (primary) variant
                            size="sm"
                            disabled={isSaving || isExporting || !mcpData?.definition_json}
                         >
                             {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
                         </Button>
                     </div>
                 </CardFooter>
            </Card>
        </main>
    );
} 