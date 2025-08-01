import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, CalendarDays } from 'lucide-react';
import LoanCalculator from '@/components/LoanCalculator';
import EMICalculator from '@/components/EMICalculator';

const Index = () => {
  const [activeCalculator, setActiveCalculator] = useState<'emi' | 'amortization'>('emi');

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="flex justify-center gap-4 mb-6">
            <Button
              onClick={() => setActiveCalculator('emi')}
              variant={activeCalculator === 'emi' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              EMI Calculator
            </Button>
            <Button
              onClick={() => setActiveCalculator('amortization')}
              variant={activeCalculator === 'amortization' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <CalendarDays className="w-4 h-4" />
              Amortization Calculator
            </Button>
          </div>
        </div>
      </div>
      {activeCalculator === 'emi' ? <EMICalculator /> : <LoanCalculator />}
    </div>
  );
};

export default Index;
