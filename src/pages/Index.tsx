
import React, { useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeatureSection from "@/components/FeatureSection";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui-extensions/Button";

const Index = () => {
  // Function to handle smooth scrolling for image loading
  useEffect(() => {
    const lazyLoadImages = () => {
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      
      if ('loading' in HTMLImageElement.prototype) {
        // Browser supports the loading attribute
        lazyImages.forEach(img => {
          if (img instanceof HTMLImageElement) {
            img.src = img.dataset.src || '';
          }
        });
      } else {
        // Fallback for browsers that don't support the loading attribute
        const lazyImageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.target instanceof HTMLImageElement) {
              const lazyImage = entry.target;
              lazyImage.src = lazyImage.dataset.src || '';
              lazyImage.classList.remove('lazy');
              lazyImageObserver.unobserve(lazyImage);
            }
          });
        });
        
        lazyImages.forEach(img => lazyImageObserver.observe(img));
      }
    };
    
    // Call on load and anytime the DOM might change
    lazyLoadImages();
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1">
        <Hero />
        <FeatureSection />
        
        {/* Product Showcase Section */}
        <section id="products" className="py-24">
          <div className="section-container">
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-4">
                Products
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Crafted with care
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our products are designed with attention to every detail, creating experiences
                that are both beautiful and functional.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <span className="text-sm text-primary font-medium mb-2 block">Premium Materials</span>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Thoughtfully designed, meticulously crafted</h3>
                <p className="text-muted-foreground mb-6">
                  Every product we create is the result of careful consideration and precise execution.
                  We believe that good design is as little design as possible, focusing on the essential
                  aspects while eliminating everything unnecessary.
                </p>
                <ul className="space-y-3 mb-8">
                  {["Sustainable materials", "Precision engineering", "Timeless aesthetics", "Intuitive functionality"].map((item) => (
                    <li key={item} className="flex items-start">
                      <svg className="w-5 h-5 text-primary mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="primary" showArrow>Explore Collection</Button>
              </div>
              <div className="order-1 lg:order-2 bg-secondary/30 rounded-2xl p-6 md:p-10 shadow-subtle">
                <div className="aspect-square rounded-xl overflow-hidden bg-white shadow-elevated">
                  <div className="bg-gradient-to-br from-primary/5 to-primary/20 w-full h-full flex items-center justify-center">
                    <div className="text-7xl md:text-8xl text-primary opacity-30">A</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="py-20 bg-gradient-to-b from-background to-secondary/10">
          <div className="section-container">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to experience thoughtful design?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of customers who have elevated their experience through our
                carefully crafted products and designs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="primary" size="lg" showArrow>
                  Get Started
                </Button>
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
