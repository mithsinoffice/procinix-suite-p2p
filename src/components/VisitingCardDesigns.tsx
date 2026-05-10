import { useState } from 'react';
import { Mail, Phone, Globe, Linkedin, ChevronLeft, ChevronRight } from 'lucide-react';
import logoImage from 'figma:asset/1db74f87cb1b9d674a243eb80872d22c01c04e1e.png';

export function VisitingCardDesigns() {
  const [currentDesign, setCurrentDesign] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const designs = [
    {
      name: 'Current Design',
      component: <CurrentDesign isFlipped={isFlipped} />,
    },
    {
      name: 'Minimalist White',
      component: <MinimalistDesign isFlipped={isFlipped} />,
    },
    {
      name: 'Gradient Modern',
      component: <GradientDesign isFlipped={isFlipped} />,
    },
    {
      name: 'Dark Premium',
      component: <PremiumDesign isFlipped={isFlipped} />,
    },
    {
      name: 'Split Design',
      component: <SplitDesign isFlipped={isFlipped} />,
    },
  ];

  const nextDesign = () => {
    setCurrentDesign((prev) => (prev + 1) % designs.length);
    setIsFlipped(false);
  };

  const prevDesign = () => {
    setCurrentDesign((prev) => (prev - 1 + designs.length) % designs.length);
    setIsFlipped(false);
  };

  return (
    <div className="max-w-5xl w-full">
      <div className="mb-8 text-center">
        <h1 className="text-slate-700 mb-2">Digital Visiting Card - Design Options</h1>
        <p className="text-slate-600">Explore different layouts and choose your favorite</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={prevDesign}
            className="p-2 bg-white rounded-full shadow hover:shadow-lg transition-shadow"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <span className="text-slate-700 min-w-[200px]">
            {currentDesign + 1} of {designs.length}: {designs[currentDesign].name}
          </span>
          <button
            onClick={nextDesign}
            className="p-2 bg-white rounded-full shadow hover:shadow-lg transition-shadow"
          >
            <ChevronRight className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        {designs[currentDesign].component}
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

// Design 1: Current Design
function CurrentDesign({ isFlipped }: { isFlipped: boolean }) {
  return (
    <div
      className={`relative w-full aspect-[1.75/1] transition-transform duration-700`}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
        style={{
          backfaceVisibility: 'hidden',
          background: '#1a2332',
        }}
      >
        <div className="h-full flex items-center gap-12 p-10 md:p-14">
          <div className="flex items-center justify-center flex-shrink-0">
            <img
              src={logoImage}
              alt="Procinix Logo"
              className="h-40 md:h-48 w-auto object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
          <div className="flex-1 flex flex-col justify-between h-full py-4">
            <div>
              <h3 className="text-white text-3xl md:text-4xl mb-2">Mithilesh Tiwari</h3>
              <p className="text-white text-lg md:text-xl">Founder & CEO</p>
            </div>
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
        <div className="absolute bottom-0 left-0 right-0 h-2 md:h-3 bg-amber-400"></div>
      </div>

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
            <div className="flex items-start gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-white text-xl md:text-2xl mb-2">Finance Automation</h4>
                <p className="text-gray-300 text-base md:text-lg">AP / AR R2R Data Analytics</p>
              </div>
            </div>
            <div className="flex items-start gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="text-white text-xl md:text-2xl mb-2">Finance Consulting</h4>
                <p className="text-gray-300 text-base md:text-lg">
                  Process Re-engineering Controls Compliance
                </p>
              </div>
            </div>
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
  );
}

// Design 2: Minimalist White
function MinimalistDesign({ isFlipped }: { isFlipped: boolean }) {
  return (
    <div
      className={`relative w-full aspect-[1.75/1] transition-transform duration-700`}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden bg-white"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="h-full flex items-center gap-12 p-10 md:p-14">
          <div className="flex items-center justify-center flex-shrink-0 bg-slate-100 p-8 rounded-2xl">
            <img
              src={logoImage}
              alt="Procinix Logo"
              className="h-32 md:h-40 w-auto object-contain"
            />
          </div>
          <div className="flex-1 flex flex-col justify-between h-full py-4">
            <div>
              <h3 className="text-slate-900 text-3xl md:text-4xl mb-2">Mithilesh Tiwari</h3>
              <p className="text-slate-600 text-lg md:text-xl">Founder & CEO</p>
              <div className="mt-3 w-16 h-1 bg-amber-400"></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-700">
                <Phone className="w-5 h-5 text-amber-500" />
                <span className="text-base md:text-lg">+91 7039556556</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Mail className="w-5 h-5 text-amber-500" />
                <span className="text-base md:text-lg">mithilesh@procinix.ai</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Linkedin className="w-5 h-5 text-amber-500" />
                <span className="text-base md:text-lg">linkedin.com/in/mithileshtiwari</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Globe className="w-5 h-5 text-amber-500" />
                <span className="text-base md:text-lg">www.procinix.ai</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-10 md:p-14 bg-slate-900"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}
      >
        <div className="h-full flex flex-col justify-center">
          <h3 className="text-amber-400 text-2xl md:text-3xl mb-8">OUR CORE OFFERINGS</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-white text-xl md:text-2xl mb-2">Finance Automation</h4>
              <p className="text-gray-300 text-base md:text-lg">AP / AR R2R Data Analytics</p>
            </div>
            <div>
              <h4 className="text-white text-xl md:text-2xl mb-2">Finance Consulting</h4>
              <p className="text-gray-300 text-base md:text-lg">
                Process Re-engineering Controls Compliance
              </p>
            </div>
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
  );
}

// Design 3: Gradient Modern
function GradientDesign({ isFlipped }: { isFlipped: boolean }) {
  return (
    <div
      className={`relative w-full aspect-[1.75/1] transition-transform duration-700`}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
        style={{
          backfaceVisibility: 'hidden',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl"></div>

        <div className="h-full flex items-center gap-12 p-10 md:p-14 relative z-10">
          <div className="flex items-center justify-center flex-shrink-0 bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
            <img
              src={logoImage}
              alt="Procinix Logo"
              className="h-32 md:h-40 w-auto object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
          <div className="flex-1 flex flex-col justify-between h-full py-4">
            <div>
              <h3 className="text-white text-3xl md:text-4xl mb-2">Mithilesh Tiwari</h3>
              <p className="text-amber-300 text-lg md:text-xl">Founder & CEO</p>
            </div>
            <div className="space-y-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 text-white">
                <Phone className="w-5 h-5 text-amber-400" />
                <span className="text-base md:text-lg">+91 7039556556</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <Mail className="w-5 h-5 text-amber-400" />
                <span className="text-base md:text-lg">mithilesh@procinix.ai</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <Linkedin className="w-5 h-5 text-amber-400" />
                <span className="text-base md:text-lg">linkedin.com/in/mithileshtiwari</span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <Globe className="w-5 h-5 text-amber-400" />
                <span className="text-base md:text-lg">www.procinix.ai</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-10 md:p-14"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: 'linear-gradient(135deg, #0d4d4d 0%, #115e59 100%)',
        }}
      >
        <div className="h-full flex flex-col justify-center">
          <h3 className="text-amber-400 text-2xl md:text-3xl mb-8">OUR CORE OFFERINGS</h3>
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <h4 className="text-white text-xl md:text-2xl mb-2">Finance Automation</h4>
              <p className="text-gray-200 text-base md:text-lg">AP / AR R2R Data Analytics</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <h4 className="text-white text-xl md:text-2xl mb-2">Finance Consulting</h4>
              <p className="text-gray-200 text-base md:text-lg">
                Process Re-engineering Controls Compliance
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <h4 className="text-white text-xl md:text-2xl mb-2">
                Implementations & Integrations
              </h4>
              <p className="text-gray-200 text-base md:text-lg">ERP enablement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Design 4: Dark Premium
function PremiumDesign({ isFlipped }: { isFlipped: boolean }) {
  return (
    <div
      className={`relative w-full aspect-[1.75/1] transition-transform duration-700`}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden bg-black"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="h-full flex items-center gap-12 p-10 md:p-14 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent to-transparent"></div>

          <div className="flex items-center justify-center flex-shrink-0 relative z-10">
            <img
              src={logoImage}
              alt="Procinix Logo"
              className="h-40 md:h-48 w-auto object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
          <div className="flex-1 flex flex-col justify-between h-full py-4 relative z-10">
            <div>
              <div className="inline-block mb-4">
                <div className="h-px w-12 bg-amber-400 mb-4"></div>
                <h3 className="text-white text-3xl md:text-4xl mb-2 tracking-wide">
                  Mithilesh Tiwari
                </h3>
                <p className="text-amber-400 text-lg md:text-xl uppercase tracking-widest">
                  Founder & CEO
                </p>
              </div>
            </div>
            <div className="space-y-3 border-l-2 border-amber-400 pl-6">
              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="w-4 h-4" />
                <span className="text-base md:text-lg">+91 7039556556</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-4 h-4" />
                <span className="text-base md:text-lg">mithilesh@procinix.ai</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Linkedin className="w-4 h-4" />
                <span className="text-base md:text-lg">linkedin.com/in/mithileshtiwari</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Globe className="w-4 h-4" />
                <span className="text-base md:text-lg">www.procinix.ai</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
      </div>

      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-10 md:p-14 bg-gradient-to-br from-gray-900 to-black"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}
      >
        <div className="h-full flex flex-col justify-center">
          <div className="h-px w-24 bg-amber-400 mb-6"></div>
          <h3 className="text-amber-400 text-2xl md:text-3xl uppercase tracking-widest mb-8">
            Core Offerings
          </h3>
          <div className="space-y-6">
            <div className="border-l-2 border-amber-400/30 pl-6">
              <h4 className="text-white text-xl md:text-2xl mb-2">Finance Automation</h4>
              <p className="text-gray-400 text-base md:text-lg">AP / AR R2R Data Analytics</p>
            </div>
            <div className="border-l-2 border-amber-400/30 pl-6">
              <h4 className="text-white text-xl md:text-2xl mb-2">Finance Consulting</h4>
              <p className="text-gray-400 text-base md:text-lg">
                Process Re-engineering Controls Compliance
              </p>
            </div>
            <div className="border-l-2 border-amber-400/30 pl-6">
              <h4 className="text-white text-xl md:text-2xl mb-2">
                Implementations & Integrations
              </h4>
              <p className="text-gray-400 text-base md:text-lg">ERP enablement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Design 5: Split Design
function SplitDesign({ isFlipped }: { isFlipped: boolean }) {
  return (
    <div
      className={`relative w-full aspect-[1.75/1] transition-transform duration-700`}
      style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}
    >
      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl overflow-hidden"
        style={{ backfaceVisibility: 'hidden' }}
      >
        <div className="h-full flex">
          {/* Left side - Dark with logo */}
          <div className="w-2/5 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
            <img
              src={logoImage}
              alt="Procinix Logo"
              className="h-48 md:h-56 w-auto object-contain"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>

          {/* Right side - White with content */}
          <div className="flex-1 bg-white p-10 md:p-12 flex flex-col justify-between">
            <div>
              <div className="w-16 h-1 bg-amber-400 mb-6"></div>
              <h3 className="text-slate-900 text-3xl md:text-4xl mb-2">Mithilesh Tiwari</h3>
              <p className="text-amber-500 text-lg md:text-xl">Founder & CEO</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 bg-amber-400/20 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-base">+91 7039556556</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 bg-amber-400/20 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-base">mithilesh@procinix.ai</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 bg-amber-400/20 rounded-full flex items-center justify-center">
                  <Linkedin className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-base">linkedin.com/in/mithileshtiwari</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 bg-amber-400/20 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-base">www.procinix.ai</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 backface-hidden rounded-3xl shadow-2xl p-10 md:p-14"
        style={{
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: 'linear-gradient(135deg, #1a2332 0%, #0d4d4d 100%)',
        }}
      >
        <div className="h-full flex flex-col justify-center">
          <div className="w-16 h-1 bg-amber-400 mb-6"></div>
          <h3 className="text-amber-400 text-2xl md:text-3xl mb-8">OUR CORE OFFERINGS</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-1 bg-amber-400 rounded-full"></div>
              <div>
                <h4 className="text-white text-xl md:text-2xl mb-2">Finance Automation</h4>
                <p className="text-gray-300 text-base md:text-lg">AP / AR R2R Data Analytics</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1 bg-amber-400 rounded-full"></div>
              <div>
                <h4 className="text-white text-xl md:text-2xl mb-2">Finance Consulting</h4>
                <p className="text-gray-300 text-base md:text-lg">
                  Process Re-engineering Controls Compliance
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1 bg-amber-400 rounded-full"></div>
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
  );
}
