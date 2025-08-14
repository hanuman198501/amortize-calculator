import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calculator } from 'lucide-react';

const EMICalculator = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [principal, setPrincipal] = useState<string>('');
  const [annualRate, setAnnualRate] = useState<string>('');
  const [tenureMonths, setTenureMonths] = useState<string>('');
  const [emi, setEmi] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
      return principal / tenureMonths;
    }
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi * 100) / 100;
  };

  const handleCalculate = () => {
    if (!principal || !annualRate || !tenureMonths) {
      toast({
        title: t('error.inputRequired'),
        description: t('error.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    const principalAmount = parseFloat(principal);
    const rate = parseFloat(annualRate) / 100; // Convert percentage to decimal
    const tenure = parseInt(tenureMonths);

    if (principalAmount <= 0 || rate < 0 || tenure <= 0) {
      toast({
        title: t('error.invalidInput'),
        description: t('error.positiveValues'),
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const calculatedEMI = calculateEMI(principalAmount, rate, tenure);
      setEmi(calculatedEMI);
      toast({
        title: t('success.emiCalculated'),
        description: `${t('success.yourMonthlyEmi')} ₹${calculatedEMI.toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: t('error.calculationError'),
        description: t('error.checkInputs'),
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const totalPayment = emi && tenureMonths ? emi * parseInt(tenureMonths) : 0;
  const totalInterest = totalPayment && principal ? totalPayment - parseFloat(principal) : 0;

  return (
    <div className="min-h-screen bg-gradient-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {t('emi.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('tooltip.loanAmount')}
          </p>
        </div>

        {/* Centered Input Form */}
        <div className="flex justify-center">
          <Card className="shadow-strong w-full max-w-2xl mx-4 sm:mx-0">
            <CardHeader className="bg-gradient-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                {t('emi.loanDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="principal">{t('loan.amount')}</Label>
                  <Input
                    id="principal"
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder={t('loan.amount')}
                    className="mt-1 text-base"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="annualRate">{t('loan.interestRate')}</Label>
                  <Input
                    id="annualRate"
                    type="number"
                    step="0.01"
                    value={annualRate}
                    onChange={(e) => setAnnualRate(e.target.value)}
                    placeholder={t('loan.interestRate')}
                    className="mt-1 text-base"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="tenureMonths">{t('loan.tenure')}</Label>
                  <Input
                    id="tenureMonths"
                    type="number"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    placeholder={t('loan.tenure')}
                    className="mt-1 text-base"
                    min="1"
                  />
                </div>
              </div>

              <Button 
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full bg-gradient-primary hover:opacity-90 py-3 text-base font-semibold"
              >
                {isCalculating ? t('loan.calculate') : t('loan.calculate')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results - Below the form */}
        {emi !== null && (
          <div className="flex justify-center">
            <Card className="shadow-strong w-full max-w-2xl mx-4 sm:mx-0">
              <CardHeader className="bg-gradient-secondary text-white">
                <CardTitle>{t('emi.breakdown')}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="text-center p-6 bg-primary text-primary-foreground rounded-lg">
                    <div className="text-2xl sm:text-3xl font-bold">
                      ₹{emi.toLocaleString()}
                    </div>
                    <div className="text-sm opacity-90">{t('emi.monthlyEmi')}</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-foreground">
                        ₹{totalPayment.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">{t('emi.totalAmount')}</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-destructive">
                        ₹{Math.round(totalInterest).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">{t('emi.totalInterest')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm">
            {t('ui.educationalPurpose')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EMICalculator;