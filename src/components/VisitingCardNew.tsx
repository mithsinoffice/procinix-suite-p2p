import { useState } from 'react';
import { Mail, Phone, Linkedin, Globe } from 'lucide-react';
import logoImage from 'figma:asset/eb6183c63677cdc729899e9456f9ae8bda3594fb.png';

export function VisitingCardNew() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="max-w-5xl w-full">
      <div 
        className="perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div 
          className={`relative w-full aspect-[1.75/1] transition-transform duration-700`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
            style={{ 
              backfaceVisibility: 'hidden',
              background: '#0d4d4d'
            }}
          >
            <div className="h-full flex items-center relative">
              {/* Left Section - Logo and Company */}
              <div className="w-2/5 h-full flex flex-col items-center justify-center px-8 md:px-12 bg-transparent">
                <img 
                  src={logoImage} 
                  alt="Procinix Logo" 
                  className="w-full max-w-sm object-contain"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </div>

              {/* Vertical Divider */}
              <div className="w-px h-3/5 bg-cyan-400"></div>

              {/* Right Section - Contact Info */}
              <div className="flex-1 px-8 md:px-16 py-12">
                <div className="space-y-8">
                  {/* Name and Title */}
                  <div>
                    <h3 className="text-cyan-400 text-3xl md:text-4xl mb-3">Mithilesh Tiwari</h3>
                    <p className="text-amber-400 text-lg md:text-xl uppercase tracking-widest">Founder & CEO</p>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Phone className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                      <span className="text-white text-base md:text-lg">+91 7039556556</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Mail className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                      <span className="text-white text-base md:text-lg">mithilesh@procinix.ai</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Linkedin className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                      <span className="text-white text-base md:text-lg">linkedin.com/in/mithileshtiwari</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Globe className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                      <span className="text-white text-base md:text-lg">www.procinix.ai</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gold Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-3 md:h-4 bg-amber-400"></div>
          </div>

          {/* Back Side */}
          <div 
            className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: '#0d4d4d'
            }}
          >
            <div className="h-full flex flex-col justify-center px-12 md:px-16 py-12">
              <h3 className="text-cyan-400 text-2xl md:text-3xl tracking-wider mb-8 uppercase">Our Core Offerings</h3>
              
              <div className="space-y-8">
                <div>
                  <h4 className="text-amber-400 text-xl md:text-2xl mb-3 uppercase tracking-wide">Finance Automation</h4>
                  <p className="text-white text-base md:text-lg">AP / AR  R2R  Data Analytics</p>
                </div>
                
                <div>
                  <h4 className="text-amber-400 text-xl md:text-2xl mb-3 uppercase tracking-wide">Finance Consulting</h4>
                  <p className="text-white text-base md:text-lg">Process Re-engineering  Controls  Compliance</p>
                </div>
                
                <div>
                  <h4 className="text-amber-400 text-xl md:text-2xl mb-3 uppercase tracking-wide">Implementations & Integrations</h4>
                  <p className="text-white text-base md:text-lg">ERP enablement</p>
                </div>
              </div>
            </div>

            {/* Gold Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-3 md:h-4 bg-amber-400"></div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-6 py-3 bg-cyan-400 text-slate-900 rounded-full shadow-lg hover:shadow-xl transition-all hover:bg-cyan-300"
        >
          {isFlipped ? 'View Front' : 'View Back'}
        </button>
      </div>
    </div>
  );
}