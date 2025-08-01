import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator } from 'lucide-react';

const EMICalculator = () => {
  const { toast } = useToast();
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
        title: "Input Required",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const principalAmount = parseFloat(principal);
    const rate = parseFloat(annualRate) / 100; // Convert percentage to decimal
    const tenure = parseInt(tenureMonths);

    if (principalAmount <= 0 || rate < 0 || tenure <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid positive values",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const calculatedEMI = calculateEMI(principalAmount, rate, tenure);
      setEmi(calculatedEMI);
      toast({
        title: "EMI Calculated",
        description: `Your monthly EMI is ₹${calculatedEMI.toLocaleString()}`,
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Please check your inputs and try again",
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            EMI Calculator
          </h1>
          <p className="text-muted-foreground text-lg">
            Calculate your monthly EMI for any loan amount
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card className="shadow-strong">
            <CardHeader className="bg-gradient-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                Loan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="principal">Loan Amount (₹)</Label>
                  <Input
                    id="principal"
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="Enter loan amount"
                    className="mt-1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="annualRate">Annual Interest Rate (%)</Label>
                  <Input
                    id="annualRate"
                    type="number"
                    step="0.01"
                    value={annualRate}
                    onChange={(e) => setAnnualRate(e.target.value)}
                    placeholder="Enter annual interest rate"
                    className="mt-1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="tenureMonths">Loan Tenure (months)</Label>
                  <Input
                    id="tenureMonths"
                    type="number"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    placeholder="Enter tenure in months"
                    className="mt-1"
                    min="1"
                  />
                </div>
              </div>

              <Button 
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {isCalculating ? 'Calculating...' : 'Calculate EMI'}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {emi !== null && (
            <Card className="shadow-strong">
              <CardHeader className="bg-gradient-secondary text-white">
                <CardTitle>EMI Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center p-6 bg-primary text-primary-foreground rounded-lg">
                    <div className="text-3xl font-bold">
                      ₹{emi.toLocaleString()}
                    </div>
                    <div className="text-sm opacity-90">Monthly EMI</div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        ₹{totalPayment.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Payment</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-destructive">
                        ₹{Math.round(totalInterest).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Interest</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Disclaimer */}
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm">
            This tool is for educational purposes only. Actual loan details may vary from bank to bank.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EMICalculator;