import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, CalendarDays } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import LoanCalculator from '@/components/LoanCalculator';
import EMICalculator from '@/components/EMICalculator';

const Index = () => {
  const [activeCalculator, setActiveCalculator] = useState<'emi' | 'amortization'>('amortization');
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="flex gap-4">
              <Button
                onClick={() => setActiveCalculator('amortization')}
                variant={activeCalculator === 'amortization' ? 'default' : 'outline'}
                className="flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                {t('nav.amortization')}
              </Button>
              <Button
                onClick={() => setActiveCalculator('emi')}
                variant={activeCalculator === 'emi' ? 'default' : 'outline'}
                className="flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                {t('nav.emi')}
              </Button>
            </div>
            <div className="ml-4">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </div>
      {activeCalculator === 'emi' ? <EMICalculator /> : <LoanCalculator />}
    </div>
  );
};

export default Index;
