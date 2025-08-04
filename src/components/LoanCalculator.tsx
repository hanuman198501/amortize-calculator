import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Plus, Trash2, GripVertical, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import LoanCharts from './LoanCharts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AmortizationRow {
  month: number;
  paymentDate: string;
  annualInterestRate: number;
  openingBalance: number;
  monthlyEmi: number;
  extraPayment: number;
  totalPaymentThisMonth: number;
  interestPaid: number;
  principalPaid: number;
  remainingBalance: number;
}

interface InterestRate {
  date: string;
  rate: number;
}

interface ExtraPayment {
  id: string;
  month: string;
  amount: number;
}

// Sortable Extra Payment Item Component
const SortableExtraPaymentItem = ({ payment, index, onUpdate, onRemove }: {
  payment: ExtraPayment;
  index: number;
  onUpdate: (index: number, field: 'month' | 'amount', value: string | number) => void;
  onRemove: (index: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: payment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center bg-card p-2 rounded border">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <Input
        type="month"
        value={payment.month}
        onChange={(e) => onUpdate(index, 'month', e.target.value)}
        className="flex-1"
        placeholder="Select month"
      />
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">₹</span>
        <Input
          type="number"
          value={payment.amount === 0 ? '' : payment.amount}
          onChange={(e) => {
            const value = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
            onUpdate(index, 'amount', value);
          }}
          className="w-24"
          placeholder="0"
          min="0"
        />
      </div>
      <Button
        onClick={() => onRemove(index)}
        size="sm"
        variant="outline"
        className="px-2"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

const LoanCalculator = () => {
  const { toast } = useToast();
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [calculationMode, setCalculationMode] = useState<'fixed-emi' | 'tenure'>('fixed-emi');
  const [fixedEmi, setFixedEmi] = useState<string>('');
  const [tenureMonths, setTenureMonths] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [defaultExtra, setDefaultExtra] = useState<string>('');
  const [interestRates, setInterestRates] = useState<InterestRate[]>([
    { date: '', rate: 0 }
  ]);
  const [extraPayments, setExtraPayments] = useState<ExtraPayment[]>([]);
  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addInterestRate = () => {
    setInterestRates([...interestRates, { date: '', rate: 0 }]);
  };

  const removeInterestRate = (index: number) => {
    if (interestRates.length > 1) {
      setInterestRates(interestRates.filter((_, i) => i !== index));
    }
  };

  const updateInterestRate = (index: number, field: 'date' | 'rate', value: string | number) => {
    const updated = [...interestRates];
    updated[index] = { ...updated[index], [field]: value };
    setInterestRates(updated);
  };

  const addExtraPayment = () => {
    const newId = `extra-${Date.now()}-${Math.random()}`;
    setExtraPayments([...extraPayments, { id: newId, month: '', amount: 0 }]);
  };

  const removeExtraPayment = (index: number) => {
    setExtraPayments(extraPayments.filter((_, i) => i !== index));
  };

  const updateExtraPayment = (index: number, field: 'month' | 'amount', value: string | number) => {
    const updated = [...extraPayments];
    updated[index] = { ...updated[index], [field]: value };
    setExtraPayments(updated);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setExtraPayments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getInterestRate = (currentDate: Date, interestSchedule: InterestRate[]): number => {
    const sortedSchedule = interestSchedule
      .filter(item => item.date && item.rate)
      .map(item => [new Date(item.date), item.rate / 100] as [Date, number])
      .sort((a, b) => a[0].getTime() - b[0].getTime());
    
    for (let i = sortedSchedule.length - 1; i >= 0; i--) {
      if (currentDate >= sortedSchedule[i][0]) {
        return sortedSchedule[i][1];
      }
    }
    return sortedSchedule[0]?.[1] || 0.1;
  };

  const calculateMonthlyEmi = (principal: number, monthlyRate: number, monthsLeft: number): number => {
    if (monthlyRate === 0) {
      return principal / monthsLeft;
    }
    return principal * monthlyRate * Math.pow(1 + monthlyRate, monthsLeft) / (Math.pow(1 + monthlyRate, monthsLeft) - 1);
  };

  const calculateAmortization = () => {
    if (!loanAmount || !startDate) {
      toast({
        title: "Input Required",
        description: "Please fill in loan amount and start date",
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'fixed-emi' && !fixedEmi) {
      toast({
        title: "Input Required",
        description: "Please enter fixed EMI amount for fixed-emi mode",
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'tenure' && !tenureMonths) {
      toast({
        title: "Input Required",
        description: "Please enter tenure in months for tenure mode",
        variant: "destructive",
      });
      return;
    }

    const loanAmountNum = parseFloat(loanAmount);
    const fixedEmiNum = calculationMode === 'fixed-emi' ? parseFloat(fixedEmi) : null;
    const tenureMonthsNum = calculationMode === 'tenure' ? parseInt(tenureMonths) : null;
    const defaultExtraNum = parseFloat(defaultExtra) || 0;

    if (loanAmountNum <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid positive values for loan amount",
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'fixed-emi' && (fixedEmiNum === null || fixedEmiNum <= 0)) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid positive EMI amount",
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'tenure' && (tenureMonthsNum === null || tenureMonthsNum <= 0)) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid tenure in months",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    
    try {
      const schedule: AmortizationRow[] = [];
      let outstanding = loanAmountNum;
      let currentDate = new Date(startDate);
      
      // Convert extra payments to a map
      const extraPaymentMap: { [key: string]: number } = {};
      extraPayments.forEach(payment => {
        if (payment.month && payment.amount >= 0) {
          extraPaymentMap[payment.month] = payment.amount;
        }
      });

      let month = 1;
      while (outstanding > 0 && month <= 1200) { // Safety limit
        const rate = getInterestRate(currentDate, interestRates);
        const mrate = rate / 12;

        // Determine EMI
        let emi: number;
        if (tenureMonthsNum !== null) {
          const monthsLeft = Math.max(tenureMonthsNum - (month - 1), 1);
          emi = calculateMonthlyEmi(outstanding, mrate, monthsLeft);
        } else {
          if (fixedEmiNum === null) {
            throw new Error("Fixed EMI is required for payoff mode");
          }
          emi = fixedEmiNum;
        }

        // Interest & principal from EMI
        const interest = outstanding * mrate;
        const principalFromEmi = Math.max(emi - interest, 0);

        // Scheduled extra, capped
        const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM format
        const scheduledExtra = extraPaymentMap[monthKey] !== undefined ? extraPaymentMap[monthKey] : defaultExtraNum;
        const maxExtra = Math.max(outstanding - principalFromEmi, 0);
        const extra = Math.min(scheduledExtra, maxExtra);

        // Final payment logic in early payoff
        let emiPaid: number;
        let extraPaid: number;
        let totalPrincipal: number;
        let totalPaid: number;
        let endBalance: number;

        if (tenureMonthsNum === null && principalFromEmi + extra >= outstanding) {
          const interestRecalc = outstanding * mrate;
          const principalFromEmiRecalc = Math.max(outstanding - extra, 0);
          emiPaid = Math.round((interestRecalc + principalFromEmiRecalc) * 100) / 100;
          extraPaid = Math.round(extra * 100) / 100;
          totalPrincipal = principalFromEmiRecalc + extraPaid;
          totalPaid = Math.round((interestRecalc + totalPrincipal) * 100) / 100;
          endBalance = 0.0;
        } else {
          emiPaid = Math.round(emi * 100) / 100;
          extraPaid = Math.round(extra * 100) / 100;
          totalPrincipal = principalFromEmi + extra;
          totalPaid = Math.round((emiPaid + extraPaid) * 100) / 100;
          endBalance = outstanding - totalPrincipal;
        }

        // Fix any negative zero
        endBalance = Math.round(endBalance * 100) / 100;
        if (Math.abs(endBalance) < 1e-9) {
          endBalance = 0.0;
        }

        schedule.push({
          month,
          paymentDate: currentDate.toISOString().slice(0, 10),
          annualInterestRate: Math.round(rate * 10000) / 100,
          openingBalance: Math.round(outstanding * 100) / 100,
          monthlyEmi: emiPaid,
          extraPayment: extraPaid,
          totalPaymentThisMonth: totalPaid,
          interestPaid: Math.round(interest * 100) / 100,
          principalPaid: Math.round(totalPrincipal * 100) / 100,
          remainingBalance: endBalance
        });

        outstanding = endBalance;
        if (outstanding <= 0) {
          break;
        }

        // Move to next month
        const year = currentDate.getFullYear();
        const monthNum = currentDate.getMonth();
        const day = currentDate.getDate();
        
        // Get the last day of current month, then add days to get to next month
        const lastDay = new Date(year, monthNum + 1, 0).getDate();
        currentDate = new Date(year, monthNum + 1, day);
        
        month++;
      }

      setSchedule(schedule);
      toast({
        title: "Calculation Complete",
        description: `Generated ${schedule.length} month schedule`,
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

  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const totalExtra = schedule.reduce((sum, row) => sum + row.extraPayment, 0);
  const totalPaid = schedule.reduce((sum, row) => sum + row.totalPaymentThisMonth, 0);
  const totalEmiPayments = schedule.reduce((sum, row) => sum + row.monthlyEmi, 0);

  return (
    <div className="min-h-screen bg-gradient-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Loan Amortization Calculator
          </h1>
          <p className="text-muted-foreground text-lg">
            Calculate your loan payment schedule with variable rates and extra payments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card className="shadow-strong">
            <CardHeader className="bg-gradient-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                Loan Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Calculation Mode */}
              <div>
                <Label className="text-lg font-semibold">Calculation Mode</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    onClick={() => setCalculationMode('fixed-emi')}
                    variant={calculationMode === 'fixed-emi' ? 'default' : 'outline'}
                    className="w-full"
                  >
                    Fixed EMI
                  </Button>
                  <Button
                    onClick={() => setCalculationMode('tenure')}
                    variant={calculationMode === 'tenure' ? 'default' : 'outline'}
                    className="w-full"
                  >
                    Fixed Tenure
                  </Button>
                </div>
              </div>

              {/* Basic Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="loanAmount">Loan Amount (₹)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>The total amount you want to borrow</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="loanAmount"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="mt-1"
                    placeholder="Enter loan amount"
                    min="0"
                  />
                </div>
                {calculationMode === 'fixed-emi' ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="fixedEmi">Fixed EMI (₹)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Fixed monthly payment amount you can afford</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="fixedEmi"
                      type="number"
                      value={fixedEmi}
                      onChange={(e) => setFixedEmi(e.target.value)}
                      className="mt-1"
                      placeholder="Enter fixed EMI"
                      min="0"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="tenureMonths">Tenure (Months)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total number of months to repay the loan</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="tenureMonths"
                      type="number"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="mt-1"
                      placeholder="Enter tenure in months"
                      min="1"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>When you plan to start making payments</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="defaultExtra">Default Extra Payment (₹)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Additional amount you'll pay each month to reduce principal</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="defaultExtra"
                    type="number"
                    value={defaultExtra}
                    onChange={(e) => setDefaultExtra(e.target.value)}
                    className="mt-1"
                    placeholder="Enter default extra payment"
                    min="0"
                  />
                </div>
              </div>

              {/* Interest Rates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-semibold">Interest Rate Schedule</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Define when interest rates change during the loan period</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button
                    onClick={addInterestRate}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rate
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {interestRates.map((rate, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={rate.date}
                        onChange={(e) => updateInterestRate(index, 'date', e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={rate.rate === 0 ? '' : rate.rate}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            updateInterestRate(index, 'rate', value);
                          }}
                          className="w-20"
                          placeholder="0"
                          min="0"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      {interestRates.length > 1 && (
                        <Button
                          onClick={() => removeInterestRate(index)}
                          size="sm"
                          variant="outline"
                          className="px-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Payments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-semibold">Extra Payments by Month</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Schedule additional payments for specific months</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button
                    onClick={addExtraPayment}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={extraPayments.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {extraPayments.map((payment, index) => (
                        <SortableExtraPaymentItem
                          key={payment.id}
                          payment={payment}
                          index={index}
                          onUpdate={updateExtraPayment}
                          onRemove={removeExtraPayment}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              <Button 
                onClick={calculateAmortization}
                disabled={isCalculating}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Amortization Schedule'}
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          {schedule.length > 0 && (
            <Card className="shadow-strong">
              <CardHeader className="bg-gradient-secondary text-white">
                <CardTitle>Loan Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      ₹{parseFloat(loanAmount || '0').toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Principal Amount</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-destructive">
                      ₹{Math.round(totalInterest).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Interest</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-secondary">
                      ₹{Math.round(totalExtra).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Extra Payments</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{Math.round(totalEmiPayments).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">EMI Payments</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      ₹{Math.round(totalPaid).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                  </div>
                  <div className="text-center p-4 bg-primary text-primary-foreground rounded-lg">
                    <div className="text-3xl font-bold">
                      {schedule.length} months
                    </div>
                    <div className="text-sm opacity-90">Loan Duration</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Amortization Schedule Table */}
        {schedule.length > 0 && (
          <Card className="shadow-strong animate-fade-in">
            <CardHeader>
              <CardTitle>Amortization Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">Month</th>
                      <th className="text-left p-2">Payment Date</th>
                      <th className="text-left p-2">Annual Rate %</th>
                      <th className="text-right p-2">Opening Balance</th>
                      <th className="text-right p-2">Monthly EMI</th>
                      <th className="text-right p-2">Extra Payment</th>
                      <th className="text-right p-2">Total Payment</th>
                      <th className="text-right p-2">Interest Paid</th>
                      <th className="text-right p-2">Principal Paid</th>
                      <th className="text-right p-2">Remaining Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.month} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{row.month}</td>
                        <td className="p-2">{row.paymentDate}</td>
                        <td className="p-2">{row.annualInterestRate}%</td>
                        <td className="p-2 text-right">₹{row.openingBalance.toLocaleString()}</td>
                        <td className="p-2 text-right">₹{row.monthlyEmi.toLocaleString()}</td>
                        <td className="p-2 text-right">
                          {row.extraPayment > 0 ? (
                            <span className="bg-secondary/20 text-secondary px-2 py-1 rounded-full text-xs font-medium">
                              ₹{row.extraPayment.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">₹0</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-medium">₹{row.totalPaymentThisMonth.toLocaleString()}</td>
                        <td className="p-2 text-right">
                          <span className="bg-destructive/20 text-destructive px-2 py-1 rounded-full text-xs font-medium">
                            ₹{row.interestPaid.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          <span className="bg-primary/20 text-primary px-2 py-1 rounded-full text-xs font-medium">
                            ₹{row.principalPaid.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-2 text-right">₹{row.remainingBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {schedule.length > 0 && (
          <LoanCharts schedule={schedule} loanAmount={parseFloat(loanAmount || '0')} />
        )}

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

export default LoanCalculator;