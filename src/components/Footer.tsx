
import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 bg-secondary/20 py-12">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <a href="/" className="text-xl font-medium text-foreground flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">A</span>
              </span>
              <span>Aesthetic</span>
            </a>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Creating beautiful experiences that balance form and function through thoughtful, minimalist design.
            </p>
            <div className="flex space-x-4">
              {["twitter", "instagram", "github", "dribbble"].map((social) => (
                <a 
                  key={social}
                  href={`#${social}`} 
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <span className="sr-only">{social}</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path 
                      fillRule="evenodd" 
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {[
              {
                title: "Product",
                links: ["Features", "Integrations", "Pricing", "Changelog", "Documentation"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers", "Press", "Partners"],
              },
              {
                title: "Resources",
                links: ["Community", "Contact", "Privacy", "Terms", "Support"],
              },
            ].map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a 
                        href={`#${link.toLowerCase()}`} 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© 2023 Aesthetic. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#cookies" className="hover:text-foreground transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
