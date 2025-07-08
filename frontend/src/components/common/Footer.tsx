import Link from 'next/link';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-gray-300 py-8 mt-16 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Column 1: Logo/Brand (Optional) - Using empty div for spacing */}
          {/* If you have a logo component, replace the div */}
          <div>
            {/* <Link href="/">
              <span className="text-lg font-semibold text-white">IntelliMCP</span>
            </Link> */}
          </div>

          {/* Column 2: Company */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:underline">Blog</Link></li>
              <li><Link href="#" className="hover:underline">Careers</Link></li>
              {/* Add more company links */} 
            </ul>
          </div>

          {/* Column 3: Product */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:underline">Roadmap</Link></li>
              <li><Link href="#" className="hover:underline">Status</Link></li>
              <li><Link href="#" className="hover:underline">Changelog</Link></li>
              <li><Link href="#" className="hover:underline">Pricing</Link></li>
              {/* Add more product links */} 
            </ul>
          </div>

          {/* Column 4: Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:underline">Documentation</Link></li>
              <li><Link href="#" className="hover:underline">Support</Link></li>
              <li><Link href="#" className="hover:underline">Integrations</Link></li>
              {/* Add more resource links */} 
            </ul>
          </div>

          {/* Column 5: Legal & Socials */} 
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm mb-4">
              <li><Link href="#" className="hover:underline">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:underline">Terms & Conditions</Link></li>
            </ul>
            <h4 className="font-semibold text-white">Socials</h4>
             <ul className="space-y-2 text-sm">
               <li><Link href="#" className="hover:underline">X / Twitter</Link></li>
               <li><Link href="#" className="hover:underline">LinkedIn</Link></li>
               <li><Link href="#" className="hover:underline">Discord</Link></li>
             </ul>
          </div>
        </div>
        <div className="text-center text-sm text-gray-400 mt-10 border-t border-gray-800 pt-6">
          © {new Date().getFullYear()} IntelliMCP Studio. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer; 