import { CheckCircle2 } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
}

export function Stepper({ steps, currentStep, completedSteps = [] }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber) || index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-[#00A9B7] border-[#00A9B7] text-white"
                      : isCurrent
                      ? "bg-white border-[#00A9B7] text-[#00A9B7]"
                      : "bg-white border-[#E6EEF2] text-[#64748B]"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{stepNumber}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-sm font-medium whitespace-nowrap ${
                      isCurrent || isCompleted ? "text-[#0A0F14]" : "text-[#64748B]"
                    }`}
                  >
                    {step}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 -mt-10 bg-[#E6EEF2] relative">
                  <div
                    className={`absolute inset-0 bg-[#00A9B7] transition-all ${
                      isCompleted ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
