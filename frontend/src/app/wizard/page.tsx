'use client'; // Required for form interactions later

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@clerk/nextjs"; // Import useAuth
import { useState } from "react"; // For loading/error states
import { useRouter } from 'next/navigation'; // To navigate after success

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// Define the form schema using Zod
const wizardFormSchema = z.object({
  mcpName: z.string().min(3, {
    message: "MCP name must be at least 3 characters.",
  }),
  domain: z.string({ required_error: "Please select a domain." }),
  goal: z.string().min(10, { message: "Please provide a brief description (min 10 characters)."}),
  roles: z.string().min(3, { message: "Please list at least one key role."}),
  // Add other fields later: goal, roles, etc.
});

type WizardFormValues = z.infer<typeof wizardFormSchema>;

// Default values for the form
const defaultValues: Partial<WizardFormValues> = {
  mcpName: "",
  goal: "",
  roles: "",
};

// Backend API URL (replace with your actual backend URL if different)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function WizardPage() {
  const { getToken } = useAuth(); // Get Clerk token function
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues,
    mode: "onChange", // Validate on change
  });

  async function onSubmit(data: WizardFormValues) {
    setIsLoading(true);
    setError(null);
    console.log("Submitting form data:", data);

    try {
      const token = await getToken(); // Get auth token from Clerk
      if (!token) {
        setError("Authentication token not available. Please sign in.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/mcp/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const createdMcp = await response.json(); // Get the created MCP object
      console.log("MCP created successfully:", createdMcp);

      // Redirect to the ingestion page for the new MCP
      if (createdMcp && createdMcp.id) {
        router.push(`/mcp/${createdMcp.id}/ingest`);
      } else {
        // Fallback if ID is missing (shouldn't happen ideally)
        setError("MCP created, but failed to get ID for redirection.");
        alert("MCP definition saved, but redirection failed."); 
      }

    } catch (err: any) {
      console.error("Failed to create MCP:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create New MCP</CardTitle>
          <CardDescription>Start by defining the name and domain for your Model Context Protocol.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="mcpName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MCP Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Customer Support Bot Policy" {...field} />
                    </FormControl>
                    <FormDescription>
A descriptive name for your protocol.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a primary domain" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="regulatory_compliance">Regulatory Compliance</SelectItem>
                        <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                        <SelectItem value="legal_contracts">Legal / Contracts</SelectItem>
                        <SelectItem value="trade_classification">Trade Classification</SelectItem>
                        <SelectItem value="customer_support">Customer Support</SelectItem>
                        <SelectItem value="content_moderation">Content Moderation</SelectItem>
                        <SelectItem value="custom">Other (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The primary area this MCP applies to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Goal / Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the main purpose of this MCP. What should the AI assist with?"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A clear description helps the AI generate a relevant protocol.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Roles Involved</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Customer, Support Agent, Compliance Manager" {...field} />
                    </FormControl>
                    <FormDescription>
                      List the main user roles interacting with or affected by the AI system.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save and Continue"}
              </Button>
              {error && <p className="text-sm text-red-600">Error: {error}</p>}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
} 