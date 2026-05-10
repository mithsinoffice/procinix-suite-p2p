import { useState } from 'react';
import { Mail, Phone, Globe, Linkedin } from 'lucide-react';
import logoImage from 'figma:asset/1db74f87cb1b9d674a243eb80872d22c01c04e1e.png';

export function VisitingCard() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="max-w-5xl w-full">
      <div className="mb-8 text-center">
        <h1 className="text-slate-700 mb-2">Digital Visiting Card</h1>
        <p className="text-slate-600">Click the card to flip</p>
      </div>

      <div className="perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <div
          className={`relative w-full aspect-[1.75/1] transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front of card */}
          <div
            className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              background: '#1a2332',
            }}
          >
            <div className="h-full flex items-center gap-12 p-10 md:p-14">
              {/* Left side - Logo */}
              <div className="flex items-center justify-center flex-shrink-0">
                <img
                  src={logoImage}
                  alt="Procinix Logo"
                  className="h-40 md:h-48 w-auto object-contain"
                  style={{ mixBlendMode: 'screen' }}
                />
              </div>

              {/* Right side - Content */}
              <div className="flex-1 flex flex-col justify-between h-full py-4">
                {/* Name and Title */}
                <div>
                  <h3 className="text-white text-3xl md:text-4xl mb-2">Mithilesh Tiwari</h3>
                  <p className="text-white text-lg md:text-xl">Founder & CEO</p>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <Phone className="w-5 h-5" />
                    <span className="text-base md:text-lg">+91 7039556556</span>
                  </div>
                  <div className="flex items-center gap-3 text-cyan-400">
                    <Mail className="w-5 h-5" />
                    <span className="text-base md:text-lg">mithilesh@procinix.ai</span>
                  </div>
                  <div className="flex items-center gap-3 text-cyan-400">
                    <Linkedin className="w-5 h-5" />
                    <span className="text-base md:text-lg">linkedin.com/in/mithileshtiwari</span>
                  </div>
                  <div className="flex items-center gap-3 text-cyan-400">
                    <Globe className="w-5 h-5" />
                    <span className="text-base md:text-lg">www.procinix.ai</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gold strip at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-2 md:h-3 bg-amber-400"></div>
          </div>

          {/* Back of card */}
          <div
            className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-10 md:p-14"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: '#0d4d4d',
            }}
          >
            <div className="h-full flex flex-col justify-center">
              <h3 className="text-amber-400 text-2xl md:text-3xl tracking-wider mb-8">
                OUR CORE OFFERINGS
              </h3>

              <div className="space-y-6">
                {/* Finance Automation */}
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="text-white text-xl md:text-2xl mb-2">Finance Automation</h4>
                      <p className="text-gray-300 text-base md:text-lg">
                        AP / AR R2R Data Analytics
                      </p>
                    </div>
                  </div>
                </div>

                {/* Finance Consulting */}
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="text-white text-xl md:text-2xl mb-2">Finance Consulting</h4>
                      <p className="text-gray-300 text-base md:text-lg">
                        Process Re-engineering Controls Compliance
                      </p>
                    </div>
                  </div>
                </div>

                {/* Implementations & Integrations */}
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="text-white text-xl md:text-2xl mb-2">
                        Implementations & Integrations
                      </h4>
                      <p className="text-gray-300 text-base md:text-lg">ERP enablement</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-6 py-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow text-slate-700"
        >
          {isFlipped ? 'View Front' : 'View Back'}
        </button>
      </div>
    </div>
  );
}
