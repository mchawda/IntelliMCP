import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/', // Allow access to the homepage
  '/sign-in(.*)', // Allow access to sign-in pages
  '/sign-up(.*)', // Allow access to sign-up pages
  // Add other public API routes or static pages if needed
  // Example: '/api/webhooks(.*)'
]);

// Use the simplified middleware approach
export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    // This is the correct way for newer Clerk versions
    auth.protect();
  }
});

export const config = {
  // Recommended matcher from Clerk docs:
  // Execute middleware for all routes except static files and Next.js internals
  matcher: [ '/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}; 